/**
 * Per-city day allocation utilities for the trip builder.
 *
 * Pure functions — no React dependencies.
 */

import type { CityId } from "@/types/trip";

/**
 * Compute a default day allocation that mirrors the existing floor-division
 * algorithm in `expandCitySequenceForDays`.
 *
 * Earlier cities in the array receive the remainder days first.
 */
export function computeDefaultCityDays(
  cities: CityId[],
  totalDays: number,
): Record<CityId, number> {
  const result: Record<CityId, number> = {};
  if (cities.length === 0 || totalDays <= 0) return result;

  const base = Math.max(1, Math.floor(totalDays / cities.length));
  let remainder = totalDays - base * cities.length;

  for (const city of cities) {
    let days = base;
    if (remainder > 0) {
      days += 1;
      remainder -= 1;
    }
    result[city] = days;
  }

  return result;
}

/**
 * Redistribute the days of a removed city among the remaining cities.
 *
 * Freed days are distributed round-robin starting from the first city
 * in `remainingCities` order.
 */
export function redistributeOnRemove(
  cityDays: Record<CityId, number>,
  removedCity: CityId,
  remainingCities: CityId[],
): Record<CityId, number> {
  if (remainingCities.length === 0) return {};

  const freed = cityDays[removedCity] ?? 0;
  const result: Record<CityId, number> = {};

  for (const city of remainingCities) {
    result[city] = cityDays[city] ?? 1;
  }

  // Distribute freed days round-robin
  for (let i = 0; i < freed; i++) {
    const target = remainingCities[i % remainingCities.length]!;
    result[target] = (result[target] ?? 1) + 1;
  }

  return result;
}
