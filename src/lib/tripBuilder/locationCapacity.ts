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
  // Kansai
  kyoto: 371,
  osaka: 127,
  nara: 194,
  kobe: 99,
  otsu: 127,
  // Kanto
  tokyo: 246,
  yokohama: 43,
  kamakura: 50,
  nikko: 171,
  hakone: 199,
  // Chubu
  nagoya: 213,
  kanazawa: 144,
  takayama: 138,
  nagano: 164,
  niigata: 93,
  // Kyushu
  fukuoka: 193,
  nagasaki: 158,
  kumamoto: 126,
  kagoshima: 129,
  oita: 103,
  // Hokkaido
  sapporo: 214,
  hakodate: 33,
  // Tohoku
  sendai: 193,
  morioka: 99,
  aomori: 99,
  akita: 62,
  // Chugoku
  hiroshima: 177,
  okayama: 68,
  matsue: 129,
  tottori: 84,
  // Shikoku
  matsuyama: 92,
  takamatsu: 109,
  tokushima: 104,
  kochi: 72,
  // Okinawa
  naha: 226,
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
