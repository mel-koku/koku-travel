import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Itinerary } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { RoutingRequest } from "../routing/types";
import { planItinerary } from "../itineraryPlanner";

const mockRequestRoute = vi.fn();

// Create mock locations for the test itinerary
const mockLocations: Record<string, Location> = {
  "day1-activity-1": {
    id: "kyoto-fushimi-inari-taisha",
    name: "Fushimi Inari Taisha",
    region: "Kansai",
    city: "Kyoto",
    category: "shrine",
    image: "/images/fushimi-inari.jpg",
    coordinates: { lat: 34.9671, lng: 135.7727 },
    operatingHours: {
      periods: [
        { day: "monday", open: "00:00", close: "23:59" },
        { day: "tuesday", open: "00:00", close: "23:59" },
        { day: "wednesday", open: "00:00", close: "23:59" },
        { day: "thursday", open: "00:00", close: "23:59" },
        { day: "friday", open: "00:00", close: "23:59" },
        { day: "saturday", open: "00:00", close: "23:59" },
        { day: "sunday", open: "00:00", close: "23:59" },
      ],
    },
    recommendedVisit: {
      typicalMinutes: 120,
      minMinutes: 60,
    },
    preferredTransitModes: ["train", "bus"],
    timezone: "Asia/Tokyo",
  },
  "day1-activity-2": {
    id: "kyoto-nishiki-market",
    name: "Nishiki Market",
    region: "Kansai",
    city: "Kyoto",
    category: "market",
    image: "/images/nishiki-market.jpg",
    coordinates: { lat: 35.0050, lng: 135.7648 },
    // No operatingHours - this will result in "tentative" schedule status
    recommendedVisit: {
      typicalMinutes: 90,
      minMinutes: 45,
    },
    preferredTransitModes: ["walk", "bus"],
    timezone: "Asia/Tokyo",
  },
};

// Mock findLocationsForActivities
vi.mock("../itineraryLocations", () => ({
  findLocationsForActivities: vi.fn().mockImplementation(async (activities) => {
    const result = new Map();
    for (const activity of activities) {
      result.set(activity.id, mockLocations[activity.id] ?? null);
    }
    return result;
  }),
}));

// Mock logger to avoid console noise
vi.mock("../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Google Places to avoid network calls
vi.mock("../googlePlaces", () => ({
  fetchLocationDetails: vi.fn().mockResolvedValue(null),
}));

vi.mock("../routing", () => ({
  requestRoute: (request: unknown) => mockRequestRoute(request),
}));

beforeEach(() => {
  mockRequestRoute.mockReset();
});

const buildRoute = (mode: RoutingRequest["mode"], durationSeconds: number, instruction?: string) => ({
  provider: "mock",
  mode,
  durationSeconds,
  distanceMeters: 7800,
  legs: [
    {
      mode,
      durationSeconds,
      distanceMeters: 7800,
      summary: `${mode} leg`,
      steps: instruction ? [{ instruction }] : [],
    },
  ],
  warnings: [],
  fetchedAt: new Date().toISOString(),
});

const createTestItinerary = (): Itinerary => ({
  timezone: "Asia/Tokyo",
  days: [
    {
      dateLabel: "Kyoto Day",
      timezone: "Asia/Tokyo",
      weekday: "tuesday",
      bounds: {
        startTime: "08:00",
        endTime: "20:00",
      },
      activities: [
        {
          kind: "place",
          id: "day1-activity-1",
          title: "Fushimi Inari Taisha",
          timeOfDay: "morning",
          durationMin: 120,
          locationId: "kyoto-fushimi-inari-taisha",
          tags: ["culture"],
        },
        {
          kind: "place",
          id: "day1-activity-2",
          title: "Nishiki Market",
          timeOfDay: "afternoon",
          durationMin: 90,
          locationId: "kyoto-nishiki-market",
          tags: ["food"],
        },
      ],
    },
  ],
});

describe("planItinerary", () => {
  it("injects travel segments and schedules visits against opening hours", async () => {
    // The planner now makes 2 calls per activity pair: walk check + single transit call
    // (Previously made 6 calls: walk + 5 transit modes)
    mockRequestRoute.mockImplementation((request: RoutingRequest) => {
      switch (request.mode) {
        case "walk":
        case "walking":
          return Promise.resolve(buildRoute("walk", 1800)); // 30 min walk triggers transit search
        case "transit":
          return Promise.resolve(buildRoute("transit", 1200, "Take transit toward destination"));
        default:
          return Promise.resolve(buildRoute(request.mode, 1400));
      }
    });

    const itinerary = createTestItinerary();

    const result = await planItinerary(itinerary, {
      defaultDayStart: "08:00",
      transitionBufferMinutes: 10,
    });

    // 2 calls: walk check + transit
    expect(mockRequestRoute).toHaveBeenCalledTimes(2);
    const plannedDay = result.days[0];
    const [firstActivity, secondActivity] = plannedDay.activities;

    expect(firstActivity.kind).toBe("place");
    if (firstActivity.kind === "place") {
      expect(firstActivity.schedule?.arrivalTime).toBe("08:00");
      expect(firstActivity.schedule?.departureTime).toBe("10:00");
      expect(firstActivity.schedule?.operatingWindow?.status).toBe("within");
    }

    expect(secondActivity.kind).toBe("place");
    if (secondActivity.kind === "place") {
      // Now uses consolidated "transit" mode instead of specific transit type
      expect(secondActivity.travelFromPrevious?.mode).toBe("transit");
      expect(secondActivity.travelFromPrevious?.departureTime).toBe("10:10");
      expect(secondActivity.travelFromPrevious?.arrivalTime).toBe("10:30"); // 20 min transit
      expect(secondActivity.travelFromPrevious?.instructions).toEqual([
        "Take transit toward destination",
      ]);
      expect(secondActivity.schedule?.arrivalTime).toBe("10:30");
      expect(secondActivity.schedule?.departureTime).toBe("12:00");
      expect(secondActivity.schedule?.status).toBe("tentative");
    }
  });

  it("keeps walking mode when the walk is short", async () => {
    mockRequestRoute.mockImplementation((request: RoutingRequest) => {
      return Promise.resolve(buildRoute(request.mode, 480));
    });

    const itinerary = createTestItinerary();

    const result = await planItinerary(itinerary, {
      defaultDayStart: "08:00",
      transitionBufferMinutes: 10,
    });

    expect(mockRequestRoute).toHaveBeenCalledTimes(1);
    const secondActivity = result.days[0]?.activities[1];

    expect(secondActivity?.kind).toBe("place");
    if (secondActivity?.kind === "place") {
      expect(secondActivity.travelFromPrevious?.mode).toBe("walk");
    }
  });
});


