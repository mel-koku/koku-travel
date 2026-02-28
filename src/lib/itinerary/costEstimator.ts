import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import type { Location } from "@/types/location";

export type CostRange = { min: number; max: number };

/** Per-activity cost ranges by Google priceLevel (0-4) */
export const PRICE_RANGES: Record<number, CostRange> = {
  0: { min: 0, max: 0 },
  1: { min: 500, max: 1500 },
  2: { min: 1500, max: 3000 },
  3: { min: 3000, max: 8000 },
  4: { min: 8000, max: 15000 },
};

/** Transit flat rate per day */
const TRANSIT_RANGE: CostRange = { min: 300, max: 1200 };

export function estimateActivityCost(priceLevel: number | null | undefined): CostRange | null {
  if (priceLevel === undefined || priceLevel === null) return null;
  return PRICE_RANGES[priceLevel] ?? null;
}

/**
 * Estimate total daily cost from activities + transit.
 * Returns null if fewer than 2 activities have price data.
 */
export function estimateDayCost(
  activities: ItineraryActivity[],
  locationMap: Map<string, Location | null>,
): CostRange | null {
  let totalMin = 0;
  let totalMax = 0;
  let priceDataCount = 0;

  for (const activity of activities) {
    if (activity.kind !== "place") continue;
    const location = locationMap.get(activity.id);
    const range = estimateActivityCost(location?.priceLevel);
    if (range) {
      totalMin += range.min;
      totalMax += range.max;
      priceDataCount++;
    }
  }

  if (priceDataCount < 2) return null;

  return {
    min: totalMin + TRANSIT_RANGE.min,
    max: totalMax + TRANSIT_RANGE.max,
  };
}

/**
 * Estimate total trip cost across all days.
 */
export function estimateTripCost(
  days: ItineraryDay[],
  locationMap: Map<string, Location | null>,
): CostRange | null {
  let totalMin = 0;
  let totalMax = 0;
  let daysWithData = 0;

  for (const day of days) {
    const dayCost = estimateDayCost(day.activities, locationMap);
    if (dayCost) {
      totalMin += dayCost.min;
      totalMax += dayCost.max;
      daysWithData++;
    }
  }

  if (daysWithData === 0) return null;
  return { min: totalMin, max: totalMax };
}

export function formatYen(v: number): string {
  if (v >= 10000) return `¥${Math.round(v / 1000)}k`;
  return `¥${v.toLocaleString()}`;
}

export function formatCostRange(range: CostRange): string {
  return `~${formatYen(range.min)}–${formatYen(range.max)}`;
}

export type BudgetLevel = "budget" | "moderate" | "luxury";

export function deriveLevel(perDay: number): BudgetLevel {
  if (perDay < 8000) return "budget";
  if (perDay <= 20000) return "moderate";
  return "luxury";
}
