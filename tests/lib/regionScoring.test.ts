import { describe, it, expect } from "vitest";
import { scoreRegionsForTrip, autoSelectRegions, autoSelectCities } from "@/lib/tripBuilder/regionScoring";
import type { EntryPoint } from "@/types/trip";
import type { VibeId } from "@/data/vibes";

const kansaiEntryPoint: EntryPoint = {
  type: "airport",
  id: "kix",
  name: "Kansai International",
  coordinates: { lat: 34.4347, lng: 135.244 },
  cityId: "osaka",
  region: "kansai",
};

const tokyoEntryPoint: EntryPoint = {
  type: "airport",
  id: "nrt",
  name: "Narita Airport",
  coordinates: { lat: 35.7648, lng: 140.3864 },
  cityId: "tokyo",
  region: "kanto",
};

describe("regionScoring", () => {
  describe("scoreRegionsForTrip", () => {
    it("returns all 9 regions", () => {
      const result = scoreRegionsForTrip([]);
      expect(result).toHaveLength(9);
    });

    it("gives neutral scores (50) when no vibes selected", () => {
      const result = scoreRegionsForTrip([]);
      for (const r of result) {
        expect(r.matchScore).toBe(50);
      }
    });

    it("scores higher for regions matching selected vibes", () => {
      const vibes: VibeId[] = ["cultural_heritage"];
      const result = scoreRegionsForTrip(vibes);
      // Kansai has cultural_heritage in bestFor
      const kansai = result.find((r) => r.region.id === "kansai")!;
      // Hokkaido doesn't
      const hokkaido = result.find((r) => r.region.id === "hokkaido")!;
      expect(kansai.matchScore).toBeGreaterThan(hokkaido.matchScore);
    });

    it("applies 70% vibe + 30% proximity weighting", () => {
      const vibes: VibeId[] = ["cultural_heritage"];
      const result = scoreRegionsForTrip(vibes, kansaiEntryPoint);
      const kansai = result.find((r) => r.region.id === "kansai")!;
      const expectedTotal = Math.round(kansai.matchScore * 0.7 + kansai.proximityScore * 0.3);
      expect(kansai.totalScore).toBe(expectedTotal);
    });

    it("gives higher proximity score to closer regions", () => {
      const result = scoreRegionsForTrip([], kansaiEntryPoint);
      const kansai = result.find((r) => r.region.id === "kansai")!;
      const hokkaido = result.find((r) => r.region.id === "hokkaido")!;
      expect(kansai.proximityScore).toBeGreaterThan(hokkaido.proximityScore);
    });

    it("places entry point region first", () => {
      const vibes: VibeId[] = ["nature_adventure"]; // Kansai is not best for nature
      const result = scoreRegionsForTrip(vibes, kansaiEntryPoint);
      expect(result[0].region.id).toBe("kansai");
      expect(result[0].isEntryPointRegion).toBe(true);
    });

    it("marks top 3 as recommended", () => {
      const result = scoreRegionsForTrip(["cultural_heritage"]);
      const recommended = result.filter((r) => r.isRecommended);
      expect(recommended).toHaveLength(3);
      // First 3 in array should be recommended
      expect(result[0].isRecommended).toBe(true);
      expect(result[1].isRecommended).toBe(true);
      expect(result[2].isRecommended).toBe(true);
      expect(result[3].isRecommended).toBe(false);
    });

    it("gives neutral proximity when no entry point", () => {
      const result = scoreRegionsForTrip([]);
      for (const r of result) {
        expect(r.proximityScore).toBe(50);
      }
    });

    it("gives specialization bonus for multiple matching vibes", () => {
      // Kansai bestFor: cultural_heritage, foodie_paradise
      const singleVibe = scoreRegionsForTrip(["cultural_heritage"]);
      const multiVibe = scoreRegionsForTrip(["cultural_heritage", "foodie_paradise"]);
      const kansaiSingle = singleVibe.find((r) => r.region.id === "kansai")!;
      const kansaiMulti = multiVibe.find((r) => r.region.id === "kansai")!;
      // Multi-vibe match should have higher or equal match score
      expect(kansaiMulti.matchScore).toBeGreaterThanOrEqual(kansaiSingle.matchScore);
    });
  });

  describe("autoSelectRegions", () => {
    it("selects 1 region for ≤5 day trips", () => {
      const result = autoSelectRegions(["cultural_heritage"], kansaiEntryPoint, 5);
      expect(result).toHaveLength(1);
    });

    it("selects 2 regions for 6-9 day trips", () => {
      const result = autoSelectRegions(["cultural_heritage"], kansaiEntryPoint, 7);
      expect(result).toHaveLength(2);
    });

    it("selects 3 regions for 10+ day trips", () => {
      const result = autoSelectRegions(["cultural_heritage"], kansaiEntryPoint, 14);
      expect(result).toHaveLength(3);
    });

    it("defaults to 1 region when no duration", () => {
      const result = autoSelectRegions(["cultural_heritage"]);
      expect(result).toHaveLength(1);
    });

    it("includes entry point region when available", () => {
      const result = autoSelectRegions(["nature_adventure"], kansaiEntryPoint, 7);
      expect(result).toContain("kansai");
    });
  });

  describe("autoSelectCities", () => {
    it("returns cities from 2 regions", () => {
      const cities = autoSelectCities(["cultural_heritage"], kansaiEntryPoint);
      expect(cities.length).toBeGreaterThanOrEqual(2);
      // Should include cities from kansai (entry point region)
      const kansaiCities = ["kyoto", "osaka", "nara", "kobe"];
      const hasKansaiCity = cities.some((c) => kansaiCities.includes(c));
      expect(hasKansaiCity).toBe(true);
    });

    it("includes entry point region's cities", () => {
      const cities = autoSelectCities(["neon_nightlife"], tokyoEntryPoint);
      const kantoCities = ["tokyo", "yokohama"];
      const hasKantoCity = cities.some((c) => kantoCities.includes(c));
      expect(hasKantoCity).toBe(true);
    });

    it("picks 2 different regions", () => {
      const cities = autoSelectCities(["cultural_heritage"], kansaiEntryPoint);
      // Should have cities from kansai + at least one other region
      const kansaiCities = new Set(["kyoto", "osaka", "nara", "kobe"]);
      const nonKansaiCities = cities.filter((c) => !kansaiCities.has(c));
      expect(nonKansaiCities.length).toBeGreaterThan(0);
    });

    it("works without entry point", () => {
      const cities = autoSelectCities(["cultural_heritage"]);
      expect(cities.length).toBeGreaterThanOrEqual(2);
    });
  });
});
