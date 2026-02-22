import { describe, it, expect, vi } from "vitest";
import { detectPlanningWarnings, getWarningsSummary } from "@/lib/planning/tripWarnings";
import type { TripBuilderData } from "@/types/trip";

// Mock regionDescriptions to provide coordinates for distance checks
vi.mock("@/data/regionDescriptions", () => ({
  REGION_DESCRIPTIONS: [
    {
      id: "kansai",
      name: "Kansai",
      heroImage: "",
      tagline: "",
      description: "",
      highlights: [],
      bestFor: [],
      coordinates: { lat: 34.6937, lng: 135.5023 },
    },
    {
      id: "kanto",
      name: "Kanto",
      heroImage: "",
      tagline: "",
      description: "",
      highlights: [],
      bestFor: [],
      coordinates: { lat: 35.6762, lng: 139.6503 },
    },
    {
      id: "hokkaido",
      name: "Hokkaido",
      heroImage: "",
      tagline: "",
      description: "",
      highlights: [],
      bestFor: [],
      coordinates: { lat: 43.0618, lng: 141.3545 },
    },
    {
      id: "kyushu",
      name: "Kyushu",
      heroImage: "",
      tagline: "",
      description: "",
      highlights: [],
      bestFor: [],
      coordinates: { lat: 33.5902, lng: 130.4017 },
    },
    {
      id: "okinawa",
      name: "Okinawa",
      heroImage: "",
      tagline: "",
      description: "",
      highlights: [],
      bestFor: [],
      coordinates: { lat: 26.2124, lng: 127.6809 },
    },
  ],
}));

function makeTrip(overrides: Partial<TripBuilderData> = {}): TripBuilderData {
  return {
    dates: {},
    ...overrides,
  };
}

describe("tripWarnings", () => {
  describe("detectPlanningWarnings", () => {
    it("returns no warnings for minimal trip data", () => {
      const warnings = detectPlanningWarnings(makeTrip());
      expect(warnings).toHaveLength(0);
    });

    it("returns no warnings when no dates set", () => {
      const warnings = detectPlanningWarnings(makeTrip({ cities: ["tokyo", "osaka"] }));
      // Only pacing could trigger (if duration is set), but no date-based warnings
      expect(warnings.every((w) => w.type === "pacing")).toBe(true);
    });

    describe("pacing warnings", () => {
      it("warns for 3 cities in 3 days", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          cities: ["tokyo", "kyoto", "osaka"],
          duration: 3,
        }));
        const pacing = warnings.find((w) => w.type === "pacing");
        expect(pacing).toBeDefined();
        expect(pacing!.severity).toBe("caution");
        expect(pacing!.title).toContain("Ambitious");
      });

      it("warns for 5+ cities in 5 days", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          cities: ["tokyo", "kyoto", "osaka", "nara", "kobe"],
          duration: 5,
        }));
        const pacing = warnings.find((w) => w.type === "pacing");
        expect(pacing).toBeDefined();
        expect(pacing!.severity).toBe("warning");
        expect(pacing!.title).toContain("Fast-Paced");
      });

      it("warns for high city-per-day ratio", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          cities: ["tokyo", "kyoto", "osaka", "nara", "kobe", "hiroshima", "fukuoka", "nagasaki"],
          duration: 9,
        }));
        const pacing = warnings.find((w) => w.type === "pacing");
        expect(pacing).toBeDefined();
        expect(pacing!.severity).toBe("info");
      });

      it("no pacing warning for relaxed trip", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          cities: ["tokyo", "kyoto"],
          duration: 10,
        }));
        const pacing = warnings.find((w) => w.type === "pacing");
        expect(pacing).toBeUndefined();
      });
    });

    describe("holiday warnings", () => {
      it("detects New Year (cross-year boundary)", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          dates: { start: "2026-12-30", end: "2027-01-03" },
        }));
        const holiday = warnings.find((w) => w.type === "holiday");
        expect(holiday).toBeDefined();
        expect(holiday!.title).toContain("New Year");
      });

      it("detects Golden Week", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          dates: { start: "2026-04-29", end: "2026-05-05" },
        }));
        const holiday = warnings.find((w) => w.type === "holiday");
        expect(holiday).toBeDefined();
        expect(holiday!.title).toContain("Golden Week");
      });

      it("detects Obon", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          dates: { start: "2026-08-13", end: "2026-08-16" },
        }));
        const holiday = warnings.find((w) => w.type === "holiday");
        expect(holiday).toBeDefined();
        expect(holiday!.title).toContain("Obon");
      });

      it("detects Silver Week", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          dates: { start: "2026-09-19", end: "2026-09-23" },
        }));
        const holiday = warnings.find((w) => w.type === "holiday");
        expect(holiday).toBeDefined();
        expect(holiday!.title).toContain("Silver Week");
      });

      it("no holiday warning outside holiday periods", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          dates: { start: "2026-03-01", end: "2026-03-10" },
        }));
        const holiday = warnings.find((w) => w.type === "holiday");
        expect(holiday).toBeUndefined();
      });
    });

    describe("seasonal warnings", () => {
      it("detects rainy season (June)", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          dates: { start: "2026-06-10", end: "2026-06-20" },
        }));
        const seasonal = warnings.find((w) => w.type === "seasonal_rainy");
        expect(seasonal).toBeDefined();
        expect(seasonal!.title).toContain("Rainy");
      });

      it("detects cherry blossom season", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          dates: { start: "2026-03-25", end: "2026-04-05" },
        }));
        const seasonal = warnings.find((w) => w.type === "seasonal_cherry_blossom");
        expect(seasonal).toBeDefined();
        expect(seasonal!.title).toContain("Cherry Blossom");
      });

      it("detects autumn leaves season", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          dates: { start: "2026-11-01", end: "2026-11-15" },
        }));
        const seasonal = warnings.find((w) => w.type === "seasonal_autumn");
        expect(seasonal).toBeDefined();
        expect(seasonal!.title).toContain("Autumn");
      });

      it("detects summer heat", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          dates: { start: "2026-08-01", end: "2026-08-10" },
        }));
        const seasonal = warnings.find((w) => w.type === "weather" && w.title.includes("Summer"));
        expect(seasonal).toBeDefined();
      });

      it("detects winter season", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          dates: { start: "2026-01-10", end: "2026-01-20" },
        }));
        const seasonal = warnings.find((w) => w.type === "weather" && w.title.includes("Winter"));
        expect(seasonal).toBeDefined();
      });
    });

    describe("distance warnings", () => {
      it("warns for Hokkaido + Okinawa", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          regions: ["hokkaido", "okinawa"],
        }));
        const distance = warnings.find((w) => w.type === "distance");
        expect(distance).toBeDefined();
        expect(distance!.severity).toBe("warning");
        expect(distance!.message).toContain("Hokkaido");
      });

      it("warns for Hokkaido + Kyushu", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          regions: ["hokkaido", "kyushu"],
        }));
        const distance = warnings.find((w) => w.type === "distance");
        expect(distance).toBeDefined();
        expect(distance!.severity).toBe("warning");
      });

      it("warns for regions >800km apart", () => {
        // Hokkaido↔Kansai is ~900km+
        const warnings = detectPlanningWarnings(makeTrip({
          regions: ["hokkaido", "kansai"],
        }));
        const distance = warnings.find((w) => w.type === "distance");
        expect(distance).toBeDefined();
      });

      it("no distance warning for nearby regions", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          regions: ["kansai", "kanto"],
        }));
        const distance = warnings.find((w) => w.type === "distance");
        expect(distance).toBeUndefined();
      });

      it("no distance warning for single region", () => {
        const warnings = detectPlanningWarnings(makeTrip({
          regions: ["kansai"],
        }));
        const distance = warnings.find((w) => w.type === "distance");
        expect(distance).toBeUndefined();
      });
    });
  });

  describe("getWarningsSummary", () => {
    it("returns correct counts", () => {
      const warnings = detectPlanningWarnings(makeTrip({
        cities: ["a", "b", "c"],
        duration: 3,
        dates: { start: "2026-04-29", end: "2026-05-05" },
        regions: ["hokkaido", "okinawa"],
      }));
      const summary = getWarningsSummary(warnings);
      expect(summary.total).toBe(warnings.length);
      expect(summary.cautions + summary.warnings + summary.info).toBe(summary.total);
    });

    it("returns zero counts for no warnings", () => {
      const summary = getWarningsSummary([]);
      expect(summary.total).toBe(0);
      expect(summary.cautions).toBe(0);
      expect(summary.warnings).toBe(0);
      expect(summary.info).toBe(0);
    });
  });
});
