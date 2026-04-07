/**
 * Deterministic briefing assembler for the Before You Land tab.
 *
 * Takes cultural pillar content (from Sanity) and the trip's activity categories,
 * then scores, orders, and filters behaviors to produce a personalized briefing.
 * No LLM call -- pure scoring function.
 */

import type { CulturalPillar, CulturalBriefing, AssembledPillar, PillarBehavior } from "@/types/culturalBriefing";

/** Max important behaviors shown per pillar */
const MAX_IMPORTANT_PER_PILLAR = 3;
/** Max nice_to_know behaviors shown per pillar */
const MAX_NICE_TO_KNOW_PER_PILLAR = 2;

const FALLBACK_INTRO =
  "Japan's social customs run deep. The tips below connect to your itinerary so you'll move through each place with the awareness locals appreciate.";

/**
 * Score a pillar's relevance to a trip's activity categories.
 * Higher = more relevant to this specific trip.
 */
export function scorePillar(pillar: CulturalPillar, tripCategories: string[]): number {
  const categorySet = new Set(tripCategories);
  let score = 0;

  for (const behavior of pillar.behaviors) {
    const matches = behavior.categories.length === 0 || behavior.categories.some((c) => categorySet.has(c));
    if (matches) {
      score += 10;
      if (behavior.severity === "critical") {
        score += 25;
      }
    }
  }

  return score;
}

/**
 * Filter and cap behaviors for a single pillar based on trip categories.
 * All critical behaviors that match are included. Important and nice_to_know are capped.
 * When no categories match at all, include all behaviors (unmatched fallback).
 */
function selectBehaviors(behaviors: PillarBehavior[], tripCategories: string[]): PillarBehavior[] {
  const categorySet = new Set(tripCategories);
  const hasCategories = categorySet.size > 0;

  // When no trip categories provided, use all behaviors as the pool
  if (!hasCategories) {
    const critical = behaviors.filter((b) => b.severity === "critical");
    const important = behaviors.filter((b) => b.severity === "important").slice(0, MAX_IMPORTANT_PER_PILLAR);
    const niceToKnow = behaviors.filter((b) => b.severity === "nice_to_know").slice(0, MAX_NICE_TO_KNOW_PER_PILLAR);
    return [...critical, ...important, ...niceToKnow];
  }

  const matched = behaviors.filter(
    (b) => b.categories.length === 0 || b.categories.some((c) => categorySet.has(c)),
  );

  // If nothing matched, fall back to critical-only behaviors
  // (prevents mismatched advice like temple etiquette on park-only trips)
  const pool = matched.length === 0
    ? behaviors.filter((b) => b.severity === "critical")
    : matched;

  const critical = pool.filter((b) => b.severity === "critical");
  const important = pool.filter((b) => b.severity === "important").slice(0, MAX_IMPORTANT_PER_PILLAR);
  const niceToKnow = pool.filter((b) => b.severity === "nice_to_know").slice(0, MAX_NICE_TO_KNOW_PER_PILLAR);

  return [...critical, ...important, ...niceToKnow];
}

/**
 * Assemble a personalized cultural briefing from pillar content and trip data.
 *
 * @param pillars - All cultural pillars from Sanity CMS
 * @param tripCategories - Unique activity categories from the trip's itinerary
 * @param aiIntro - Optional AI-generated intro from Pass 3 (falls back to static text)
 */
export function assembleBriefing(
  pillars: CulturalPillar[],
  tripCategories: string[],
  aiIntro?: string | null,
): CulturalBriefing {
  // Score and sort pillars by relevance
  const scored = pillars
    .map((pillar) => ({
      pillar,
      score: scorePillar(pillar, tripCategories),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.pillar.sortOrder - b.pillar.sortOrder;
    });

  // Assemble each pillar with filtered behaviors
  const assembledPillars: AssembledPillar[] = scored.map(({ pillar }) => {
    const { sortOrder: _, ...rest } = pillar;
    return {
      ...rest,
      behaviors: selectBehaviors(pillar.behaviors, tripCategories),
    };
  });

  return {
    intro: aiIntro?.trim() || FALLBACK_INTRO,
    pillars: assembledPillars,
  };
}
