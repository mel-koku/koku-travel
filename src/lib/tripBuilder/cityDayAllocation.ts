/**
 * Per-city day allocation utilities for the trip builder.
 *
 * Pure functions — no React dependencies.
 * Uses parallel number[] arrays that map 1:1 with the cities array.
 */

import type { CityId } from "@/types/trip";

/**
 * Compute a default day allocation as a parallel array.
 * cityDays[i] = days for cities[i].
 *
 * Earlier cities in the array receive the remainder days first.
 */
export function computeDefaultCityDays(
  cities: CityId[],
  totalDays: number,
): number[] {
  if (cities.length === 0 || totalDays <= 0) return [];

  // When more cities than days, give 1 day each up to totalDays,
  // then 0 for the rest (auto-return city gets squeezed)
  if (cities.length > totalDays) {
    return cities.map((_, i) => (i < totalDays ? 1 : 0));
  }

  const base = Math.floor(totalDays / cities.length);
  let remainder = totalDays - base * cities.length;

  return cities.map(() => {
    let days = base;
    if (remainder > 0) {
      days += 1;
      remainder -= 1;
    }
    return days;
  });
}

/**
 * Redistribute the days of a removed entry among the remaining entries.
 *
 * Freed days are distributed round-robin starting from index 0
 * of the resulting array (after the removed index is spliced out).
 */
export function redistributeOnRemove(
  cityDays: number[],
  removedIndex: number,
): number[] {
  if (cityDays.length <= 1) return [];

  const freed = cityDays[removedIndex] ?? 0;
  const result = cityDays.filter((_, i) => i !== removedIndex);

  // Distribute freed days round-robin
  for (let i = 0; i < freed; i++) {
    const idx = i % result.length;
    result[idx] = (result[idx] ?? 0) + 1;
  }

  return result;
}
