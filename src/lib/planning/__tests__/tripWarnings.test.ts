import { describe, it, expect } from "vitest";
import { detectPlanningWarnings } from "../tripWarnings";
import { _testables } from "../tripWarnings";
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

describe("near-miss copy builders", () => {
  const fakeFixed = {
    festival: {
      id: "gion-matsuri",
      name: "Gion Matsuri",
      nameJa: "祇園祭",
      city: "kyoto",
      startMonth: 7, startDay: 1, endMonth: 7, endDay: 31,
      crowdImpact: 5 as const,
      category: "matsuri" as const,
      description: "",
    },
    direction: "forward" as const,
    gapDays: 2,
  };

  const fakeApprox = {
    festival: {
      id: "sakura-tokyo",
      name: "Cherry Blossom Peak (Tokyo)",
      nameJa: "桜（東京）",
      city: "tokyo",
      startMonth: 3, startDay: 25, endMonth: 4, endDay: 5,
      crowdImpact: 4 as const,
      category: "seasonal" as const,
      description: "",
      isApproximate: true,
    },
    direction: "forward" as const,
    gapDays: 3,
  };

  it("forward fixed-date title uses 'starts right after' phrasing", () => {
    expect(_testables.buildNearMissTitle(fakeFixed)).toBe(
      "Gion Matsuri starts right after your trip"
    );
  });

  it("forward fixed-date message names the centerpiece", () => {
    const msg = _testables.buildNearMissMessage(fakeFixed, false);
    expect(msg).toBe("It begins 2 days after your trip ends. Adding 2 days would catch the float procession.");
  });

  it("forward over-cap message drops the extend offer", () => {
    const msg = _testables.buildNearMissMessage(fakeFixed, true);
    expect(msg).toBe("It begins 2 days after your trip ends. Worth knowing if you can shift dates.");
  });

  it("singular pluralization for gapDays=1", () => {
    const single = { ...fakeFixed, gapDays: 1 };
    const msg = _testables.buildNearMissMessage(single, false);
    expect(msg).toBe("It begins 1 day after your trip ends. Adding 1 day would catch the float procession.");
  });

  it("backward fixed-date title uses 'wraps just before'", () => {
    const back = { ...fakeFixed, direction: "backward" as const, gapDays: 1 };
    expect(_testables.buildNearMissTitle(back)).toBe(
      "Gion Matsuri wraps just before you arrive"
    );
  });

  it("backward fixed-date singular-day copy uses 'the day'", () => {
    const back = { ...fakeFixed, direction: "backward" as const, gapDays: 1 };
    const msg = _testables.buildNearMissMessage(back, false);
    expect(msg).toBe("It ended the day before you arrive. Worth knowing if you can still shift your start date.");
  });

  it("approximate forward title uses 'happens around this time'", () => {
    expect(_testables.buildNearMissTitle(fakeApprox)).toBe(
      "Cherry Blossom Peak (Tokyo) happens around this time"
    );
  });

  it("approximate forward message includes a rough window", () => {
    const msg = _testables.buildNearMissMessage(fakeApprox, false);
    expect(msg).toBe(
      "Cherry Blossom Peak (Tokyo) typically falls in late March. Exact dates vary year to year, so check forecasts closer to your trip."
    );
  });

  it("centerpiece falls back to category default when no override exists", () => {
    const generic = {
      ...fakeFixed,
      festival: { ...fakeFixed.festival, id: "fictional-matsuri" as never },
    };
    const msg = _testables.buildNearMissMessage(generic, false);
    expect(msg).toContain("would catch the main day");
  });

  it("awa-odori uses dance override (not unsafe matsuri default)", () => {
    const awa = {
      ...fakeFixed,
      festival: { ...fakeFixed.festival, id: "awa-odori" as never, name: "Awa Odori" },
    };
    const msg = _testables.buildNearMissMessage(awa, false);
    expect(msg).toContain("would catch the dance");
    expect(msg).not.toContain("float procession");
  });
});

describe("detectPlanningWarnings — festival near-miss (C10)", () => {
  it("returns no near-miss warnings when no near-miss festival exists", () => {
    const data = makeTripData({
      cities: ["tokyo"],
      regions: ["kanto"],
      dates: { start: "2026-09-01", end: "2026-09-07" },
    });
    const warnings = detectPlanningWarnings(data);
    expect(warnings.find((w) => w.type === "festival_near_miss")).toBeUndefined();
  });

  it("returns at most one near-miss warning per trip", () => {
    const data = makeTripData({
      cities: ["kyoto"],
      regions: ["kansai"],
      dates: { start: "2026-05-09", end: "2026-05-12" },
    });
    const warnings = detectPlanningWarnings(data);
    const nm = warnings.filter((w) => w.type === "festival_near_miss");
    expect(nm.length).toBeLessThanOrEqual(1);
  });

  it("forward fixed-date within cap sets action='extend_trip' and actionData", () => {
    // Tenjin Matsuri (osaka) Jul 24-25. Trip Jul 18-22 (5d) → forward gap 2.
    const data = makeTripData({
      cities: ["osaka"],
      regions: ["kansai"],
      duration: 5,
      dates: { start: "2026-07-18", end: "2026-07-22" },
    });
    const warnings = detectPlanningWarnings(data);
    const nm = warnings.find((w) => w.type === "festival_near_miss");
    expect(nm).toBeDefined();
    expect(nm?.action).toBe("extend_trip");
    expect(nm?.actionData?.extendDays).toBe(2);
    expect(nm?.actionData?.newEndDate).toBe("2026-07-24");
    expect(nm?.actionData?.festivalId).toBe("tenjin-matsuri");
  });

  it("forward over duration cap (21) drops action and uses over-cap copy", () => {
    // Trip duration 20, gap 2 → would push to 22, over cap.
    const data = makeTripData({
      cities: ["osaka"],
      regions: ["kansai"],
      duration: 20,
      dates: { start: "2026-07-03", end: "2026-07-22" },
    });
    const warnings = detectPlanningWarnings(data);
    const nm = warnings.find((w) => w.type === "festival_near_miss");
    expect(nm).toBeDefined();
    expect(nm?.action).toBeUndefined();
    expect(nm?.actionData).toBeUndefined();
    expect(nm?.message).toContain("Worth knowing if you can shift dates");
  });

  it("backward fixed-date returns warning with no action", () => {
    // Aoi Matsuri (kyoto) May 15. Trip May 17-22 → backward gap 2.
    const data = makeTripData({
      cities: ["kyoto"],
      regions: ["kansai"],
      dates: { start: "2026-05-17", end: "2026-05-22" },
    });
    const warnings = detectPlanningWarnings(data);
    const nm = warnings.find((w) => w.type === "festival_near_miss");
    expect(nm).toBeDefined();
    expect(nm?.action).toBeUndefined();
    expect(nm?.title).toContain("wraps just before you arrive");
  });

  it("approximate festival returns warning with no action and rough window in message", () => {
    // Cherry Blossom Peak Tokyo (Mar 25 - Apr 5, isApproximate).
    // Trip ends Mar 22 → forward gap 3 from start (Mar 25).
    const data = makeTripData({
      cities: ["tokyo"],
      regions: ["kanto"],
      dates: { start: "2026-03-17", end: "2026-03-22" },
    });
    const warnings = detectPlanningWarnings(data);
    const nm = warnings.find((w) => w.type === "festival_near_miss");
    expect(nm).toBeDefined();
    expect(nm?.action).toBeUndefined();
    expect(nm?.message).toContain("late March");
  });

  it("returns no warning when dates are missing", () => {
    const data = makeTripData({
      cities: ["kyoto"],
      regions: ["kansai"],
      dates: { start: "", end: "" },
    });
    const warnings = detectPlanningWarnings(data);
    expect(warnings.find((w) => w.type === "festival_near_miss")).toBeUndefined();
  });

  it("over-cap detection works without an explicit duration field (uses date math)", () => {
    // Trip Jul 3 - Jul 22 = 20 days. Tenjin Matsuri Jul 24-25 → forward gap 2.
    // 20 + 2 = 22, over the 21-day cap. Should drop action.
    const data = makeTripData({
      cities: ["osaka"],
      regions: ["kansai"],
      duration: undefined as unknown as number, // simulate a trip without a set duration field
      dates: { start: "2026-07-03", end: "2026-07-22" },
    });
    const warnings = detectPlanningWarnings(data);
    const nm = warnings.find((w) => w.type === "festival_near_miss");
    expect(nm).toBeDefined();
    expect(nm?.action).toBeUndefined();
    expect(nm?.actionData).toBeUndefined();
  });
});
