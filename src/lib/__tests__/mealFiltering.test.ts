import { describe, expect, it } from "vitest";
import {
  parseTripDateDay,
  filterByMealType,
  isDiningLocation,
  containsKeyword,
  NOT_BREAKFAST_KEYWORDS,
  BREAKFAST_KEYWORDS,
} from "../mealFiltering";
import type { Location } from "@/types/location";

/** Minimal location stub for testing */
function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: "test-1",
    name: "Test Restaurant",
    lat: 35.68,
    lng: 139.76,
    city: "Tokyo",
    category: "restaurant",
    ...overrides,
  } as Location;
}

describe("mealFiltering", () => {
  describe("parseTripDateDay", () => {
    it("returns correct weekday for a known date", () => {
      // 2025-02-20 is a Thursday (day index 4)
      expect(parseTripDateDay("2025-02-20")).toBe(4);
    });

    it("returns correct weekday for a Sunday", () => {
      // 2025-02-16 is a Sunday (day index 0)
      expect(parseTripDateDay("2025-02-16")).toBe(0);
    });

    it("returns correct weekday for a Saturday", () => {
      // 2025-02-22 is a Saturday (day index 6)
      expect(parseTripDateDay("2025-02-22")).toBe(6);
    });

    it("handles year boundaries", () => {
      // 2025-01-01 is a Wednesday (day index 3)
      expect(parseTripDateDay("2025-01-01")).toBe(3);
    });
  });

  describe("filterByMealType — breakfast", () => {
    it("excludes bars from breakfast", () => {
      const bar = makeLocation({
        id: "bar-1",
        name: "Tokyo Bar",
        googlePrimaryType: "bar",
      });
      const result = filterByMealType([bar], "breakfast");
      expect(result).toHaveLength(0);
    });

    it("includes cafes for breakfast", () => {
      const cafe = makeLocation({
        id: "cafe-1",
        name: "Morning Cafe",
        googlePrimaryType: "cafe",
      });
      const result = filterByMealType([cafe], "breakfast");
      expect(result).toHaveLength(1);
    });

    it("excludes ramen shops from breakfast via keyword fallback", () => {
      const ramen = makeLocation({
        id: "ramen-1",
        name: "Ichiran Ramen",
        googlePrimaryType: undefined,
        googleTypes: [],
      });
      const result = filterByMealType([ramen], "breakfast");
      expect(result).toHaveLength(0);
    });

    it("excludes places opening after 11am from breakfast", () => {
      const lateOpener = makeLocation({
        id: "late-1",
        name: "Late Restaurant",
        operatingHours: {
          periods: [{ day: "thursday", open: "12:00", close: "22:00" }],
        },
      });
      const result = filterByMealType([lateOpener], "breakfast", "2025-02-20");
      expect(result).toHaveLength(0);
    });
  });

  describe("filterByMealType — lunch", () => {
    it("excludes dinner-only places from lunch", () => {
      const dinnerOnly = makeLocation({
        id: "dinner-1",
        name: "Dinner Spot",
        operatingHours: {
          periods: [{ day: "thursday", open: "18:00", close: "23:00" }],
        },
      });
      const result = filterByMealType([dinnerOnly], "lunch", "2025-02-20");
      expect(result).toHaveLength(0);
    });

    it("includes places with servesLunch=true", () => {
      const lunchPlace = makeLocation({
        id: "lunch-1",
        name: "Lunch Spot",
        mealOptions: { servesLunch: true },
      });
      const result = filterByMealType([lunchPlace], "lunch");
      expect(result).toHaveLength(1);
    });
  });

  describe("filterByMealType — dinner", () => {
    it("excludes places closing before 6pm from dinner", () => {
      const earlyClose = makeLocation({
        id: "early-1",
        name: "Morning Cafe",
        operatingHours: {
          periods: [{ day: "thursday", open: "07:00", close: "15:00" }],
        },
      });
      const result = filterByMealType([earlyClose], "dinner", "2025-02-20");
      expect(result).toHaveLength(0);
    });

    it("includes places with servesDinner=true", () => {
      const dinnerPlace = makeLocation({
        id: "dinner-1",
        name: "Dinner Spot",
        mealOptions: { servesDinner: true },
      });
      const result = filterByMealType([dinnerPlace], "dinner");
      expect(result).toHaveLength(1);
    });
  });

  describe("isDiningLocation", () => {
    it("identifies restaurants by Google primary type", () => {
      const loc = makeLocation({ googlePrimaryType: "ramen_restaurant" });
      expect(isDiningLocation(loc)).toBe(true);
    });

    it("excludes permanently closed locations", () => {
      const loc = makeLocation({
        googlePrimaryType: "restaurant",
        businessStatus: "PERMANENTLY_CLOSED",
      });
      expect(isDiningLocation(loc)).toBe(false);
    });

    it("excludes landmarks even if category is restaurant", () => {
      const loc = makeLocation({
        name: "Osaka Castle",
        category: "restaurant",
        googlePrimaryType: undefined,
      });
      expect(isDiningLocation(loc)).toBe(false);
    });
  });

  describe("containsKeyword", () => {
    it("matches case-insensitively", () => {
      expect(containsKeyword("Tokyo IZAKAYA", NOT_BREAKFAST_KEYWORDS)).toBe(true);
    });

    it("returns false for no match", () => {
      expect(containsKeyword("Sushi Restaurant", BREAKFAST_KEYWORDS)).toBe(false);
    });

    it("matches partial words", () => {
      expect(containsKeyword("Best Coffee Shop", BREAKFAST_KEYWORDS)).toBe(true);
    });
  });
});
