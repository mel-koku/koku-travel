import { describe, it, expect } from "vitest";
import { resolveFocusDay, tokyoDateString } from "@/lib/itinerary/useFocusDay";

describe("tokyoDateString", () => {
  it("returns YYYY-MM-DD format", () => {
    const result = tokyoDateString(new Date("2026-04-23T00:00:00Z"));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("handles Asia/Tokyo offset correctly for a known date", () => {
    // 2026-04-23T15:00:00Z is 2026-04-24T00:00:00+09:00
    expect(tokyoDateString(new Date("2026-04-23T15:00:00Z"))).toBe("2026-04-24");
    // 2026-04-23T14:59:00Z is still 2026-04-23T23:59:00+09:00
    expect(tokyoDateString(new Date("2026-04-23T14:59:00Z"))).toBe("2026-04-23");
  });
});

describe("resolveFocusDay", () => {
  const days = [
    { id: "d0", date: "2026-04-21" },
    { id: "d1", date: "2026-04-22" },
    { id: "d2", date: "2026-04-23" },
    { id: "d3", date: "2026-04-24" },
  ];

  it("returns today's index with day-of mode on when today matches a day", () => {
    expect(resolveFocusDay(days, "2026-04-22")).toEqual({
      index: 1,
      isDayOfMode: true,
    });
  });

  it("returns nearest upcoming when today is before the trip", () => {
    expect(resolveFocusDay(days, "2026-04-20")).toEqual({
      index: 0,
      isDayOfMode: false,
    });
  });

  it("returns chapter 1 when trip is fully in the past", () => {
    expect(resolveFocusDay(days, "2026-05-01")).toEqual({
      index: 0,
      isDayOfMode: false,
    });
  });

  it("returns index 0 on an empty days array without throwing", () => {
    expect(resolveFocusDay([], "2026-04-22")).toEqual({
      index: 0,
      isDayOfMode: false,
    });
  });
});
