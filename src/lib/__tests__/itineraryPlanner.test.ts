import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Itinerary } from "@/types/itinerary";
import type { RoutingRequest } from "../routing/types";
import { planItinerary } from "../itineraryPlanner";

const mockRequestRoute = vi.fn();

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
    mockRequestRoute.mockImplementation((request: RoutingRequest) => {
      switch (request.mode) {
        case "walk":
          return Promise.resolve(buildRoute("walk", 1800));
        case "transit":
          return Promise.resolve(buildRoute("transit", 1200));
        case "bus":
          return Promise.resolve(buildRoute("bus", 1500));
        case "train":
          return Promise.resolve(buildRoute("train", 900, "Take JR Nara Line toward Kyoto Station"));
        case "subway":
          return Promise.resolve(buildRoute("subway", 1100));
        case "tram":
          return Promise.resolve(buildRoute("tram", 1300));
        default:
          return Promise.resolve(buildRoute(request.mode, 1400));
      }
    });

    const itinerary = createTestItinerary();

    const result = await planItinerary(itinerary, {
      defaultDayStart: "08:00",
      transitionBufferMinutes: 10,
    });

    expect(mockRequestRoute).toHaveBeenCalledTimes(6);
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
      expect(secondActivity.travelFromPrevious?.mode).toBe("train");
      expect(secondActivity.travelFromPrevious?.departureTime).toBe("10:10");
      expect(secondActivity.travelFromPrevious?.arrivalTime).toBe("10:25");
      expect(secondActivity.travelFromPrevious?.instructions).toEqual([
        "Take JR Nara Line toward Kyoto Station",
      ]);
      expect(secondActivity.schedule?.arrivalTime).toBe("10:25");
      expect(secondActivity.schedule?.departureTime).toBe("11:55");
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


