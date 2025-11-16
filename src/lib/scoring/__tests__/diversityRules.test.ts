import { describe, expect, it } from "vitest";
import {
  detectCategoryStreak,
  calculateDiversityScore,
  wouldViolateDiversityRules,
  applyDiversityFilter,
} from "../diversityRules";
import type { LocationScore } from "../locationScoring";
import type { Location } from "@/types/location";

describe("Diversity Rules", () => {
  describe("Category Streak Detection", () => {
    it("should detect streaks correctly", () => {
      const categories = ["temple", "temple", "shrine", "restaurant"];
      const streak = detectCategoryStreak(categories);

      expect(streak.category).toBe("temple");
      expect(streak.count).toBe(2);
    });

    it("should detect longest streak in middle", () => {
      const categories = ["temple", "shrine", "shrine", "shrine", "restaurant"];
      const streak = detectCategoryStreak(categories);

      expect(streak.category).toBe("shrine");
      expect(streak.count).toBe(3);
    });

    it("should handle empty array", () => {
      const streak = detectCategoryStreak([]);

      expect(streak.category).toBe("");
      expect(streak.count).toBe(0);
    });

    it("should handle single category", () => {
      const streak = detectCategoryStreak(["temple"]);

      expect(streak.category).toBe("temple");
      expect(streak.count).toBe(1);
    });

    it("should handle no streaks", () => {
      const categories = ["temple", "shrine", "restaurant", "park"];
      const streak = detectCategoryStreak(categories);

      expect(streak.count).toBe(1); // Max streak is 1
    });
  });

  describe("Diversity Score", () => {
    it("should score high for varied activities", () => {
      const activities = [
        { category: "temple" },
        { category: "restaurant" },
        { category: "park" },
        { category: "shopping" },
      ];

      const score = calculateDiversityScore(activities);
      expect(score).toBeGreaterThanOrEqual(80);
    });

    it("should score low for repetitive activities", () => {
      const activities = [
        { category: "temple" },
        { category: "temple" },
        { category: "temple" },
        { category: "shrine" },
      ];

      const score = calculateDiversityScore(activities);
      expect(score).toBeLessThan(50);
    });

    it("should handle empty array", () => {
      const score = calculateDiversityScore([]);
      expect(score).toBe(0);
    });

    it("should penalize streaks greater than 2", () => {
      const activities = [
        { category: "temple" },
        { category: "temple" },
        { category: "temple" },
        { category: "temple" },
      ];

      const score = calculateDiversityScore(activities);
      expect(score).toBeLessThan(40);
    });
  });

  describe("Would Violate Diversity Rules", () => {
    const mockLocation: Location = {
      id: "test",
      name: "Test",
      region: "Kansai",
      city: "Kyoto",
      category: "temple",
    };

    it("should return false for new category", () => {
      const violates = wouldViolateDiversityRules(mockLocation, ["restaurant", "park"]);
      expect(violates).toBe(false);
    });

    it("should return false for one occurrence", () => {
      const violates = wouldViolateDiversityRules(mockLocation, ["temple"]);
      expect(violates).toBe(false);
    });

    it("should return true for two occurrences", () => {
      const violates = wouldViolateDiversityRules(mockLocation, ["temple", "temple"]);
      expect(violates).toBe(true);
    });

    it("should return true for more than two occurrences", () => {
      const violates = wouldViolateDiversityRules(mockLocation, [
        "temple",
        "temple",
        "temple",
      ]);
      expect(violates).toBe(true);
    });

    it("should handle locations without category", () => {
      const noCategory = { ...mockLocation, category: undefined };
      const violates = wouldViolateDiversityRules(noCategory, ["temple", "temple"]);
      expect(violates).toBe(false);
    });
  });

  describe("Apply Diversity Filter", () => {
    const createMockScore = (category: string, score: number = 50): LocationScore => ({
      location: {
        id: `test-${category}`,
        name: `Test ${category}`,
        region: "Kansai",
        city: "Kyoto",
        category,
      },
      score,
      breakdown: {
        interestMatch: 20,
        ratingQuality: 20,
        logisticalFit: 10,
        budgetFit: 5,
        accessibilityFit: 5,
        diversityBonus: 0,
      },
      reasoning: [],
    });

    it("should filter out locations that would create streaks", () => {
      const candidates: LocationScore[] = [
        createMockScore("temple", 60),
        createMockScore("temple", 55),
        createMockScore("restaurant", 50),
      ];

      const filtered = applyDiversityFilter(candidates, {
        recentCategories: ["temple", "temple"],
        visitedLocationIds: new Set(),
        currentDay: 0,
        energyLevel: 100,
      });

      // Should filter out temples (would create streak of 3)
      const templeScores = filtered.filter((s) => s.location.category === "temple");
      expect(templeScores.length).toBe(0);
      expect(filtered.length).toBeGreaterThan(0);
    });

    it("should keep locations that don't violate rules", () => {
      const candidates: LocationScore[] = [
        createMockScore("restaurant", 60),
        createMockScore("park", 55),
        createMockScore("shopping", 50),
      ];

      const filtered = applyDiversityFilter(candidates, {
        recentCategories: ["temple"],
        visitedLocationIds: new Set(),
        currentDay: 0,
        energyLevel: 100,
      });

      expect(filtered.length).toBe(3);
    });

    it("should return original if all filtered out", () => {
      const candidates: LocationScore[] = [
        createMockScore("temple", 60),
        createMockScore("temple", 55),
      ];

      const filtered = applyDiversityFilter(candidates, {
        recentCategories: ["temple", "temple"],
        visitedLocationIds: new Set(),
        currentDay: 0,
        energyLevel: 100,
      });

      // Should return original candidates as fallback
      expect(filtered.length).toBeGreaterThan(0);
    });

    it("should handle empty candidates", () => {
      const filtered = applyDiversityFilter([], {
        recentCategories: [],
        visitedLocationIds: new Set(),
        currentDay: 0,
        energyLevel: 100,
      });

      expect(filtered.length).toBe(0);
    });
  });
});

