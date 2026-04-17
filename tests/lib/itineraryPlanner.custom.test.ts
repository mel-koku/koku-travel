import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Itinerary, ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { RoutingRequest } from "@/lib/routing/types";
import { planItinerary } from "@/lib/itineraryPlanner";

const mockRequestRoute = vi.fn();

const coordLocations: Record<string, Location> = {
  "act-a": {
    id: "loc-a",
    name: "Tokyo Station",
    region: "Kanto",
    city: "Tokyo",
    category: "transit",
    image: "/a.jpg",
    coordinates: { lat: 35.681236, lng: 139.767125 },
    recommendedVisit: { typicalMinutes: 30, minMinutes: 15 },
    preferredTransitModes: ["walking"],
    timezone: "Asia/Tokyo",
  },
  "act-c": {
    id: "loc-c",
    name: "Ueno Park",
    region: "Kanto",
    city: "Tokyo",
    category: "park",
    image: "/c.jpg",
    coordinates: { lat: 35.7148, lng: 139.7732 },
    recommendedVisit: { typicalMinutes: 90, minMinutes: 45 },
    preferredTransitModes: ["transit"],
    timezone: "Asia/Tokyo",
  },
};

vi.mock("@/lib/itineraryLocations", () => ({
  findLocationsForActivities: vi.fn().mockImplementation(async (activities: ItineraryActivity[]) => {
    const result = new Map<string, Location>();
    for (const activity of activities) {
      const loc = coordLocations[activity.id];
      if (loc) result.set(activity.id, loc);
    }
    return result;
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/googlePlaces", () => ({
  fetchLocationDetails: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/routing", () => ({
  requestRoute: (request: unknown) => mockRequestRoute(request),
}));

beforeEach(() => {
  mockRequestRoute.mockReset();
});

const buildRoute = (
  mode: RoutingRequest["mode"],
  durationSeconds: number,
  distanceMeters = 6000,
) => ({
  provider: "mock",
  mode,
  durationSeconds,
  distanceMeters,
  legs: [
    {
      mode,
      durationSeconds,
      distanceMeters,
      summary: `${mode} leg`,
      steps: [],
    },
  ],
  warnings: [],
  fetchedAt: new Date().toISOString(),
});

function makeItineraryWithAddresslessCustom(): Itinerary {
  const activities: ItineraryActivity[] = [
    {
      kind: "place",
      id: "act-a",
      title: "Tokyo Station",
      timeOfDay: "morning",
      durationMin: 30,
      locationId: "loc-a",
    },
    {
      kind: "place",
      id: "act-b",
      title: "Grandma's Ramen",
      timeOfDay: "afternoon",
      durationMin: 60,
      isCustom: true,
      // no coordinates, no locationId
    },
    {
      kind: "place",
      id: "act-c",
      title: "Ueno Park",
      timeOfDay: "afternoon",
      durationMin: 90,
      locationId: "loc-c",
    },
  ];
  return {
    days: [
      {
        id: "day-1",
        dateLabel: "Mon",
        weekday: "monday",
        cityId: "tokyo",
        activities,
        bounds: { startTime: "09:00", endTime: "21:00" },
      },
    ],
    timezone: "Asia/Tokyo",
  };
}

// ---------------------------------------------------------------------------
// Task 3 helpers
// ---------------------------------------------------------------------------

function makeItineraryWithCoordsCustomNoHours(): Itinerary {
  const activities: ItineraryActivity[] = [
    {
      kind: "place",
      id: "act-a",
      title: "Tokyo Station",
      timeOfDay: "morning",
      durationMin: 30,
      locationId: "loc-a",
    },
    {
      kind: "place",
      id: "act-custom-coords",
      title: "My Favourite Spot",
      timeOfDay: "afternoon",
      durationMin: 60,
      isCustom: true,
      // Has coordinates — NOT addressless
      coordinates: { lat: 35.69, lng: 139.70 },
      // No customOperatingHours
    },
    {
      kind: "place",
      id: "act-c",
      title: "Ueno Park",
      timeOfDay: "afternoon",
      durationMin: 90,
      locationId: "loc-c",
    },
  ];
  return {
    days: [
      {
        id: "day-1",
        dateLabel: "Mon",
        weekday: "monday",
        cityId: "tokyo",
        activities,
        bounds: { startTime: "09:00", endTime: "21:00" },
      },
    ],
    timezone: "Asia/Tokyo",
  };
}

function makeItineraryWithCoordsCustomAndHours(): Itinerary {
  const activities: ItineraryActivity[] = [
    {
      kind: "place",
      id: "act-a",
      title: "Tokyo Station",
      timeOfDay: "morning",
      durationMin: 30,
      locationId: "loc-a",
    },
    {
      kind: "place",
      id: "act-custom-hours",
      title: "My Favourite Cafe",
      timeOfDay: "morning",
      durationMin: 60,
      isCustom: true,
      coordinates: { lat: 35.69, lng: 139.70 },
      customOperatingHours: {
        timezone: "Asia/Tokyo",
        periods: [{ day: "monday", open: "10:00", close: "12:00" }],
      },
    },
    {
      kind: "place",
      id: "act-c",
      title: "Ueno Park",
      timeOfDay: "afternoon",
      durationMin: 90,
      locationId: "loc-c",
    },
  ];
  return {
    days: [
      {
        id: "day-1",
        dateLabel: "Mon",
        weekday: "monday",
        cityId: "tokyo",
        activities,
        bounds: { startTime: "09:00", endTime: "21:00" },
      },
    ],
    timezone: "Asia/Tokyo",
  };
}

// ---------------------------------------------------------------------------
// Task 3 tests
// ---------------------------------------------------------------------------

describe("planItineraryDay with custom stops that have coordinates but NO customOperatingHours", () => {
  it("routes normally and produces schedule.status === 'scheduled' with no operatingWindow", async () => {
    mockRequestRoute.mockResolvedValue(buildRoute("transit", 1500));

    const planned = await planItinerary(makeItineraryWithCoordsCustomNoHours());

    const day = planned.days[0];
    const [a, custom, c] = day.activities as Extract<ItineraryActivity, { kind: "place" }>[];

    // Custom stop with coords routes normally — it must have travel segments
    expect(custom.travelFromPrevious).toBeDefined();

    // No operatingWindow because there are no customOperatingHours
    expect(custom.operatingWindow).toBeUndefined();

    // schedule must be "scheduled" (not "out-of-hours" or "tentative")
    expect(custom.schedule?.status).toBe("scheduled");

    // Subsequent stop (c) also routes normally
    expect(c.travelFromPrevious).toBeDefined();

    // Silence unused-var lint
    expect(a.id).toBe("act-a");
  });
});

describe("planItineraryDay with custom stops that have coordinates AND customOperatingHours", () => {
  it("evaluates operating window using customOperatingHours periods", async () => {
    mockRequestRoute.mockResolvedValue(buildRoute("transit", 1500));

    const planned = await planItinerary(makeItineraryWithCoordsCustomAndHours());

    const day = planned.days[0];
    const [a, custom] = day.activities as Extract<ItineraryActivity, { kind: "place" }>[];

    // Operating window should be populated from customOperatingHours
    expect(custom.operatingWindow).toBeDefined();
    expect(custom.operatingWindow?.opensAt).toBe("10:00");
    expect(custom.operatingWindow?.closesAt).toBe("12:00");

    // schedule.operatingWindow should also reflect the custom hours
    expect(custom.schedule?.operatingWindow?.opensAt).toBe("10:00");
    expect(custom.schedule?.operatingWindow?.closesAt).toBe("12:00");

    // Travel routing still happens (has coordinates)
    expect(custom.travelFromPrevious).toBeDefined();

    // Silence unused-var lint
    expect(a.id).toBe("act-a");
  });
});

// ---------------------------------------------------------------------------
// Task 2 tests (unchanged)
// ---------------------------------------------------------------------------

describe("planItineraryDay with addressless custom stops", () => {
  it("skips routing for addressless custom stops and routes next stop from previous coordinate stop", async () => {
    // 25 minutes = 1500 seconds
    mockRequestRoute.mockResolvedValue(buildRoute("transit", 1500));

    const planned = await planItinerary(makeItineraryWithAddresslessCustom());

    const day = planned.days[0];
    const [a, b, c] = day.activities as Extract<ItineraryActivity, { kind: "place" }>[];

    // Addressless custom: no travel segments, no schedule status "out-of-hours"
    expect(b.travelFromPrevious).toBeUndefined();
    expect(b.travelToNext).toBeUndefined();
    // But schedule is set (cursor advanced)
    expect(b.schedule?.arrivalTime).toBeDefined();
    expect(b.schedule?.departureTime).toBeDefined();

    // Next stop (c) received a travel segment computed from a (skipping b)
    expect(c.travelFromPrevious).toBeDefined();
    // The mock was called with origin = Tokyo Station coords, destination = Ueno coords
    const callsWithUenoDest = mockRequestRoute.mock.calls.filter(
      ([req]: [{ destination: { lat: number; lng: number } }]) =>
        Math.abs(req.destination.lat - 35.7148) < 0.001 &&
        Math.abs(req.destination.lng - 139.7732) < 0.001,
    );
    expect(callsWithUenoDest.length).toBeGreaterThan(0);
    expect(callsWithUenoDest[0][0].origin.lat).toBeCloseTo(35.681236, 3);
    expect(callsWithUenoDest[0][0].origin.lng).toBeCloseTo(139.767125, 3);

    // Keep reference to a to silence unused-var
    expect(a.id).toBe("act-a");
  });

  it("sets skippedOverCustom: true on the travel segment when preceding stop was addressless-custom", async () => {
    mockRequestRoute.mockResolvedValue(buildRoute("transit", 1500));

    const planned = await planItinerary(makeItineraryWithAddresslessCustom());

    const day = planned.days[0];
    const [, , c] = day.activities as Extract<ItineraryActivity, { kind: "place" }>[];

    expect(c.travelFromPrevious?.skippedOverCustom).toBe(true);
  });
});

describe("planItineraryDay honors manualStartTime", () => {
  it("pushes arrival to the pinned time even when cursor is earlier", async () => {
    // act-a: 30 min duration, starts at 09:00 → departs ~09:30
    // act-b: has coords + manualStartTime "14:30" → mock 20 min travel from act-a
    // Planner would naturally arrive at ~09:50 (09:30 + 10 buffer + 20 travel)
    // but pinned time is 14:30 → arrivalTime must be "14:30"
    mockRequestRoute.mockResolvedValue(buildRoute("walk", 1200, 500)); // 20 min travel, 500m

    const itinerary: Itinerary = {
      days: [
        {
          id: "day-1",
          dateLabel: "Mon",
          weekday: "monday",
          cityId: "tokyo",
          activities: [
            {
              kind: "place",
              id: "act-a",
              title: "Tokyo Station",
              timeOfDay: "morning",
              durationMin: 30,
              locationId: "loc-a",
            } as Extract<ItineraryActivity, { kind: "place" }>,
            {
              kind: "place",
              id: "act-b-pinned",
              title: "Lunch Reservation",
              timeOfDay: "afternoon",
              durationMin: 60,
              isCustom: true,
              coordinates: { lat: 35.695, lng: 139.770 },
              manualStartTime: "14:30",
            } as Extract<ItineraryActivity, { kind: "place" }>,
          ],
          bounds: { startTime: "09:00", endTime: "21:00" },
        },
      ],
      timezone: "Asia/Tokyo",
    };

    const planned = await planItinerary(itinerary);
    const day = planned.days[0];
    const [, actB] = day.activities as Extract<ItineraryActivity, { kind: "place" }>[];

    expect(actB.schedule?.arrivalTime).toBe("14:30");
  });

  it("does NOT pull cursor backward when cursor is already past the pinned time", async () => {
    // act-a: very long 360 min duration starting at 09:00 → departs 15:00
    // act-b: coords + manualStartTime "12:00" (earlier than cursor)
    // cursor after travel should remain past 12:00; arrival should NOT be 12:00
    mockRequestRoute.mockResolvedValue(buildRoute("walk", 600, 400)); // 10 min travel

    const itinerary: Itinerary = {
      days: [
        {
          id: "day-1",
          dateLabel: "Mon",
          weekday: "monday",
          cityId: "tokyo",
          activities: [
            {
              kind: "place",
              id: "act-a",
              title: "Tokyo Station",
              timeOfDay: "morning",
              durationMin: 360,
              locationId: "loc-a",
            } as Extract<ItineraryActivity, { kind: "place" }>,
            {
              kind: "place",
              id: "act-b-past",
              title: "Early Restaurant",
              timeOfDay: "afternoon",
              durationMin: 60,
              isCustom: true,
              coordinates: { lat: 35.695, lng: 139.770 },
              manualStartTime: "12:00",
            } as Extract<ItineraryActivity, { kind: "place" }>,
          ],
          bounds: { startTime: "09:00", endTime: "21:00" },
        },
      ],
      timezone: "Asia/Tokyo",
    };

    const planned = await planItinerary(itinerary);
    const day = planned.days[0];
    const [, actB] = day.activities as Extract<ItineraryActivity, { kind: "place" }>[];

    // Cursor is past 12:00 (act-a ends at 15:00 + 10 min buffer + 10 min travel = ~15:20)
    // So arrival should NOT be "12:00"
    expect(actB.schedule?.arrivalTime).not.toBe("12:00");
    // Arrival should be well after 12:00
    const [hh] = (actB.schedule?.arrivalTime ?? "00:00").split(":").map(Number);
    expect(hh).toBeGreaterThanOrEqual(15);
  });

  it("honors manualStartTime on addressless custom stops too", async () => {
    // act-b is addressless-custom with manualStartTime "13:00"
    // cursor at act-b start would be 09:00 + 30 (act-a) + 10 buffer = 09:40
    // pinned time 13:00 > 09:40, so arrivalTime must be "13:00"
    mockRequestRoute.mockResolvedValue(buildRoute("walk", 1200, 500));

    const itinerary: Itinerary = {
      days: [
        {
          id: "day-1",
          dateLabel: "Mon",
          weekday: "monday",
          cityId: "tokyo",
          activities: [
            {
              kind: "place",
              id: "act-a",
              title: "Tokyo Station",
              timeOfDay: "morning",
              durationMin: 30,
              locationId: "loc-a",
            } as Extract<ItineraryActivity, { kind: "place" }>,
            {
              kind: "place",
              id: "act-b-addressless",
              title: "Grandma's House",
              timeOfDay: "afternoon",
              durationMin: 60,
              isCustom: true,
              // no coordinates, no locationId → addressless
              manualStartTime: "13:00",
            } as Extract<ItineraryActivity, { kind: "place" }>,
          ],
          bounds: { startTime: "09:00", endTime: "21:00" },
        },
      ],
      timezone: "Asia/Tokyo",
    };

    const planned = await planItinerary(itinerary);
    const day = planned.days[0];
    const [, actB] = day.activities as Extract<ItineraryActivity, { kind: "place" }>[];

    expect(actB.schedule?.arrivalTime).toBe("13:00");
  });
});

describe("planItineraryDay idempotency with custom stops", () => {
  it("produces identical output when run twice on same input", async () => {
    mockRequestRoute.mockResolvedValue(buildRoute("transit", 1500));

    const input = makeItineraryWithAddresslessCustom();
    // Add a manualStartTime to exercise pinning
    (input.days[0].activities[2] as Extract<ItineraryActivity, { kind: "place" }>).manualStartTime =
      "14:30";

    const first = await planItinerary(input);
    const second = await planItinerary(input);

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});
