import type { Location } from "@/types/location";
import type { LocationScoringCriteria, ScoringResult } from "@/lib/scoring/types";
import { getPhotoTiming, isPhotoOptimalTime } from "@/data/photoSpotTiming";
import { hasGoshuin, isNotableGoshuin } from "@/data/goshuinData";

/**
 * Score photo timing fit — bonus when activity is scheduled at optimal photo time.
 * Range: 0 to +5 points. Only active when photography vibe is selected.
 */
export function scorePhotoFit(
  location: Location,
  criteria: LocationScoringCriteria,
): ScoringResult {
  if (!criteria.hasPhotographyVibe || !criteria.timeSlot) {
    return { score: 0, reasoning: "" };
  }

  const timing = getPhotoTiming(location.id, location.category);
  if (!timing) {
    return { score: 0, reasoning: "" };
  }

  // Map time slot to approximate hour
  const SLOT_TO_HOUR: Record<string, number> = {
    morning: 8,
    afternoon: 15,
    evening: 18,
  };
  const hour = SLOT_TO_HOUR[criteria.timeSlot] ?? 12;

  if (isPhotoOptimalTime(hour, timing.bestTimes)) {
    const tipNote = timing.tip ? ` — ${timing.tip}` : "";
    return {
      score: 5,
      reasoning: `Optimal photo time for ${location.name}${tipNote}`,
    };
  }

  return { score: 0, reasoning: "" };
}

/**
 * Score goshuin (temple stamp) availability — bonus for temples/shrines
 * when collectGoshuin is enabled.
 * Range: 0 to +5 points.
 */
export function scoreGoshuinFit(
  location: Location,
  collectGoshuin?: boolean,
): ScoringResult {
  if (!collectGoshuin) {
    return { score: 0, reasoning: "" };
  }

  const GOSHUIN_CATEGORIES = new Set(["temple", "shrine"]);
  if (!location.category || !GOSHUIN_CATEGORIES.has(location.category)) {
    return { score: 0, reasoning: "" };
  }

  if (isNotableGoshuin(location.id)) {
    return { score: 5, reasoning: "Notable goshuin available" };
  }

  if (hasGoshuin(location.id)) {
    return { score: 3, reasoning: "Goshuin available" };
  }

  return { score: 0, reasoning: "" };
}

/**
 * Score tag overlap between location tags and AI-extracted preferred tags.
 * Range: 0 to +25 points (+5 per matching tag, capped at 5 tags).
 *
 * Tags represent what the user explicitly asked for via vibes and notes.
 * A location that matches 3+ user-preference tags is a strong fit regardless
 * of star rating, so tag weight should compete with rating quality (0-20).
 */
export function scoreTagMatch(
  location: Location,
  preferredTags?: string[],
): ScoringResult {
  if (!preferredTags || preferredTags.length === 0 || !location.tags || location.tags.length === 0) {
    return { score: 0, reasoning: "" };
  }

  const locationTagSet = new Set(location.tags.map((t) => t.toLowerCase()));
  const matches = preferredTags.filter((t) => locationTagSet.has(t.toLowerCase()));

  if (matches.length === 0) {
    return { score: 0, reasoning: "" };
  }

  const score = Math.min(matches.length * 5, 25);
  return {
    score,
    reasoning: `Tag match: ${matches.join(", ")} (+${score})`,
  };
}

/**
 * Calculate accommodation style bonus.
 * Ryokan guests prefer onsen/garden/nature/wellness categories.
 * Returns 5 for matching categories, 0 otherwise.
 */
export function scoreAccommodationBonus(
  location: Location,
  accommodationStyle?: LocationScoringCriteria["accommodationStyle"],
): number {
  const RYOKAN_BONUS_CATEGORIES = new Set(["onsen", "garden", "nature", "wellness"]);
  return (
    accommodationStyle === "ryokan" &&
    location.category &&
    RYOKAN_BONUS_CATEGORIES.has(location.category)
  ) ? 5 : 0;
}

/**
 * Calculate UNESCO World Heritage Site bonus.
 * Unconditional +3 for all UNESCO sites (baseline cultural significance).
 * Additional +7 when the user selected history_buff or temples_tradition vibes.
 * Returns { base, vibe, total }.
 */
export function scoreUnescoBonus(
  location: Location,
  hasHeritageVibe?: boolean,
): { base: number; vibe: number; total: number } {
  const base = location.isUnescoSite ? 3 : 0;
  const vibe = (location.isUnescoSite && hasHeritageVibe) ? 7 : 0;
  return { base, vibe, total: base + vibe };
}

/**
 * Calculate hidden gem bonus. Two layers:
 * 1. Unconditional +5 when user selected "local_secrets" vibe — the vibe
 *    selection itself is intent signal. A guide doesn't need tag overlap
 *    to recommend a special place to someone who asked for discoveries.
 * 2. Additional +8 when the gem also matches 2+ preferred tags — rewards
 *    alignment between the hidden gem and specific user preferences.
 * Returns { localSecretsBonus, tagBonus, total }.
 */
export function scoreHiddenGemBonus(
  location: Location,
  hasLocalSecretsVibe?: boolean,
  tagMatchScore?: number,
): { localSecretsBonus: number; tagBonus: number; total: number } {
  const localSecretsBonus = (
    location.isHiddenGem && hasLocalSecretsVibe
  ) ? 5 : 0;
  const tagBonus = (
    location.isHiddenGem &&
    (tagMatchScore ?? 0) >= 10 // At least 2 matching tags
  ) ? 8 : 0;
  return { localSecretsBonus, tagBonus, total: localSecretsBonus + tagBonus };
}
