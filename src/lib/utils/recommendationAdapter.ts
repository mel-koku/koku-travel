/**
 * Adapter utility for reading legacy `TripActivity.reasoning` (structured object form
 * from `tripDomain.ts`) and projecting it into the canonical
 * `ItineraryRecommendationReason` (array form from `itinerary.ts`).
 *
 * No current code produces the structured form — the itinerary engine writes the
 * canonical shape directly. This adapter exists for defensive read of legacy Trip
 * JSON that may still be persisted in Supabase / cache from an earlier engine
 * version. New code should use the canonical form from `@/types/itinerary` directly.
 */

import type { RecommendationReason as ItineraryRecommendationReason } from "@/types/itinerary";
import type { RecommendationReason as TripRecommendationReason } from "@/types/tripDomain";

/**
 * Converts a tripDomain RecommendationReason (structured factors object)
 * to an itinerary RecommendationReason (flexible factors array).
 *
 * @param reason - The structured recommendation reason from tripDomain
 * @returns The flexible array format used in itinerary types
 */
export function convertTripReasonToItineraryReason(
  reason: TripRecommendationReason | undefined,
): ItineraryRecommendationReason | undefined {
  if (!reason) {
    return undefined;
  }

  // Convert factors object to array format
  const factorsArray: Array<{ factor: string; score: number; reasoning: string }> = [];

  if (reason.factors) {
    const factorMappings: Array<{
      key: keyof typeof reason.factors;
      label: string;
    }> = [
      { key: "interest", label: "Interest Match" },
      { key: "proximity", label: "Proximity" },
      { key: "budget", label: "Budget Fit" },
      { key: "accessibility", label: "Accessibility" },
      { key: "time", label: "Time Fit" },
      { key: "weather", label: "Weather" },
      { key: "groupFit", label: "Group Fit" },
    ];

    for (const { key, label } of factorMappings) {
      const value = reason.factors[key];
      if (value !== undefined) {
        factorsArray.push({
          factor: label,
          score: value,
          reasoning: `${label} score: ${value}`,
        });
      }
    }
  }

  return {
    primaryReason: reason.primaryReason,
    factors: factorsArray.length > 0 ? factorsArray : undefined,
    alternativesConsidered: reason.alternativesConsidered,
  };
}

