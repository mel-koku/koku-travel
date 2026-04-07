import { describe, it, expect, vi } from "vitest";

// Mock external dependencies before importing the module under test
vi.mock("@/lib/locations/locationService", () => ({
  fetchLocationsByCity: vi.fn().mockResolvedValue([]),
  fetchLocationsByCategories: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/scoring/locationScoring", () => ({
  scoreLocation: vi.fn().mockReturnValue({
    score: 50,
    location: { id: "test", name: "Test" },
    breakdown: {},
    reasoning: [],
  }),
}));

import { getAvailableMinutesForDay, refineDay } from "../refinementEngine";
import type { Trip, TripDay, TripActivity } from "@/types/tripDomain";

vi.mock("server-only", () => ({}));

function makeDay(activities: Partial<TripActivity>[]): TripDay {
  return {
    id: "day-1",
    date: "2026-04-07",
    cityId: "osaka",
    activities: activities.map((a, i) => ({
      id: a.id ?? `act-${i}`,
      locationId: a.locationId ?? `loc-${i}`,
      timeSlot: a.timeSlot ?? "morning",
      duration: a.duration ?? 90,
      ...a,
    })) as TripActivity[],
  };
}

describe("getAvailableMinutesForDay", () => {
  it("returns full day window for empty day", () => {
    const day = makeDay([]);
    expect(getAvailableMinutesForDay(day)).toBe(720);
  });

  it("subtracts activity durations from available time", () => {
    const day = makeDay([
      { duration: 90 },
      { duration: 60 },
    ]);
    // 720 - 90 - 60 - 15 (one buffer) = 555
    expect(getAvailableMinutesForDay(day)).toBe(555);
  });

  it("uses anchor startTime/endTime when available", () => {
    const day = makeDay([
      { id: "anchor-arrival", isAnchor: true, startTime: "10:00", endTime: "12:30", duration: 90 },
      { duration: 60 },
    ]);
    // Anchor: 150 min from times (ignores duration=90)
    // Regular: 60 min
    // 1 buffer: 15 min
    // 720 - 150 - 60 - 15 = 495
    expect(getAvailableMinutesForDay(day)).toBe(495);
  });

  it("falls back to duration when anchor has no startTime/endTime", () => {
    const day = makeDay([
      { id: "anchor-arrival", isAnchor: true, duration: 120 },
      { duration: 60 },
    ]);
    // 720 - 120 - 60 - 15 = 525
    expect(getAvailableMinutesForDay(day)).toBe(525);
  });

  it("defaults activity duration to 90 when missing", () => {
    const day = makeDay([
      { duration: undefined as unknown as number },
    ]);
    // 720 - 90 = 630 (no buffer for single activity)
    expect(getAvailableMinutesForDay(day)).toBe(630);
  });

  it("returns 0 when day is overscheduled", () => {
    const day = makeDay([
      { duration: 300 },
      { duration: 300 },
      { duration: 200 },
    ]);
    // 720 - 300 - 300 - 200 - 30 = -110 -> clamped to 0
    expect(getAvailableMinutesForDay(day)).toBe(0);
  });

  it("accounts for transition buffer between each pair of activities", () => {
    const day = makeDay([
      { duration: 60 },
      { duration: 60 },
      { duration: 60 },
    ]);
    // 720 - 60 - 60 - 60 - 30 (2 buffers) = 510
    expect(getAvailableMinutesForDay(day)).toBe(510);
  });
});

function makeTrip(activities: Partial<TripActivity>[]): Trip {
  return {
    id: "trip-1",
    days: [makeDay(activities)],
    travelerProfile: {
      interests: ["culture"],
      pace: "balanced",
      budget: { level: "moderate" },
      mobility: { required: false },
      group: { type: "solo" },
    },
  } as Trip;
}

describe("refinement capacity check", () => {
  it("returns fully-scheduled message when too_light is requested on packed day", async () => {
    const trip = makeTrip([
      { id: "anchor-arrival", isAnchor: true, startTime: "09:00", endTime: "12:00", duration: 180 },
      { duration: 180 },
      { duration: 180 },
      { id: "anchor-departure", isAnchor: true, startTime: "19:00", endTime: "21:00", duration: 120 },
    ]);

    const result = await refineDay({ trip, dayIndex: 0, type: "too_light" });
    expect(result.message).toContain("fully scheduled");
  });

  it("returns fully-scheduled message when more_food is requested on packed day", async () => {
    const trip = makeTrip([
      { id: "anchor-arrival", isAnchor: true, startTime: "09:00", endTime: "12:00", duration: 180 },
      { duration: 180 },
      { duration: 180 },
      { id: "anchor-departure", isAnchor: true, startTime: "19:00", endTime: "21:00", duration: 120 },
    ]);

    const result = await refineDay({ trip, dayIndex: 0, type: "more_food" });
    expect(result.message).toContain("fully scheduled");
  });

  it("returns fully-scheduled message when more_culture is requested on packed day", async () => {
    const trip = makeTrip([
      { id: "anchor-arrival", isAnchor: true, startTime: "09:00", endTime: "12:00", duration: 180 },
      { duration: 180 },
      { duration: 180 },
      { id: "anchor-departure", isAnchor: true, startTime: "19:00", endTime: "21:00", duration: 120 },
    ]);

    const result = await refineDay({ trip, dayIndex: 0, type: "more_culture" });
    expect(result.message).toContain("fully scheduled");
  });

  it("returns fully-scheduled message when more_craft is requested on packed day", async () => {
    const trip = makeTrip([
      { id: "anchor-arrival", isAnchor: true, startTime: "09:00", endTime: "12:00", duration: 180 },
      { duration: 180 },
      { duration: 180 },
      { id: "anchor-departure", isAnchor: true, startTime: "19:00", endTime: "21:00", duration: 120 },
    ]);

    const result = await refineDay({ trip, dayIndex: 0, type: "more_craft" });
    expect(result.message).toContain("fully scheduled");
  });

  it("does NOT return fully-scheduled for too_busy on packed day (it removes)", async () => {
    const trip = makeTrip([
      { duration: 180 },
      { duration: 180 },
      { duration: 180 },
      { duration: 180 },
    ]);

    const result = await refineDay({ trip, dayIndex: 0, type: "too_busy" });
    expect(result.message ?? "").not.toContain("fully scheduled");
  });
});
