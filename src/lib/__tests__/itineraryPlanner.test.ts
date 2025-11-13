import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Itinerary } from "@/types/itinerary";
import { planItinerary } from "../itineraryPlanner";

const mockRequestRoute = vi.fn();

vi.mock("../routing", () => ({
  requestRoute: (request: unknown) => mockRequestRoute(request),
}));

beforeEach(() => {
  mockRequestRoute.mockReset();
  mockRequestRoute.mockResolvedValue({
    provider: "mock",
    mode: "train",
    durationSeconds: 1200,
    distanceMeters: 7800,
    legs: [
      {
        mode: "train",
        durationSeconds: 1200,
        distanceMeters: 7800,
        summary: "JR Nara Line",
        steps: [{ instruction: "Take JR Nara Line toward Kyoto Station" }],
      },
    ],
    warnings: [],
    fetchedAt: new Date().toISOString(),
  });
});

describe("planItinerary", () => {
  it("injects travel segments and schedules visits against opening hours", async () => {
    const itinerary: Itinerary = {
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
    };

    const result = await planItinerary(itinerary, {
      defaultDayStart: "08:00",
      transitionBufferMinutes: 10,
    });

    expect(mockRequestRoute).toHaveBeenCalledTimes(1);
    const plannedDay = result.days[0];
    const [firstActivity, secondActivity] = plannedDay.activities;

    expect(firstActivity.kind).toBe("place");
    expect(firstActivity.schedule?.arrivalTime).toBe("08:00");
    expect(firstActivity.schedule?.departureTime).toBe("10:00");
    expect(firstActivity.schedule?.operatingWindow?.status).toBe("within");

    expect(secondActivity.kind).toBe("place");
    expect(secondActivity.travelFromPrevious?.mode).toBe("train");
    expect(secondActivity.travelFromPrevious?.departureTime).toBe("10:10");
    expect(secondActivity.travelFromPrevious?.arrivalTime).toBe("10:30");
    expect(secondActivity.travelFromPrevious?.instructions).toEqual([
      "Take JR Nara Line toward Kyoto Station",
    ]);
    expect(secondActivity.schedule?.arrivalTime).toBe("10:30");
    expect(secondActivity.schedule?.departureTime).toBe("12:00");
    expect(secondActivity.schedule?.status).toBe("scheduled");
  });
});


