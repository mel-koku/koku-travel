import { describe, expect, it } from "vitest";
import { scoreLocation } from "../locationScoring";
import type { Location } from "@/types/location";

describe("Location Scoring", () => {
  const mockLocation: Location = {
    id: "test-temple",
    name: "Test Temple",
    region: "Kansai",
    city: "Kyoto",
    category: "temple",
    rating: 4.7,
    reviewCount: 523,
    coordinates: { lat: 35.0116, lng: 135.6761 },
    minBudget: "¥400",
    estimatedDuration: "1.5 hours",
  };

  describe("Interest Match", () => {
    it("should score high for perfect category match", () => {
      const result = scoreLocation(mockLocation, {
        interests: ["culture"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: [],
      });

      expect(result.breakdown.interestMatch).toBeGreaterThan(25);
      expect(result.score).toBeGreaterThan(50);
    });

    it("should score low for unrelated interests", () => {
      const result = scoreLocation(mockLocation, {
        interests: ["nightlife", "shopping"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: [],
      });

      expect(result.breakdown.interestMatch).toBeLessThan(15);
    });

    it("should score medium for partial match", () => {
      const result = scoreLocation(mockLocation, {
        interests: ["culture", "food", "shopping"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: [],
      });

      // Should have some score but not perfect
      expect(result.breakdown.interestMatch).toBeGreaterThan(10);
      expect(result.breakdown.interestMatch).toBeLessThan(30);
    });

    it("should apply rotation bonus when currentInterest matches category", () => {
      const withRotation = scoreLocation(mockLocation, {
        interests: ["culture", "food", "shopping"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: [],
        currentInterest: "culture", // temple maps to culture
      });

      const withoutRotation = scoreLocation(mockLocation, {
        interests: ["culture", "food", "shopping"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: [],
      });

      // Rotation bonus should add +10
      expect(withRotation.breakdown.interestMatch).toBe(
        withoutRotation.breakdown.interestMatch + 10,
      );
    });

    it("should not apply rotation bonus when currentInterest does not match", () => {
      const result = scoreLocation(mockLocation, {
        interests: ["culture", "food", "shopping"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: [],
        currentInterest: "nightlife", // temple does not map to nightlife
      });

      const baseline = scoreLocation(mockLocation, {
        interests: ["culture", "food", "shopping"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: [],
      });

      expect(result.breakdown.interestMatch).toBe(baseline.breakdown.interestMatch);
    });
  });

  describe("Rating Quality", () => {
    it("should score high for highly-rated locations", () => {
      const result = scoreLocation(mockLocation, {
        interests: ["culture"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: [],
      });

      expect(result.breakdown.ratingQuality).toBeGreaterThan(20);
    });

    it("should score lower with few reviews", () => {
      const lowReviews = { ...mockLocation, reviewCount: 5 };
      const result = scoreLocation(lowReviews, {
        interests: ["culture"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: [],
      });

      expect(result.breakdown.ratingQuality).toBeLessThan(20);
    });

    it("should handle missing rating gracefully", () => {
      const noRating = { ...mockLocation, rating: undefined, reviewCount: undefined };
      const result = scoreLocation(noRating, {
        interests: ["culture"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: [],
      });

      // Should still return a score (neutral)
      expect(result.breakdown.ratingQuality).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.ratingQuality).toBeLessThanOrEqual(25);
    });
  });

  describe("Diversity Penalty", () => {
    it("should penalize category streaks", () => {
      const result = scoreLocation(mockLocation, {
        interests: ["culture"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: ["temple", "temple"], // Already 2 temples
      });

      expect(result.breakdown.diversityBonus).toBeLessThan(0); // Penalty
    });

    it("should give bonus for new categories", () => {
      const result = scoreLocation(mockLocation, {
        interests: ["culture"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: ["restaurant", "park"], // Different categories
      });

      expect(result.breakdown.diversityBonus).toBeGreaterThan(0); // Bonus
    });

    it("should give slight penalty for one recent occurrence", () => {
      const result = scoreLocation(mockLocation, {
        interests: ["culture"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: ["temple"], // One temple already
      });

      // Should have slight penalty or neutral
      expect(result.breakdown.diversityBonus).toBeLessThanOrEqual(2);
    });
  });

  describe("Logistical Fit", () => {
    it("should score high for nearby locations", () => {
      const result = scoreLocation(mockLocation, {
        interests: ["culture"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: [],
        currentLocation: { lat: 35.0120, lng: 135.6770 }, // Very close
      });

      expect(result.breakdown.logisticalFit).toBeGreaterThan(15);
    });

    it("should score low for distant locations", () => {
      const result = scoreLocation(mockLocation, {
        interests: ["culture"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: [],
        currentLocation: { lat: 35.6762, lng: 139.6503 }, // Tokyo (far)
      });

      expect(result.breakdown.logisticalFit).toBeLessThan(15);
    });

    it("should score well for duration fit", () => {
      const result = scoreLocation(mockLocation, {
        interests: ["culture"],
        travelStyle: "balanced",
        availableMinutes: 90, // Matches 1.5 hours
        recentCategories: [],
      });

      expect(result.breakdown.logisticalFit).toBeGreaterThan(10);
    });

    it("should handle missing coordinates gracefully", () => {
      const noCoords = { ...mockLocation, coordinates: undefined };
      const result = scoreLocation(noCoords, {
        interests: ["culture"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: [],
        currentLocation: { lat: 35.0120, lng: 135.6770 },
      });

      // Should still return a score
      expect(result.breakdown.logisticalFit).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Budget Fit", () => {
    it("should score high for matching budget", () => {
      const result = scoreLocation(mockLocation, {
        interests: ["culture"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: [],
        budgetLevel: "budget",
      });

      // ¥400 should fit budget level
      expect(result.breakdown.budgetFit).toBeGreaterThan(5);
    });

    it("should score neutral when no budget preference", () => {
      const result = scoreLocation(mockLocation, {
        interests: ["culture"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: [],
      });

      expect(result.breakdown.budgetFit).toBe(5);
    });
  });

  describe("Complete Scoring", () => {
    it("should return all score components", () => {
      const result = scoreLocation(mockLocation, {
        interests: ["culture"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: [],
      });

      expect(result.location).toBe(mockLocation);
      expect(result.score).toBeGreaterThan(0);
      expect(result.breakdown.interestMatch).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.ratingQuality).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.logisticalFit).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.budgetFit).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.accessibilityFit).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.diversityBonus).toBeGreaterThanOrEqual(-5);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it("should generate human-readable reasoning", () => {
      const result = scoreLocation(mockLocation, {
        interests: ["culture"],
        travelStyle: "balanced",
        availableMinutes: 120,
        recentCategories: [],
      });

      expect(result.reasoning).toBeInstanceOf(Array);
      expect(result.reasoning.length).toBe(12); // One for each factor (interest, rating, logistical, budget, accessibility, diversity, neighborhood, weather, time optimization, opening hours, group fit, seasonal fit) — content fit only appears when contentLocationIds is set
      result.reasoning.forEach((reason) => {
        expect(typeof reason).toBe("string");
        expect(reason.length).toBeGreaterThan(0);
      });
    });
  });
});

