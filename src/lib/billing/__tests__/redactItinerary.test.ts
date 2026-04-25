import { describe, it, expect } from "vitest";
import { redactItineraryForLockedDays } from "@/lib/billing/redactItinerary";
import type { Itinerary } from "@/types/itinerary";
import type { Trip } from "@/types/tripDomain";
import type { GeneratedGuide, GeneratedBriefings } from "@/types/llmConstraints";

function makeItinerary(): Itinerary {
  return {
    days: [
      {
        id: "day-1",
        dateLabel: "Day 1 (Tokyo)",
        cityId: "tokyo",
        activities: [
          {
            kind: "place",
            id: "act-1",
            locationId: "loc-1",
            title: "Senso-ji",
            time: { startTime: "09:00", endTime: "10:00" },
            duration: 60,
          },
        ],
      },
      {
        id: "day-2",
        dateLabel: "Day 2 (Kyoto)",
        cityId: "kyoto",
        cityTransition: { from: "tokyo", to: "kyoto", mode: "transit", durationMinutes: 140 },
        activities: [
          {
            kind: "place",
            id: "act-2",
            locationId: "loc-2",
            title: "Kinkaku-ji",
            time: { startTime: "10:00", endTime: "11:00" },
            duration: 60,
          },
        ],
      },
      {
        id: "day-3",
        dateLabel: "Day 3 (Kyoto)",
        cityId: "kyoto",
        activities: [
          {
            kind: "place",
            id: "act-3",
            locationId: "loc-3",
            title: "Fushimi Inari",
            time: { startTime: "08:00", endTime: "09:30" },
            duration: 90,
          },
        ],
      },
    ],
  } as unknown as Itinerary;
}

function makeTrip(): Trip {
  return {
    id: "trip-1",
    travelerProfile: { interests: ["culture"] },
    dates: { start: "2027-04-01", end: "2027-04-03" },
    regions: [],
    cities: ["tokyo", "kyoto"],
    status: "planning",
    days: [
      { id: "day-1", date: "2027-04-01", cityId: "tokyo", activities: [{ id: "act-1" } as never] },
      { id: "day-2", date: "2027-04-02", cityId: "kyoto", activities: [{ id: "act-2" } as never] },
      { id: "day-3", date: "2027-04-03", cityId: "kyoto", activities: [{ id: "act-3" } as never] },
    ],
  } as unknown as Trip;
}

function makeGuideProse(): GeneratedGuide {
  return {
    tripOverview: "A whirlwind tour.",
    days: [
      { dayId: "day-1", intro: "Land in Tokyo.", transitions: [], summary: "Day 1 summary." },
      { dayId: "day-2", intro: "Bullet to Kyoto.", transitions: [], summary: "Day 2 summary." },
      { dayId: "day-3", intro: "Temples east.", transitions: [], summary: "Day 3 summary." },
    ],
  };
}

function makeBriefings(): GeneratedBriefings {
  return {
    days: [
      { dayId: "day-1", briefing: "Sunny, 18C." },
      { dayId: "day-2", briefing: "Plum blossoms peaking." },
      { dayId: "day-3", briefing: "Cooler, dress warmly." },
    ],
  };
}

describe("redactItineraryForLockedDays", () => {
  it("keeps Day 1 intact and strips activities + transitions on Day 2-N", () => {
    const result = redactItineraryForLockedDays({
      itinerary: makeItinerary(),
      trip: makeTrip(),
      dayIntros: { "day-1": "Land in Tokyo.", "day-2": "Bullet to Kyoto.", "day-3": "Temples east." },
      guideProse: makeGuideProse(),
      dailyBriefings: makeBriefings(),
    });

    expect(result.itinerary.days).toHaveLength(3);
    expect(result.itinerary.days[0].activities).toHaveLength(1);
    expect(result.itinerary.days[0].id).toBe("day-1");
    // No leak of Day 2-N detail in either itinerary or trip:
    expect(result.itinerary.days[1].activities).toHaveLength(0);
    expect(result.itinerary.days[1].isLocked).toBe(true);
    expect(result.itinerary.days[1]).not.toHaveProperty("cityTransition");
    expect(result.itinerary.days[2].activities).toHaveLength(0);
    expect(result.itinerary.days[2].isLocked).toBe(true);
    // Day shell preserved — UnlockBeat needs cityId/dateLabel
    expect(result.itinerary.days[1].cityId).toBe("kyoto");
    expect(result.itinerary.days[1].dateLabel).toBe("Day 2 (Kyoto)");

    expect(result.trip.days[1].activities).toHaveLength(0);
    expect(result.trip.days[1].isLocked).toBe(true);
    expect(result.trip.days[2].activities).toHaveLength(0);
  });

  it("strips per-day prose + briefings + intros for locked days only", () => {
    const result = redactItineraryForLockedDays({
      itinerary: makeItinerary(),
      trip: makeTrip(),
      dayIntros: { "day-1": "Land in Tokyo.", "day-2": "Bullet to Kyoto.", "day-3": "Temples east." },
      guideProse: makeGuideProse(),
      dailyBriefings: makeBriefings(),
    });

    expect(result.dayIntros).toEqual({ "day-1": "Land in Tokyo." });
    expect(result.guideProse?.days).toHaveLength(1);
    expect(result.guideProse?.days[0]?.dayId).toBe("day-1");
    // tripOverview is global trip-level prose — keep it (it doesn't reveal day plans).
    expect(result.guideProse?.tripOverview).toBe("A whirlwind tour.");
    expect(result.dailyBriefings?.days).toHaveLength(1);
    expect(result.dailyBriefings?.days[0]?.dayId).toBe("day-1");
  });

  it("is a no-op for 1-day trips (nothing to lock)", () => {
    const oneDay: Itinerary = {
      days: [
        {
          id: "day-1",
          activities: [{ kind: "place", id: "a", locationId: "l" } as never],
        },
      ],
    } as unknown as Itinerary;
    const oneDayTrip: Trip = {
      ...makeTrip(),
      days: [{ id: "day-1", date: "2027-04-01", cityId: "tokyo", activities: [] as never }],
    } as unknown as Trip;
    const result = redactItineraryForLockedDays({
      itinerary: oneDay,
      trip: oneDayTrip,
      dayIntros: { "day-1": "Tokyo." },
      guideProse: null,
      dailyBriefings: null,
    });
    expect(result.itinerary).toBe(oneDay);
    expect(result.trip).toBe(oneDayTrip);
    expect(result.dayIntros).toEqual({ "day-1": "Tokyo." });
  });

  it("handles missing optional inputs", () => {
    const result = redactItineraryForLockedDays({
      itinerary: makeItinerary(),
      trip: makeTrip(),
    });
    expect(result.dayIntros).toBeNull();
    expect(result.guideProse).toBeNull();
    expect(result.dailyBriefings).toBeNull();
    expect(result.itinerary.days[1].isLocked).toBe(true);
  });
});
