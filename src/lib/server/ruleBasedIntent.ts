import "server-only";

/**
 * Rule-based intent extraction for trips without free-text notes.
 *
 * Maps structured builder form fields (vibes, pace, group, dietary, mobility)
 * directly to IntentExtractionResult. Covers ~80% of trips where users don't
 * write free-text notes, saving a Gemini API call and 2-4s of latency.
 *
 * Falls back to the Gemini-based extractor when free-text notes are present
 * (those require NLP to parse pinned locations, day constraints, etc.).
 */

import { vibesToCategoryWeights, VIBE_FILTER_MAP } from "@/data/vibeFilterMapping";
import type { VibeId } from "@/data/vibes";
import type { TripBuilderData } from "@/types/trip";
import type {
  IntentExtractionResult,
  PacingHint,
  TimePreference,
} from "@/types/llmConstraints";

/**
 * Returns true if the builder data contains free-text input that needs
 * NLP-level parsing (pinned locations, day constraints, nuanced preferences).
 */
export function requiresLLMExtraction(builderData: TripBuilderData): boolean {
  const notes = builderData.accessibility?.notes?.trim();
  const dietaryOther = builderData.accessibility?.dietaryOther?.trim();
  return !!(notes || dietaryOther);
}

/**
 * Derive pacing hint from structured fields.
 *
 * Logic mirrors the Gemini prompt rules:
 * - "relaxed" pace + kids under 5 -> "very_relaxed"
 * - "fast" pace + solo -> "intense"
 * - Otherwise maps style directly
 */
function derivePacingHint(builderData: TripBuilderData): PacingHint {
  const style = builderData.style ?? "balanced";
  const groupType = builderData.group?.type ?? "solo";
  const childrenAges = builderData.group?.childrenAges ?? [];
  const hasYoungChildren = childrenAges.some((age) => age < 5);

  if (style === "relaxed" && hasYoungChildren) return "very_relaxed";
  if (style === "relaxed") return "relaxed";
  if (style === "fast" && groupType === "solo") return "intense";
  if (style === "fast") return "active";
  return "balanced";
}

/**
 * Derive excluded categories from group composition and accessibility.
 *
 * Conservative rules (matching the Gemini prompt's guidance):
 * - Families with children under 12 -> exclude "bar"
 * - Mobility needs don't exclude categories (handled by scoring penalties)
 */
function deriveExcludedCategories(builderData: TripBuilderData): string[] {
  const excluded: string[] = [];
  const childrenAges = builderData.group?.childrenAges ?? [];
  const groupType = builderData.group?.type;
  const hasMinors = childrenAges.some((age) => age < 12);

  if (groupType === "family" || hasMinors) {
    excluded.push("bar");
  }

  return excluded;
}

/**
 * Derive time preference from selected vibes.
 *
 * - Night-focused vibes (modern_japan) -> night_owl
 * - Morning-focused vibes (temples_tradition, zen_wellness) -> morning_person
 * - Mixed or no strong signal -> no_preference
 */
function deriveTimePreference(vibes: VibeId[]): TimePreference {
  const nightVibes: VibeId[] = ["modern_japan"];
  const morningVibes: VibeId[] = ["temples_tradition", "zen_wellness", "nature_adventure"];

  const hasNight = vibes.some((v) => nightVibes.includes(v));
  const hasMorning = vibes.some((v) => morningVibes.includes(v));

  // If both present, they cancel out
  if (hasNight && !hasMorning) return "night_owl";
  if (hasMorning && !hasNight) return "morning_person";
  return "no_preference";
}

/**
 * Derive preferred tags from selected vibes using VIBE_FILTER_MAP.
 */
function derivePreferredTags(vibes: VibeId[]): string[] {
  const tags = new Set<string>();
  for (const vibeId of vibes) {
    const mapping = VIBE_FILTER_MAP[vibeId];
    if (mapping.tags) {
      for (const tag of mapping.tags) {
        tags.add(tag);
      }
    }
  }
  return tags.size > 0 ? Array.from(tags) : [];
}

/**
 * Extract intent from structured builder fields without calling an LLM.
 *
 * Only handles fields that can be deterministically mapped. Returns the same
 * IntentExtractionResult shape as the Gemini-based extractor.
 *
 * Fields that are always empty in rule-based mode:
 * - pinnedLocations (requires NLP to parse "I want to visit Fushimi Inari")
 * - dayConstraints (requires NLP to parse "birthday dinner on day 3")
 * - additionalInsights (freeform, no structured source)
 */
export function extractIntentFromRules(
  builderData: TripBuilderData,
): IntentExtractionResult {
  const vibes = (builderData.vibes ?? []) as VibeId[];

  return {
    pinnedLocations: [],
    excludedCategories: deriveExcludedCategories(builderData),
    dayConstraints: [],
    pacingHint: derivePacingHint(builderData),
    categoryWeights: vibesToCategoryWeights(vibes),
    preferredTags: derivePreferredTags(vibes),
    timePreference: deriveTimePreference(vibes),
    additionalInsights: [],
  };
}
