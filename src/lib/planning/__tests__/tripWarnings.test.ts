import { describe, it, expect } from "vitest";
import { detectPlanningWarnings } from "../tripWarnings";
import type { TripBuilderData } from "@/types/trip";

function makeTripData(overrides: Partial<TripBuilderData>): TripBuilderData {
  return {
    duration: 7,
    cities: ["sapporo"],
    regions: ["hokkaido"],
    dates: { start: "2026-06-15", end: "2026-06-21" },
    vibes: [],
    pace: "moderate",
    groupType: "couple",
    sameAsEntry: true,
    ...overrides,
  } as TripBuilderData;
}

describe("detectPlanningWarnings — region-aware seasons", () => {
  it("does NOT warn about rainy season for Hokkaido in June", () => {
    const data = makeTripData({ cities: ["sapporo"], regions: ["hokkaido"] });
    const warnings = detectPlanningWarnings(data);
    expect(warnings.find((w) => w.type === "seasonal_rainy")).toBeUndefined();
  });

  it("DOES warn about rainy season for Tokyo in June", () => {
    const data = makeTripData({ cities: ["tokyo"], regions: ["kanto"] });
    const warnings = detectPlanningWarnings(data);
    expect(warnings.find((w) => w.type === "seasonal_rainy")).toBeDefined();
  });

  it("warns about Okinawa cherry blossoms in early February", () => {
    const data = makeTripData({
      cities: ["naha"],
      regions: ["okinawa"],
      dates: { start: "2026-02-05", end: "2026-02-10" },
    });
    const warnings = detectPlanningWarnings(data);
    expect(warnings.find((w) => w.type === "seasonal_cherry_blossom")).toBeDefined();
  });

  it("does NOT warn about cherry blossoms for Hokkaido in late March (too early)", () => {
    const data = makeTripData({
      cities: ["sapporo"],
      regions: ["hokkaido"],
      dates: { start: "2026-03-25", end: "2026-04-01" },
    });
    const warnings = detectPlanningWarnings(data);
    expect(warnings.find((w) => w.type === "seasonal_cherry_blossom")).toBeUndefined();
  });

  it("DOES warn about cherry blossoms for Hokkaido in early May", () => {
    const data = makeTripData({
      cities: ["sapporo"],
      regions: ["hokkaido"],
      dates: { start: "2026-05-01", end: "2026-05-08" },
    });
    const warnings = detectPlanningWarnings(data);
    expect(warnings.find((w) => w.type === "seasonal_cherry_blossom")).toBeDefined();
  });
});
