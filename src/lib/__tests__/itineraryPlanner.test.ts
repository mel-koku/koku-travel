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

const buildRoute = (mode: RoutingRequest["mode"], durationSeconds: number, instruction?: string) => {
  const stepMode = mode === "transit" || mode === "train" ? "transit" : mode === "walk" ? "walk" : "drive";
  return {
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
        steps: instruction ? [{ instruction, stepMode }] : [],
      },
    ],
    warnings: [],
    fetchedAt: new Date().toISOString(),
  };
};

const createTestItinerary = (): Itinerary => ({
  timezone: "Asia/Tokyo",
  days: [
    {
      id: "day-1",
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
      // When transit result is used, mode is set to "train"
      expect(secondActivity.travelFromPrevious?.mode).toBe("train");
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

  it("clears stale travelFromPrevious on the now-first activity after a reorder", async () => {
    // Regression: when a route optimizer reorders activities so a stop that
    // *was* mid-day becomes the first place activity of the day, the first
    // activity has no incoming route. The spread previously preserved its
    // stale `travelFromPrevious.arrivalTime` (e.g. "19:54" from when it was
    // an evening stop), causing the renderer to display the prior time.
    mockRequestRoute.mockImplementation((request: RoutingRequest) => {
      switch (request.mode) {
        case "walk":
        case "walking":
          return Promise.resolve(buildRoute("walk", 1800));
        case "transit":
          return Promise.resolve(buildRoute("transit", 1200));
        default:
          return Promise.resolve(buildRoute(request.mode, 1400));
      }
    });

    const itinerary = createTestItinerary();
    const firstActivity = itinerary.days[0]?.activities[0];
    if (firstActivity?.kind === "place") {
      // Stale evening arrival time from a prior layout
      firstActivity.travelFromPrevious = {
        mode: "train",
        durationMinutes: 12,
        arrivalTime: "19:54",
        departureTime: "19:42",
      };
    }

    const result = await planItinerary(itinerary, {
      defaultDayStart: "08:00",
      transitionBufferMinutes: 10,
    });

    const replanned = result.days[0]?.activities[0];
    expect(replanned?.kind).toBe("place");
    if (replanned?.kind === "place") {
      // First activity: no resolved route → travelFromPrevious must be cleared.
      expect(replanned.travelFromPrevious).toBeUndefined();
      // Schedule reflects the day start.
      expect(replanned.schedule?.arrivalTime).toBe("08:00");
    }
  });

  it("refreshes timeOfDay to match the fresh schedule", async () => {
    // Regression: `timeOfDay` is set at generation and can mismatch the
    // post-replan schedule (e.g. a stop tagged "evening" gets rescheduled to
    // 13:22 but keeps the "evening" tag). Downstream consumers — meal-slot
    // positions, lifestyle/timing detectors — bucket on `timeOfDay`, so a
    // stale value pushes them to the wrong slot. Planner now re-derives.
    mockRequestRoute.mockImplementation(() =>
      Promise.resolve(buildRoute("walk", 600)),
    );

    const itinerary = createTestItinerary();
    // Tag the activities as "evening" (e.g. from a prior layout) and verify
    // the planner overwrites them.
    for (const activity of itinerary.days[0]?.activities ?? []) {
      if (activity.kind === "place") {
        activity.timeOfDay = "evening";
      }
    }

    const result = await planItinerary(itinerary, {
      defaultDayStart: "08:00",
      transitionBufferMinutes: 10,
    });

    const [first, second] = result.days[0]?.activities ?? [];
    expect(first?.kind).toBe("place");
    if (first?.kind === "place") {
      // Scheduled at 08:00 → morning bucket
      expect(first.timeOfDay).toBe("morning");
    }
    expect(second?.kind).toBe("place");
    if (second?.kind === "place") {
      // Scheduled at ~10:30 (8 + 2h visit + 10m transit) → still morning
      expect(second.timeOfDay).toBe("morning");
    }
  });

  it("computes airport→hotel transit segment on Day 1 when both anchor and hotel are set", async () => {
    // Regression: when Day 1 has an arrival anchor (NRT) AND a hotel set as
    // the day's startPoint, the planner must route NRT→hotel as a real travel
    // segment instead of jumping `prevCoords`. The leg consumes time on the
    // day clock and renders as a map line via anchor.travelToNext.
    mockRequestRoute.mockImplementation((request: RoutingRequest) => {
      switch (request.mode) {
        case "walk":
        case "walking":
          return Promise.resolve(buildRoute("walk", 1800));
        case "transit":
          return Promise.resolve(buildRoute("transit", 3600, "Take the Skyliner from NRT")); // 60 min
        default:
          return Promise.resolve(buildRoute(request.mode, 1400));
      }
    });

    // Build an itinerary whose Day 1 starts with an arrival anchor at NRT
    // (Narita), followed by a single Kyoto stop (fixture data).
    const itinerary: Itinerary = {
      timezone: "Asia/Tokyo",
      days: [
        {
          id: "day-1",
          dateLabel: "Arrival Day",
          timezone: "Asia/Tokyo",
          weekday: "tuesday",
          bounds: { startTime: "08:00", endTime: "20:00" },
          activities: [
            {
              kind: "place",
              id: "anchor-arrival-nrt",
              title: "Arrive at Narita International Airport",
              isAnchor: true,
              coordinates: { lat: 35.7647, lng: 140.3863 },
              durationMin: 30,
              tags: ["airport"],
              timeOfDay: "morning",
              schedule: {
                arrivalTime: "08:00",
                departureTime: "08:30",
                status: "scheduled",
              },
            },
            {
              kind: "place",
              id: "day1-activity-1",
              title: "Fushimi Inari Taisha",
              timeOfDay: "morning",
              durationMin: 120,
              locationId: "kyoto-fushimi-inari-taisha",
              tags: ["culture"],
            },
          ],
        },
      ],
    };

    // Hotel ~70km from NRT (real-world airport→central Tokyo distance).
    const hotelCoords = { lat: 35.6895, lng: 139.6917 };
    const dayId = itinerary.days[0]!.id;
    const result = await planItinerary(
      itinerary,
      { defaultDayStart: "08:00", transitionBufferMinutes: 10 },
      { [dayId!]: { startPoint: { coordinates: hotelCoords } } },
    );

    const plannedDay = result.days[0]!;
    const [anchor, stop1] = plannedDay.activities;

    expect(anchor?.kind).toBe("place");
    if (anchor?.kind === "place") {
      // Anchor preserves its pre-set schedule.
      expect(anchor.isAnchor).toBe(true);
      expect(anchor.schedule?.arrivalTime).toBe("08:00");
      expect(anchor.schedule?.departureTime).toBe("08:30");
      // Anchor's outgoing segment is the airport→hotel transit.
      expect(anchor.travelToNext).toBeDefined();
      expect(anchor.travelToNext?.mode).toBe("train");
      expect(anchor.travelToNext?.durationMinutes).toBe(60);
      // Departs 08:40 (anchor depart 08:30 + 10-min transition buffer),
      // arrives 09:40 (after 60-min transit).
      expect(anchor.travelToNext?.departureTime).toBe("08:40");
      expect(anchor.travelToNext?.arrivalTime).toBe("09:40");
    }

    // Cursor advanced by transit duration → stop1 schedule reflects the full
    // airport→hotel→stop1 chain (not airport→stop1 directly).
    expect(stop1?.kind).toBe("place");
    if (stop1?.kind === "place") {
      // stop1.travelFromPrevious is the hotel→stop1 leg (departs after the
      // transit settled at 09:40, so 09:40 + walk-to-transit-fallback duration).
      expect(stop1.travelFromPrevious?.departureTime).toBe("09:40");
      // Schedule arrival is well after 08:00, confirming the transit was
      // accounted for on the day clock.
      const arrivalMin =
        Number(stop1.schedule?.arrivalTime?.split(":")[0]) * 60 +
        Number(stop1.schedule?.arrivalTime?.split(":")[1]);
      expect(arrivalMin).toBeGreaterThan(9 * 60 + 40);
    }
  });

  it("does not synthesize an airport→hotel leg when hotel startPoint is absent", async () => {
    // Counter-regression: arrival anchor with no hotel startPoint should leave
    // anchor.travelToNext set by the regular routing path (anchor→stop1), not
    // a fabricated airport→hotel segment.
    mockRequestRoute.mockImplementation((request: RoutingRequest) => {
      switch (request.mode) {
        case "walk":
        case "walking":
          return Promise.resolve(buildRoute("walk", 1800));
        case "transit":
          return Promise.resolve(buildRoute("transit", 1200));
        default:
          return Promise.resolve(buildRoute(request.mode, 1400));
      }
    });

    const itinerary: Itinerary = {
      timezone: "Asia/Tokyo",
      days: [
        {
          id: "day-1",
          dateLabel: "Arrival Day",
          timezone: "Asia/Tokyo",
          weekday: "tuesday",
          bounds: { startTime: "08:00", endTime: "20:00" },
          activities: [
            {
              kind: "place",
              id: "anchor-arrival-nrt",
              title: "Arrive at Narita",
              isAnchor: true,
              coordinates: { lat: 35.7647, lng: 140.3863 },
              durationMin: 30,
              tags: ["airport"],
              timeOfDay: "morning",
              schedule: {
                arrivalTime: "08:00",
                departureTime: "08:30",
                status: "scheduled",
              },
            },
            {
              kind: "place",
              id: "day1-activity-1",
              title: "Fushimi Inari Taisha",
              timeOfDay: "morning",
              durationMin: 120,
              locationId: "kyoto-fushimi-inari-taisha",
              tags: ["culture"],
            },
          ],
        },
      ],
    };

    // No dayEntryPoints argument → no startPoint → no airport→hotel leg.
    const result = await planItinerary(itinerary, {
      defaultDayStart: "08:00",
      transitionBufferMinutes: 10,
    });

    const [anchor, stop1] = result.days[0]!.activities;

    // The anchor's travelToNext is set by the regular routing path (the
    // anchor→stop1 leg, which comes from prevCoords=anchor → stop1 routing).
    // Critically, it's NOT the synthetic airport→hotel transit (60 min in
    // the previous test); it should match the anchor→stop1 mock route.
    expect(anchor?.kind).toBe("place");
    if (anchor?.kind === "place" && stop1?.kind === "place") {
      expect(anchor.travelToNext).toBeDefined();
      // anchor.travelToNext should equal stop1.travelFromPrevious (the
      // anchor→stop1 leg). Both reference the same routed segment.
      expect(anchor.travelToNext).toEqual(stop1.travelFromPrevious);
    }
  });

  it("does not synthesize an airport→hotel leg when no arrival anchor is present", async () => {
    // Counter-regression: a normal mid-trip day with a hotel startPoint but
    // no arrival anchor should NOT produce a synthetic airport→hotel
    // segment. The synthetic pair is gated on the first place activity being
    // an arrival anchor.
    mockRequestRoute.mockImplementation((request: RoutingRequest) => {
      switch (request.mode) {
        case "walk":
        case "walking":
          return Promise.resolve(buildRoute("walk", 1800));
        case "transit":
          return Promise.resolve(buildRoute("transit", 1200, "Take transit to destination"));
        default:
          return Promise.resolve(buildRoute(request.mode, 1400));
      }
    });

    const itinerary = createTestItinerary();
    const dayId = itinerary.days[0]!.id;

    // Hotel set but the day starts with a regular (non-anchor) place.
    const hotelCoords = { lat: 35.0050, lng: 135.7600 };
    const result = await planItinerary(
      itinerary,
      { defaultDayStart: "08:00", transitionBufferMinutes: 10 },
      { [dayId!]: { startPoint: { coordinates: hotelCoords } } },
    );

    const [first] = result.days[0]!.activities;

    // First activity is a regular place; it has travelFromPrevious (hotel→
    // first) but the anchor branch never fires, so no synthetic leg exists.
    expect(first?.kind).toBe("place");
    if (first?.kind === "place") {
      expect(first.isAnchor).toBeUndefined();
      // travelFromPrevious is the regular hotel→stop1 leg (transit 20 min).
      expect(first.travelFromPrevious?.mode).toBe("train");
      expect(first.travelFromPrevious?.durationMinutes).toBe(20);
      // No anchor → no synthetic airport→hotel chain. Schedule arrival aligns
      // with day start + travel duration (not + 60-min skyliner transit).
      expect(first.schedule?.arrivalTime).toBe("08:20");
    }
  });

  it("keeps walking mode when the walk is short", async () => {
    // Return short distance (<1km) so transit lookup is NOT triggered
    mockRequestRoute.mockImplementation((request: RoutingRequest) => {
      return Promise.resolve({
        ...buildRoute(request.mode, 480),
        distanceMeters: 800, // 0.8km — below TRANSIT_DISTANCE_THRESHOLD_KM
      });
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

describe("parseEstimatedDuration", () => {
  // Import the function directly since it's exported for testing
  let parseEstimatedDuration: (text?: string | null) => number | null;

  beforeEach(async () => {
    const mod = await import("../itineraryPlanner");
    parseEstimatedDuration = mod.parseEstimatedDuration;
  });

  it("parses bare integer as minutes", () => {
    expect(parseEstimatedDuration("90")).toBe(90);
    expect(parseEstimatedDuration("45")).toBe(45);
    expect(parseEstimatedDuration("120")).toBe(120);
    expect(parseEstimatedDuration("15")).toBe(15);
  });

  it("parses hours format", () => {
    expect(parseEstimatedDuration("2 hours")).toBe(120);
    expect(parseEstimatedDuration("1.5 hr")).toBe(90);
  });

  it("parses minutes format", () => {
    expect(parseEstimatedDuration("45 min")).toBe(45);
    expect(parseEstimatedDuration("30 minutes")).toBe(30);
  });

  it("returns null for empty/null", () => {
    expect(parseEstimatedDuration("")).toBeNull();
    expect(parseEstimatedDuration(null)).toBeNull();
    expect(parseEstimatedDuration(undefined)).toBeNull();
  });

  it("returns null for non-numeric text", () => {
    expect(parseEstimatedDuration("varies")).toBeNull();
  });

  it("rejects zero and negative", () => {
    expect(parseEstimatedDuration("0")).toBeNull();
  });
});


