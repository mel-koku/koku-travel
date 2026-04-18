import { describe, it, expect, vi } from "vitest";
import {
  createTestItinerary,
  createTestItineraryDay,
  createTestPlaceActivity,
  createTestTravelSegment,
} from "../../fixtures/itinerary";
import { getTripLevelTips } from "@/lib/tips/tripLevelTips";

// Mock dependencies
vi.mock("@/data/crowdPatterns", () => ({
  getActiveHolidays: vi.fn().mockReturnValue([]),
}));
vi.mock("@/data/seasonalFoods", () => ({
  getSeasonalFoods: vi.fn().mockReturnValue([]),
  formatSeasonalFoodTip: vi.fn().mockReturnValue("seasonal food tip"),
}));

const { getActiveHolidays } = await import("@/data/crowdPatterns");
const { getSeasonalFoods } = await import("@/data/seasonalFoods");

describe("getTripLevelTips", () => {
  it("returns IC card and escalator tips when trip has meaningful transit (3+ legs)", () => {
    // IC card requires 3+ transit legs to justify the setup effort; escalator
    // etiquette fires on any transit since it's relevant in any station.
    const itinerary = createTestItinerary({
      days: [
        createTestItineraryDay({
          activities: [
            createTestPlaceActivity({
              id: "a1",
              travelFromPrevious: createTestTravelSegment({ mode: "transit" }),
            }),
            createTestPlaceActivity({
              id: "a2",
              travelFromPrevious: createTestTravelSegment({ mode: "subway" }),
            }),
            createTestPlaceActivity({
              id: "a3",
              travelFromPrevious: createTestTravelSegment({ mode: "bus" }),
            }),
          ],
        }),
      ],
    });

    const tips = getTripLevelTips(itinerary);
    const ids = tips.map((t) => t.id);
    expect(ids).toContain("trip-ic-card");
    expect(ids).toContain("trip-escalator");
  });

  it("does NOT return IC card tip for a single transit leg (noise reduction, A9)", () => {
    const itinerary = createTestItinerary({
      days: [
        createTestItineraryDay({
          activities: [
            createTestPlaceActivity({
              travelFromPrevious: createTestTravelSegment({ mode: "transit" }),
            }),
          ],
        }),
      ],
    });

    const tips = getTripLevelTips(itinerary);
    const ids = tips.map((t) => t.id);
    expect(ids).not.toContain("trip-ic-card");
    // Escalator etiquette should still fire since the traveler is in a station.
    expect(ids).toContain("trip-escalator");
  });

  it("excludes IC card and escalator when no transit", () => {
    const itinerary = createTestItinerary({
      days: [
        createTestItineraryDay({
          activities: [
            createTestPlaceActivity({
              travelFromPrevious: createTestTravelSegment({ mode: "walk" }),
            }),
          ],
        }),
      ],
    });

    const tips = getTripLevelTips(itinerary);
    const ids = tips.map((t) => t.id);
    expect(ids).not.toContain("trip-ic-card");
    expect(ids).not.toContain("trip-escalator");
  });

  it("includes goshuin tip when trip has temples", () => {
    const itinerary = createTestItinerary({
      days: [
        createTestItineraryDay({
          activities: [
            createTestPlaceActivity({ tags: ["temple"] }),
          ],
        }),
      ],
    });

    const tips = getTripLevelTips(itinerary);
    expect(tips.map((t) => t.id)).toContain("trip-goshuin");
  });

  it("excludes goshuin tip when no temples or shrines", () => {
    const itinerary = createTestItinerary({
      days: [
        createTestItineraryDay({
          activities: [
            createTestPlaceActivity({ tags: ["restaurant"] }),
          ],
        }),
      ],
    });

    const tips = getTripLevelTips(itinerary);
    expect(tips.map((t) => t.id)).not.toContain("trip-goshuin");
  });

  it("includes holiday tips when trip overlaps a holiday", () => {
    vi.mocked(getActiveHolidays).mockReturnValueOnce([
      { id: "golden-week", name: "Golden Week", description: "Major holiday period.", startMonth: 4, startDay: 29, endMonth: 5, endDay: 5, impactLevel: "high", affectedCategories: [] },
    ]);

    const itinerary = createTestItinerary({
      days: [createTestItineraryDay()],
    });

    const tips = getTripLevelTips(itinerary, "2026-04-29");
    expect(tips.map((t) => t.id)).toContain("trip-holiday-golden-week");
  });

  it("includes cash-only tip when activities are cash-only", () => {
    const itinerary = createTestItinerary({
      days: [
        createTestItineraryDay({
          activities: [
            createTestPlaceActivity({
              title: "Tsukiji Outer Market",
              tags: ["market", "cash-only"],
            }),
          ],
        }),
      ],
    });

    const tips = getTripLevelTips(itinerary);
    const cashTip = tips.find((t) => t.id === "trip-cash-only");
    expect(cashTip).toBeDefined();
    expect(cashTip!.summary).toContain("Tsukiji Outer Market");
  });

  it("includes seasonal food tip when foods are in season", () => {
    vi.mocked(getSeasonalFoods).mockReturnValueOnce([
      { name: "Sakura Mochi", nameJa: "\u6851\u9905", description: "Spring sweet" },
    ]);

    const itinerary = createTestItinerary({
      days: [createTestItineraryDay({ cityId: "kyoto" })],
    });

    const tips = getTripLevelTips(itinerary, "2026-04-01");
    expect(tips.map((t) => t.id)).toContain("trip-seasonal-food");
  });

  it("returns empty for empty itinerary", () => {
    const itinerary = createTestItinerary({ days: [] });
    expect(getTripLevelTips(itinerary)).toEqual([]);
  });

  it("always includes the Money in Japan tip for non-empty itineraries", () => {
    const itinerary = createTestItinerary({
      days: [createTestItineraryDay()],
    });
    const tips = getTripLevelTips(itinerary);
    const money = tips.find((t) => t.id === "trip-money");
    expect(money).toBeDefined();
    expect(money!.title).toBe("Money in Japan");
    // Core money decisions surfaced: ATM-over-exchange, card brands, DCC.
    expect(money!.summary).toMatch(/7-Eleven|Japan Post/);
    expect(money!.summary).toMatch(/Visa|Mastercard/);
    expect(money!.summary).toMatch(/JPY|dynamic conversion/i);
    expect(money!.summary).toMatch(/no tipping/i);
  });
});
