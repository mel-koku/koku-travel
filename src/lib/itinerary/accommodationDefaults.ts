import type { Itinerary } from "@/types/itinerary";
import type { CityAccommodation, DayEntryPoint, EntryPoint } from "@/types/trip";
import { getCityCenterCoordinates } from "@/data/entryPoints";

/**
 * Resolves effective start/end points for each day in the itinerary.
 *
 * Priority:
 *   1. Explicit per-day override (dayEntryPoints)
 *   2. City-level accommodation (cityAccommodations) — uses baseCityId for day trips
 *   3. Day 1 = airport entry point, days 2+ = city center fallback
 *
 * When accommodation is set, both startPoint and endPoint default to same location
 * (round trip from hotel and back).
 */
export function resolveEffectiveDayEntryPoints(
  itinerary: Itinerary,
  tripId: string,
  dayEntryPoints: Record<string, DayEntryPoint>,
  cityAccommodations: Record<string, CityAccommodation>,
  tripEntryPoint?: EntryPoint,
): Record<string, DayEntryPoint> {
  const result: Record<string, DayEntryPoint> = {};

  for (let i = 0; i < (itinerary.days ?? []).length; i++) {
    const day = itinerary.days[i];
    if (!day?.id) continue;

    const dayKey = `${tripId}-${day.id}`;

    // Priority 1: Explicit per-day override
    const explicit = dayEntryPoints[dayKey];
    if (explicit?.startPoint || explicit?.endPoint) {
      result[day.id] = {
        startPoint: explicit.startPoint,
        endPoint: explicit.endPoint,
      };
      continue;
    }

    // Priority 2: City-level accommodation
    // Use baseCityId for day trips (e.g., day trip to Nara from Kyoto)
    const effectiveCityId = day.baseCityId ?? day.cityId;
    if (effectiveCityId) {
      const cityKey = `${tripId}-${effectiveCityId}`;
      const cityAccom = cityAccommodations[cityKey];
      if (cityAccom) {
        result[day.id] = {
          startPoint: cityAccom.entryPoint,
          endPoint: cityAccom.entryPoint,
        };
        continue;
      }
    }

    // Priority 3: Day 1 uses airport entry point
    if (i === 0 && tripEntryPoint) {
      result[day.id] = {
        startPoint: tripEntryPoint,
        endPoint: undefined,
      };
      continue;
    }

    // Priority 3 fallback: Days 2+ use city center
    if (i > 0 && day.cityId) {
      const center = getCityCenterCoordinates(day.cityId);
      result[day.id] = {
        startPoint: {
          type: "custom",
          id: `city-center-${day.cityId}`,
          name: `${day.cityId.charAt(0).toUpperCase() + day.cityId.slice(1)} city center`,
          coordinates: center,
          cityId: day.cityId,
        },
        endPoint: undefined,
      };
    }
  }

  return result;
}
