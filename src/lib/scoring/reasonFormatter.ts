/**
 * Humanizes raw scoring data into natural-language recommendation reasons.
 *
 * Replaces the inline construction in itineraryGenerator.ts with readable
 * explanations covering all 10 scoring dimensions.
 */

import type { ScoreBreakdown } from "./locationScoring";
import type { Location } from "@/types/location";
import type { RecommendationReason } from "@/types/itinerary";

export type ReasonContext = {
  /** Time slot the activity was placed in */
  timeSlot?: "morning" | "afternoon" | "evening";
  /** Whether user explicitly favorited this location */
  isFavorite?: boolean;
  /** How this location was sourced (e.g. "smart_prompt", "refinement") */
  source?: string;
  /** Names of runner-up locations that were considered */
  alternativesConsidered?: string[];
};

// ---------------------------------------------------------------------------
// Factor label + humanizer map
// ---------------------------------------------------------------------------

type FactorKey = keyof ScoreBreakdown;

const FACTOR_META: Record<
  FactorKey,
  { label: string; maxMagnitude: number }
> = {
  interestMatch: { label: "Interest match", maxMagnitude: 30 },
  ratingQuality: { label: "Rating & reviews", maxMagnitude: 25 },
  logisticalFit: { label: "Distance & logistics", maxMagnitude: 20 },
  budgetFit: { label: "Budget fit", maxMagnitude: 10 },
  accessibilityFit: { label: "Accessibility", maxMagnitude: 10 },
  diversityBonus: { label: "Variety", maxMagnitude: 5 },
  neighborhoodDiversity: { label: "Area variety", maxMagnitude: 5 },
  weatherFit: { label: "Weather fit", maxMagnitude: 10 },
  timeOptimization: { label: "Time-of-day fit", maxMagnitude: 10 },
  groupFit: { label: "Group fit", maxMagnitude: 8 },
};

// ---------------------------------------------------------------------------
// Humanize a single factor
// ---------------------------------------------------------------------------

function humanizeFactor(
  key: FactorKey,
  score: number,
  location: Location,
): string {
  switch (key) {
    case "interestMatch":
      if (score >= 25)
        return `${location.category ?? "This place"} matches your interests well`;
      if (score >= 15)
        return `Partially matches your interests`;
      return `Outside your main interests — adds variety`;

    case "ratingQuality": {
      const r = location.rating;
      const rc = location.reviewCount;
      if (r && r >= 4.5 && rc && rc >= 200)
        return `Highly rated (${r.toFixed(1)}, ${rc.toLocaleString()}+ reviews)`;
      if (r && r >= 4.0)
        return `Well rated (${r.toFixed(1)})`;
      if (r) return `Rated ${r.toFixed(1)}`;
      return "No rating data";
    }

    case "logisticalFit":
      if (score >= 15) return "Very close to your previous stop";
      if (score >= 10) return "Nearby — short commute";
      if (score >= 0) return "Moderate distance";
      return "A bit of a trek — but worth it";

    case "budgetFit":
      if (score >= 9) return "Fits your budget perfectly";
      if (score >= 6) return "Within budget";
      return "May stretch your budget";

    case "accessibilityFit":
      if (score >= 8) return "Fully accessible";
      if (score >= 5) return "Accessibility not confirmed";
      return "Limited accessibility info";

    case "diversityBonus":
      if (score >= 4) return "Adds a fresh category to your day";
      if (score <= -3) return "Similar to recent stops";
      return "";

    case "neighborhoodDiversity":
      if (score >= 4) return "Explores a new area";
      if (score <= -3) return "Same neighborhood as recent stops";
      return "";

    case "weatherFit":
      if (score >= 5) return "Great choice for today's weather";
      if (score <= -5) return "Weather may not be ideal — consider indoor backup";
      return "";

    case "timeOptimization":
      if (score >= 5) return `Well-suited for the ${location.category === "bar" || location.category === "entertainment" ? "evening" : "time slot"}`;
      if (score <= -3) return "Slightly off-peak for this time slot";
      return "";

    case "groupFit":
      if (score >= 5) return "Great for your group";
      if (score <= -3) return "May not suit your group well";
      return "";

    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Build a natural primary reason from the top positive factors
// ---------------------------------------------------------------------------

function buildPrimaryReason(
  breakdown: ScoreBreakdown,
  location: Location,
  context?: ReasonContext,
): string {
  if (context?.isFavorite) {
    return "From your favorites";
  }

  if (context?.source === "smart_prompt") {
    return "Suggested to fill a gap in your day";
  }

  // Collect the top 2-3 positive factors by score
  const entries = (Object.entries(breakdown) as [FactorKey, number][])
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  const topEntries = entries.slice(0, 3);

  if (topEntries.length === 0) {
    return "Selected to round out your day";
  }

  // Build fragments from the top factors
  const fragments: string[] = [];
  for (const [key] of topEntries) {
    const text = humanizeFactor(key, breakdown[key], location);
    if (text) fragments.push(text);
  }

  if (fragments.length === 0) {
    return "Selected based on your interests and preferences";
  }

  // Join with " — " for readability
  if (fragments.length === 1) return fragments[0]!;
  if (fragments.length === 2) return `${fragments[0]} — ${fragments[1]}`;
  return `${fragments[0]} — ${fragments[1]}. ${fragments[2]}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Format scoring data into a human-readable `RecommendationReason`.
 *
 * Covers all 10 scoring dimensions, filters out neutral/zero factors,
 * and produces a natural-language `primaryReason`.
 */
export function formatRecommendationReason(
  breakdown: ScoreBreakdown,
  location: Location,
  context?: ReasonContext,
): RecommendationReason {
  const primaryReason = buildPrimaryReason(breakdown, location, context);

  // Build factors — only include non-zero factors with meaningful reasoning
  const factors: RecommendationReason["factors"] = [];

  for (const [key, meta] of Object.entries(FACTOR_META) as [FactorKey, typeof FACTOR_META[FactorKey]][]) {
    const score = breakdown[key];
    // Skip zero/neutral scores to keep list scannable
    if (score === 0) continue;
    // Skip small scores on low-magnitude factors (noise)
    if (Math.abs(score) <= 1 && meta.maxMagnitude <= 5) continue;

    const reasoning = humanizeFactor(key, score, location);
    if (!reasoning) continue;

    factors.push({
      factor: meta.label,
      score,
      reasoning,
    });
  }

  // Sort factors: positive first (descending), then negative (ascending)
  factors.sort((a, b) => b.score - a.score);

  return {
    primaryReason,
    factors: factors.length > 0 ? factors : undefined,
    alternativesConsidered: context?.alternativesConsidered,
  };
}
