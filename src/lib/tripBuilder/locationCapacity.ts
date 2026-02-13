import { DAY_TRIP_MAPPINGS } from "@/data/dayTrips";
import { REGIONS } from "@/data/regions";
import type { KnownCityId } from "@/types/trip";

/**
 * Approximate non-food location counts per city.
 * Food categories (restaurant, food, cafe, bar, market) are excluded since
 * the generator filters them out of activity slots.
 * These are rough estimates used only for UI warnings, not for generation.
 */
const CITY_ACTIVITY_CAPACITY: Partial<Record<KnownCityId, number>> = {
  osaka: 42,
  kyoto: 340,
  tokyo: 180,
  nara: 65,
  kobe: 45,
  yokohama: 35,
  nagoya: 50,
  kanazawa: 40,
  fukuoka: 55,
  nagasaki: 30,
  sapporo: 50,
  hakodate: 20,
  sendai: 25,
  hiroshima: 40,
  matsuyama: 20,
  takamatsu: 20,
  naha: 25,
};

export type LocationWarning = {
  message: string;
  suggestion: string;
};

/**
 * Check if the selected cities have enough non-food locations to fill
 * the trip duration (3 activities/day). Returns a warning with day trip
 * suggestions when capacity is insufficient.
 */
export function checkLocationCapacity(
  selectedCities: KnownCityId[],
  duration: number,
): LocationWarning | null {
  if (selectedCities.length === 0 || !duration) return null;

  const activitiesNeeded = duration * 3;
  const totalCapacity = selectedCities.reduce(
    (sum, id) => sum + (CITY_ACTIVITY_CAPACITY[id] ?? 30),
    0,
  );

  // Require 30% headroom — the generator loses locations to geographic
  // validation, deduplication, and interest filtering, so raw counts
  // overestimate what's actually usable.
  if (totalCapacity >= activitiesNeeded * 1.3) return null;

  // Find day trip suggestions for the selected cities
  const selectedSet = new Set(selectedCities);
  const suggestions: string[] = [];
  for (const cityId of selectedCities) {
    const trips = DAY_TRIP_MAPPINGS[cityId] ?? [];
    for (const trip of trips) {
      if (!selectedSet.has(trip.cityId as KnownCityId)) {
        const cityName = REGIONS.flatMap((r) => r.cities).find(
          (c) => c.id === trip.cityId,
        )?.name;
        if (cityName && !suggestions.includes(cityName)) {
          suggestions.push(cityName);
        }
      }
      if (suggestions.length >= 2) break;
    }
    if (suggestions.length >= 2) break;
  }

  const cityNames = selectedCities
    .map((id) => REGIONS.flatMap((r) => r.cities).find((c) => c.id === id)?.name)
    .filter(Boolean);
  const cityLabel = cityNames.length === 1 ? cityNames[0] : "Your selection";

  return {
    message: `${cityLabel} alone may not fill ${duration} days.`,
    suggestion:
      suggestions.length > 0
        ? `Consider adding ${suggestions.join(" or ")}.`
        : "Consider adding more cities.",
  };
}
