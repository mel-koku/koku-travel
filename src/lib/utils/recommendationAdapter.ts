/**
 * Adapter utilities for converting between RecommendationReason formats.
 *
 * Two RecommendationReason types exist in the codebase:
 * 1. itinerary.ts - Flexible array format (canonical, used in itinerary data)
 * 2. tripDomain.ts - Structured object format (legacy, used in domain model)
 *
 * This adapter provides conversion between formats to maintain compatibility
 * while allowing gradual migration to the canonical array format.
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

/**
 * Converts an itinerary RecommendationReason (flexible factors array)
 * to a tripDomain RecommendationReason (structured factors object).
 *
 * Note: This conversion may lose information if the array contains
 * factors that don't map to the structured format's known keys.
 *
 * @param reason - The flexible recommendation reason from itinerary
 * @returns The structured object format used in tripDomain types
 */
export function convertItineraryReasonToTripReason(
  reason: ItineraryRecommendationReason | undefined,
): TripRecommendationReason | undefined {
  if (!reason) {
    return undefined;
  }

  const factors: TripRecommendationReason["factors"] = {};

  if (reason.factors) {
    const labelToKey: Record<string, keyof typeof factors> = {
      "Interest Match": "interest",
      "interest": "interest",
      "Proximity": "proximity",
      "proximity": "proximity",
      "Budget Fit": "budget",
      "budget": "budget",
      "Accessibility": "accessibility",
      "accessibility": "accessibility",
      "Time Fit": "time",
      "time": "time",
      "Weather": "weather",
      "weather": "weather",
      "Group Fit": "groupFit",
      "groupFit": "groupFit",
    };

    for (const item of reason.factors) {
      const key = labelToKey[item.factor] ?? labelToKey[item.factor.toLowerCase()];
      if (key) {
        factors[key] = item.score;
      }
    }
  }

  return {
    primaryReason: reason.primaryReason,
    factors,
    alternativesConsidered: reason.alternativesConsidered,
  };
}
