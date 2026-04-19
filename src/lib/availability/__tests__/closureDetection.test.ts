import { describe, it, expect } from "vitest";
import { getClosuresForTripDate } from "@/lib/availability/closureDetection";
import type { Location, LocationOperatingHours } from "@/types/location";

const stop = (id: string, operatingHours?: LocationOperatingHours): Pick<Location, "id" | "operatingHours"> => ({
  id,
  operatingHours,
});

const hours = (periods: Array<{ day: string; open?: string; close?: string; isOvernight?: boolean }>): LocationOperatingHours => ({
  timezone: "Asia/Tokyo",
  periods: periods.map((p) => ({
    day: p.day as LocationOperatingHours["periods"][number]["day"],
    open: p.open ?? "09:00",
    close: p.close ?? "17:00",
    isOvernight: p.isOvernight,
  })),
});

describe("getClosuresForTripDate", () => {
  it("returns empty array when operatingHours is undefined (hours-unknown fallback)", () => {
    const stops = [stop("a")];
    const result = getClosuresForTripDate(stops, new Date("2026-04-23T00:00:00+09:00"));
    expect(result).toEqual([]);
  });

  it("returns empty array when periods array is empty (hours-unknown fallback)", () => {
    const stops = [stop("a", hours([]))];
    const result = getClosuresForTripDate(stops, new Date("2026-04-23T00:00:00+09:00"));
    expect(result).toEqual([]);
  });

  it("flags a stop as closed when its weekday has no period (2026-04-23 is Thursday)", () => {
    // Thursday is ABSENT from the periods array → closed
    const stops = [
      stop("a", hours([
        { day: "monday" },
        { day: "tuesday" },
        { day: "wednesday" },
        { day: "friday" },
        { day: "saturday" },
        { day: "sunday" },
      ])),
    ];
    const result = getClosuresForTripDate(stops, new Date("2026-04-23T00:00:00+09:00"));
    expect(result).toEqual([{ stopId: "a", reason: "weekly-closure" }]);
  });

  it("does not flag a stop when a period exists for the weekday", () => {
    const stops = [
      stop("a", hours([{ day: "thursday", open: "09:00", close: "17:00" }])),
    ];
    const result = getClosuresForTripDate(stops, new Date("2026-04-23T00:00:00+09:00"));
    expect(result).toEqual([]);
  });

  it("returns multiple closures when multiple stops are closed on the date", () => {
    const stops = [
      stop("a", hours([{ day: "monday" }])),
      stop("b", hours([{ day: "monday" }])),
    ];
    const result = getClosuresForTripDate(stops, new Date("2026-04-23T00:00:00+09:00"));
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.stopId).sort()).toEqual(["a", "b"]);
  });

  it("treats only-unused-days-present hours as hours-unknown (periods exist but none map to the date)", () => {
    // If a stop has periods but they are clearly partial (only one day), we should
    // still flag it as closed on the absent weekday — that is what closure means.
    // The hours-unknown fallback is for `undefined` or empty arrays, not for partial.
    // This test locks the rule.
    const stops = [stop("a", hours([{ day: "sunday" }]))];
    // 2026-04-23 is Thursday; Sunday-only hours → closed on Thursday.
    const result = getClosuresForTripDate(stops, new Date("2026-04-23T00:00:00+09:00"));
    expect(result).toEqual([{ stopId: "a", reason: "weekly-closure" }]);
  });
});
