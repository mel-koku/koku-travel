import type {
  Itinerary,
  ItineraryActivity,
  ItineraryDay,
  ItineraryTravelSegment,
} from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";

/**
 * Factory functions for itinerary-related test data.
 * Follows the same pattern as tests/fixtures/locations.ts.
 */

let counter = 0;
function uid(prefix: string) {
  return `${prefix}-${++counter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createTestBuilderData(
  overrides: Partial<TripBuilderData> = {},
): TripBuilderData {
  return {
    duration: 3,
    dates: { start: "2026-04-01", end: "2026-04-03" },
    regions: ["kansai"],
    cities: ["kyoto"],
    interests: ["culture", "food"],
    style: "balanced",
    ...overrides,
  };
}

export function createTestPlaceActivity(
  overrides: Partial<Extract<ItineraryActivity, { kind: "place" }>> = {},
): Extract<ItineraryActivity, { kind: "place" }> {
  return {
    kind: "place",
    id: overrides.id ?? uid("activity"),
    title: overrides.title ?? "Test Activity",
    timeOfDay: overrides.timeOfDay ?? "morning",
    durationMin: overrides.durationMin ?? 60,
    tags: overrides.tags ?? ["temple"],
    locationId: overrides.locationId ?? uid("loc"),
    ...overrides,
  };
}

export function createTestNoteActivity(
  overrides: Partial<Extract<ItineraryActivity, { kind: "note" }>> = {},
): Extract<ItineraryActivity, { kind: "note" }> {
  return {
    kind: "note",
    id: overrides.id ?? uid("note"),
    title: "Note",
    timeOfDay: overrides.timeOfDay ?? "morning",
    notes: overrides.notes ?? "Test note",
    ...overrides,
  };
}

export function createTestTravelSegment(
  overrides: Partial<ItineraryTravelSegment> = {},
): ItineraryTravelSegment {
  return {
    mode: overrides.mode ?? "walk",
    durationMinutes: overrides.durationMinutes ?? 15,
    distanceMeters: overrides.distanceMeters ?? 1200,
    departureTime: overrides.departureTime ?? "09:00",
    arrivalTime: overrides.arrivalTime ?? "09:15",
    ...overrides,
  };
}

export function createTestItineraryDay(
  overrides: Partial<ItineraryDay> = {},
): ItineraryDay {
  return {
    id: overrides.id ?? uid("day"),
    cityId: overrides.cityId ?? "kyoto",
    weekday: overrides.weekday ?? "monday",
    activities: overrides.activities ?? [
      createTestPlaceActivity({ timeOfDay: "morning" }),
      createTestPlaceActivity({ timeOfDay: "afternoon" }),
    ],
    ...overrides,
  };
}

export function createTestItinerary(
  overrides: Partial<Itinerary> = {},
): Itinerary {
  return {
    days: overrides.days ?? [
      createTestItineraryDay({ id: "day-1" }),
      createTestItineraryDay({ id: "day-2" }),
    ],
    timezone: overrides.timezone ?? "Asia/Tokyo",
    ...overrides,
  };
}
