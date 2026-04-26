import { describe, it, expect } from "vitest";
import { resolveEffectiveDayEntryPoints } from "@/lib/itinerary/accommodationDefaults";
import type { Itinerary } from "@/types/itinerary";
import type { CityAccommodation, DayEntryPoint, EntryPoint } from "@/types/trip";

const sheraton: EntryPoint = {
  type: "accommodation",
  id: "sheraton-osaka",
  name: "Sheraton Miyako Hotel Osaka",
  coordinates: { lat: 34.65, lng: 135.52 },
};

const itinerary: Itinerary = {
  days: [
    { id: "day-1", cityId: "osaka", activities: [] },
    { id: "day-2", cityId: "osaka", activities: [] },
  ],
};

const tripId = "trip-1";

describe("resolveEffectiveDayEntryPoints — explicit clear", () => {
  it("falls back to city accommodation when no per-day override", () => {
    const cityAccommodations: Record<string, CityAccommodation> = {
      [`${tripId}-osaka`]: { cityId: "osaka", entryPoint: sheraton },
    };
    const result = resolveEffectiveDayEntryPoints(itinerary, tripId, {}, cityAccommodations);
    expect(result["day-1"]?.startPoint).toEqual(sheraton);
    expect(result["day-1"]?.endPoint).toEqual(sheraton);
    expect(result["day-2"]?.startPoint).toEqual(sheraton);
  });

  it("respects clearedStart and falls back to city accom for end only (KOK-27)", () => {
    const cityAccommodations: Record<string, CityAccommodation> = {
      [`${tripId}-osaka`]: { cityId: "osaka", entryPoint: sheraton },
    };
    const dayEntryPoints: Record<string, DayEntryPoint> = {
      [`${tripId}-day-2`]: { clearedStart: true },
    };
    const result = resolveEffectiveDayEntryPoints(
      itinerary,
      tripId,
      dayEntryPoints,
      cityAccommodations,
    );
    expect(result["day-2"]?.startPoint).toBeUndefined();
    expect(result["day-2"]?.endPoint).toEqual(sheraton);
    // Other days unaffected
    expect(result["day-1"]?.startPoint).toEqual(sheraton);
  });

  it("clearing both sides skips the city fallback entirely", () => {
    const cityAccommodations: Record<string, CityAccommodation> = {
      [`${tripId}-osaka`]: { cityId: "osaka", entryPoint: sheraton },
    };
    const dayEntryPoints: Record<string, DayEntryPoint> = {
      [`${tripId}-day-2`]: { clearedStart: true, clearedEnd: true },
    };
    const result = resolveEffectiveDayEntryPoints(
      itinerary,
      tripId,
      dayEntryPoints,
      cityAccommodations,
    );
    expect(result["day-2"]).toBeUndefined();
  });
});
