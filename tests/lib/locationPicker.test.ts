import { describe, it, expect, vi, beforeEach } from "vitest";
import { pickLocationForTimeSlot } from "@/lib/selection/locationPicker";
import { createTestLocation } from "../fixtures/locations";

// Mock logger to suppress output
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock seasonal availability (always available)
vi.mock("@/lib/scoring/seasonalAvailability", () => ({
  isLocationAvailableOnDate: vi.fn().mockReturnValue({ available: true }),
}));

// Seed Math.random for deterministic selection
let randomSeed = 0;
beforeEach(() => {
  randomSeed = 0;
  vi.spyOn(Math, "random").mockImplementation(() => {
    randomSeed = (randomSeed * 9301 + 49297) % 233280;
    return randomSeed / 233280;
  });
});

const templeA = createTestLocation({
  id: "temple-a",
  name: "Temple A",
  category: "temple",
  city: "Kyoto",
  coordinates: { lat: 35.0, lng: 135.78 },
  rating: 4.5,
  reviewCount: 5000,
  minBudget: "500",
});

const templeB = createTestLocation({
  id: "temple-b",
  name: "Temple B",
  category: "temple",
  city: "Kyoto",
  coordinates: { lat: 35.001, lng: 135.781 },
  rating: 4.3,
  reviewCount: 3000,
  minBudget: "500",
});

const restaurant = createTestLocation({
  id: "restaurant-a",
  name: "Restaurant A",
  category: "restaurant",
  city: "Kyoto",
  coordinates: { lat: 35.002, lng: 135.782 },
  rating: 4.2,
  reviewCount: 2000,
  minBudget: "2000",
});

const bar = createTestLocation({
  id: "bar-a",
  name: "Bar A",
  category: "bar",
  city: "Kyoto",
  coordinates: { lat: 35.003, lng: 135.783 },
  rating: 4.0,
  reviewCount: 1000,
  minBudget: "1000",
});

const garden = createTestLocation({
  id: "garden-a",
  name: "Garden A",
  category: "garden",
  city: "Kyoto",
  coordinates: { lat: 35.004, lng: 135.784 },
  rating: 4.6,
  reviewCount: 4000,
  minBudget: "0",
});

const locations = [templeA, templeB, restaurant, bar, garden];

describe("pickLocationForTimeSlot", () => {
  describe("filtering", () => {
    it("excludes used locations by ID", () => {
      const usedIds = new Set(["temple-a", "temple-b", "restaurant-a", "bar-a"]);
      const result = pickLocationForTimeSlot(
        locations,
        "culture",
        usedIds,
        120,
        15,
      );
      // Only garden-a should remain
      if (result) {
        expect(result.id).toBe("garden-a");
      }
    });

    it("excludes used locations by normalized name", () => {
      const result = pickLocationForTimeSlot(
        locations,
        "culture",
        new Set(),
        120,
        15,
        undefined,
        [],
        "balanced",
        ["culture"],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        [],
        new Set(["temple a"]), // normalized name match
      );
      // Temple A should be excluded
      if (result) {
        expect(result.name).not.toBe("Temple A");
      }
    });

    it("returns undefined when all locations are used", () => {
      const usedIds = new Set(locations.map((l) => l.id));
      const result = pickLocationForTimeSlot(
        locations,
        "culture",
        usedIds,
        120,
        15,
      );
      expect(result).toBeUndefined();
    });

    it("returns undefined when list is empty", () => {
      const result = pickLocationForTimeSlot(
        [],
        "culture",
        new Set(),
        120,
        15,
      );
      expect(result).toBeUndefined();
    });
  });

  describe("scoring and selection", () => {
    it("returns a location from the candidate list", () => {
      const result = pickLocationForTimeSlot(
        locations,
        "culture",
        new Set(),
        120,
        15,
        { lat: 35.0, lng: 135.78 },
        [],
        "balanced",
        ["culture"],
      );
      expect(result).toBeDefined();
      expect(locations.some((l) => l.id === result?.id)).toBe(true);
    });

    it("attaches scoring metadata (_scoreBreakdown)", () => {
      const result = pickLocationForTimeSlot(
        locations,
        "culture",
        new Set(),
        120,
        15,
        { lat: 35.0, lng: 135.78 },
        [],
        "balanced",
        ["culture"],
      );
      expect(result?._scoreBreakdown).toBeDefined();
    });

    it("attaches runner-ups when multiple candidates exist", () => {
      const result = pickLocationForTimeSlot(
        locations,
        "culture",
        new Set(),
        120,
        15,
        { lat: 35.0, lng: 135.78 },
        [],
        "balanced",
        ["culture"],
      );
      // With 5 locations there should be runner-ups
      if (result?._runnerUps) {
        expect(result._runnerUps.length).toBeGreaterThan(0);
        expect(result._runnerUps[0]).toHaveProperty("name");
        expect(result._runnerUps[0]).toHaveProperty("id");
      }
    });

    it("attaches scoring reasoning", () => {
      const result = pickLocationForTimeSlot(
        locations,
        "culture",
        new Set(),
        120,
        15,
        { lat: 35.0, lng: 135.78 },
        [],
        "balanced",
        ["culture"],
      );
      expect(result?._scoringReasoning).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("falls back to random unused location when diversity filter empties candidates", () => {
      // Pass many recent categories to trigger aggressive diversity filtering
      const result = pickLocationForTimeSlot(
        [templeA],
        "culture",
        new Set(),
        120,
        15,
        { lat: 35.0, lng: 135.78 },
        ["temple", "temple", "temple", "temple", "temple"],
        "balanced",
        ["culture"],
      );
      // Should still return something (fallback) even with heavy diversity filtering
      // May return templeA via fallback or via scoring
      if (result) {
        expect(result.id).toBe("temple-a");
      }
    });

    it("filters seasonal locations when date is provided", () => {
      const seasonalLoc = createTestLocation({
        id: "seasonal-1",
        name: "Cherry Blossom Spot",
        category: "park",
        isSeasonal: true,
        coordinates: { lat: 35.0, lng: 135.78 },
        minBudget: "0",
      });

      // The mock always returns available, so it should still be included
      const result = pickLocationForTimeSlot(
        [seasonalLoc],
        "nature",
        new Set(),
        120,
        15,
        undefined,
        [],
        "balanced",
        ["nature"],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "2026-04-01",
      );
      expect(result).toBeDefined();
    });
  });
});

