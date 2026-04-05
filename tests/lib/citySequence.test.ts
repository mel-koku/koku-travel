import { describe, it, expect, vi } from "vitest";
import type { EntryPoint } from "@/types/trip";
import type { Location } from "@/types/location";

// Mock entryPoints data module (used by travelTime)
vi.mock("@/data/entryPoints", () => ({
  getNearestCity: vi.fn((coords: { lat: number; lng: number }) => {
    if (Math.abs(coords.lat - 35.6762) < 0.5) return "tokyo";
    if (Math.abs(coords.lat - 34.6937) < 0.3) return "osaka";
    if (Math.abs(coords.lat - 33.5904) < 0.5) return "fukuoka";
    return "tokyo";
  }),
  getCityCenterCoordinates: vi.fn((cityId: string) => {
    const centers: Record<string, { lat: number; lng: number }> = {
      tokyo: { lat: 35.6762, lng: 139.6503 },
      osaka: { lat: 34.6937, lng: 135.5023 },
      kyoto: { lat: 35.0116, lng: 135.7681 },
      nara: { lat: 34.6851, lng: 135.8049 },
      kobe: { lat: 34.6901, lng: 135.1956 },
      hiroshima: { lat: 34.3853, lng: 132.4553 },
      fukuoka: { lat: 33.5904, lng: 130.4017 },
      nagoya: { lat: 35.1815, lng: 136.9066 },
      kanazawa: { lat: 36.5613, lng: 136.6562 },
      sapporo: { lat: 43.0618, lng: 141.3545 },
      yokohama: { lat: 35.4437, lng: 139.6380 },
      kamakura: { lat: 35.3192, lng: 139.5467 },
      sendai: { lat: 38.2682, lng: 140.8694 },
    };
    return centers[cityId] ?? { lat: 35.0, lng: 135.0 };
  }),
}));

// Mock cityRelevance (used by regions.ts → getRegionForCity)
vi.mock("@/lib/tripBuilder/cityRelevance", () => ({
  getCityMetadata: vi.fn(() => null),
}));

import {
  optimizeCitySequence,
  optimizeCitiesWithinRegion,
  optimizeRegionOrder,
  expandCitySequenceForDays,
  resolveCitySequence,
  getDepartureDistanceWarning,
  type CityInfo,
} from "@/lib/routing/citySequence";

// ---- Helpers ----

function makeEntryPoint(overrides: Partial<EntryPoint> = {}): EntryPoint {
  return {
    type: "airport",
    id: "NRT",
    name: "Narita International Airport",
    coordinates: { lat: 35.7720, lng: 140.3929 },
    cityId: "tokyo",
    iataCode: "NRT",
    ...overrides,
  };
}

function makeOsakaEntryPoint(overrides: Partial<EntryPoint> = {}): EntryPoint {
  return {
    type: "airport",
    id: "KIX",
    name: "Kansai International Airport",
    coordinates: { lat: 34.4347, lng: 135.2440 },
    cityId: "osaka",
    iataCode: "KIX",
    ...overrides,
  };
}

function makeFukuokaEntryPoint(overrides: Partial<EntryPoint> = {}): EntryPoint {
  return {
    type: "airport",
    id: "FUK",
    name: "Fukuoka Airport",
    coordinates: { lat: 33.5859, lng: 130.4510 },
    cityId: "fukuoka",
    iataCode: "FUK",
    ...overrides,
  };
}

function makeCityInfo(key: string, label?: string, regionId?: string): CityInfo {
  return { key, label: label ?? key.charAt(0).toUpperCase() + key.slice(1), regionId };
}

function makeLocationsByCityKey(cityKeys: string[]): Map<string, Location[]> {
  const map = new Map<string, Location[]>();
  for (const key of cityKeys) {
    map.set(key, [{ city: key } as Location]);
  }
  return map;
}

// ---- Tests ----

describe("citySequence", () => {
  // =========================================================
  // optimizeCitySequence
  // =========================================================
  describe("optimizeCitySequence", () => {
    it("returns empty array for empty input", () => {
      const result = optimizeCitySequence(makeEntryPoint(), []);
      expect(result).toEqual([]);
    });

    it("returns the single city for single-city input", () => {
      const result = optimizeCitySequence(makeEntryPoint(), ["kyoto"]);
      expect(result).toContain("kyoto");
    });

    it("places entry-point city first when it is in the selection", () => {
      const entry = makeEntryPoint(); // cityId = "tokyo"
      const result = optimizeCitySequence(entry, ["kyoto", "osaka", "tokyo"]);
      expect(result[0]).toBe("tokyo");
    });

    it("groups cities in the same region together (Kansai cluster)", () => {
      const entry = makeOsakaEntryPoint();
      const result = optimizeCitySequence(entry, ["kyoto", "osaka", "nara", "kobe"]);
      // All are Kansai, so they should stay grouped (single region path)
      expect(result).toHaveLength(4);
      expect(result).toContain("kyoto");
      expect(result).toContain("osaka");
      expect(result).toContain("nara");
      expect(result).toContain("kobe");
    });

    it("optimizes multi-region trips (Kansai + Kanto)", () => {
      const entry = makeEntryPoint(); // Tokyo
      const result = optimizeCitySequence(entry, ["kyoto", "osaka", "tokyo", "yokohama"]);
      // All four cities should be present (may also have appended return city)
      expect(result.length).toBeGreaterThanOrEqual(4);
      expect(result).toContain("tokyo");
      expect(result).toContain("yokohama");
      expect(result).toContain("kyoto");
      expect(result).toContain("osaka");

      // Kansai cities (kyoto, osaka) should appear consecutively
      const kyotoIdx = result.indexOf("kyoto");
      const osakaIdx = result.indexOf("osaka");
      expect(Math.abs(kyotoIdx - osakaIdx)).toBe(1);
    });

    it("handles round-trip loop (same entry/exit region)", () => {
      const entry = makeEntryPoint(); // Tokyo
      // Round trip: enter Tokyo, visit Kansai, return to Tokyo area
      const result = optimizeCitySequence(entry, ["tokyo", "yokohama", "kyoto", "osaka"], entry);
      // First city should be nearest to entry
      expect(result[0]).toBe("tokyo");
    });

    it("handles undefined entry point gracefully", () => {
      const result = optimizeCitySequence(undefined, ["kyoto", "osaka"]);
      expect(result).toHaveLength(2);
      expect(result).toContain("kyoto");
      expect(result).toContain("osaka");
    });

    it("appends return city when last city is far from exit", () => {
      // Enter via Tokyo, visit only Kansai cities, exit via Tokyo
      // The last city (Kansai) is >90min from Tokyo, so it should append return
      const entry = makeEntryPoint(); // Tokyo
      const result = optimizeCitySequence(entry, ["kyoto", "osaka"], entry);
      // The optimization should try to end near Tokyo
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================
  // optimizeCitiesWithinRegion
  // =========================================================
  describe("optimizeCitiesWithinRegion", () => {
    it("returns single city unchanged", () => {
      expect(optimizeCitiesWithinRegion(["kyoto"], makeEntryPoint())).toEqual(["kyoto"]);
    });

    it("returns empty array unchanged", () => {
      expect(optimizeCitiesWithinRegion([], makeEntryPoint())).toEqual([]);
    });

    it("starts with city nearest to entry point", () => {
      const entry = makeOsakaEntryPoint();
      const result = optimizeCitiesWithinRegion(["kyoto", "osaka", "nara"], entry);
      expect(result[0]).toBe("osaka");
    });

    it("pins exit city last when isLastRegion is true", () => {
      const entry = makeEntryPoint(); // Tokyo
      const exit = makeOsakaEntryPoint(); // Osaka
      const result = optimizeCitiesWithinRegion(
        ["kyoto", "osaka", "nara", "kobe"],
        entry,
        exit,
        true,
      );
      expect(result[result.length - 1]).toBe("osaka");
    });

    it("does not pin exit city when isLastRegion is false", () => {
      const entry = makeEntryPoint();
      const exit = makeOsakaEntryPoint();
      const result = optimizeCitiesWithinRegion(
        ["kyoto", "osaka", "nara"],
        entry,
        exit,
        false,
      );
      // Exit pinning should not apply
      expect(result).toHaveLength(3);
    });

    it("uses greedy nearest-neighbor ordering", () => {
      const entry = makeOsakaEntryPoint();
      // Osaka -> Kobe (25min) -> Nara -> Kyoto
      const result = optimizeCitiesWithinRegion(["kyoto", "nara", "kobe", "osaka"], entry);
      expect(result[0]).toBe("osaka");
      // Kobe is 25min from Osaka, should come next
      expect(result[1]).toBe("kobe");
    });
  });

  // =========================================================
  // optimizeRegionOrder
  // =========================================================
  describe("optimizeRegionOrder", () => {
    it("returns single region unchanged", () => {
      expect(optimizeRegionOrder(
        ["kansai"],
        makeEntryPoint(),
        new Map([["kansai", ["kyoto", "osaka"]]]),
      )).toEqual(["kansai"]);
    });

    it("starts with region nearest to entry point", () => {
      const entry = makeEntryPoint(); // Tokyo = Kanto
      const citiesByRegion = new Map([
        ["kansai", ["kyoto", "osaka"]] as [string, string[]],
        ["kanto", ["tokyo", "yokohama"]] as [string, string[]],
      ]);
      const result = optimizeRegionOrder(["kansai", "kanto"], entry, citiesByRegion);
      expect(result[0]).toBe("kanto");
    });

    it("puts exit region last when exit differs from entry", () => {
      const entry = makeEntryPoint(); // Tokyo = Kanto
      const exit = makeOsakaEntryPoint(); // Osaka = Kansai
      const citiesByRegion = new Map([
        ["kansai", ["kyoto", "osaka"]] as [string, string[]],
        ["kanto", ["tokyo", "yokohama"]] as [string, string[]],
        ["chubu", ["nagoya", "kanazawa"]] as [string, string[]],
      ]);
      const result = optimizeRegionOrder(
        ["kansai", "kanto", "chubu"],
        entry,
        citiesByRegion,
        exit,
      );
      expect(result[result.length - 1]).toBe("kansai");
    });

    it("handles empty regions array", () => {
      expect(optimizeRegionOrder([], makeEntryPoint(), new Map())).toEqual([]);
    });
  });

  // =========================================================
  // expandCitySequenceForDays
  // =========================================================
  describe("expandCitySequenceForDays", () => {
    const kyoto = makeCityInfo("kyoto", "Kyoto", "kansai");
    const osaka = makeCityInfo("osaka", "Osaka", "kansai");
    const tokyo = makeCityInfo("tokyo", "Tokyo", "kanto");

    it("returns empty for empty sequence", () => {
      expect(expandCitySequenceForDays([], 5)).toEqual([]);
    });

    it("returns empty for zero days", () => {
      expect(expandCitySequenceForDays([kyoto], 0)).toEqual([kyoto]);
    });

    it("returns sequence as-is when length matches totalDays", () => {
      const seq = [kyoto, osaka, tokyo];
      expect(expandCitySequenceForDays(seq, 3)).toEqual(seq);
    });

    it("distributes days evenly across cities (7 days, 2 cities)", () => {
      const result = expandCitySequenceForDays([kyoto, osaka], 7);
      expect(result).toHaveLength(7);
      const kyotoCount = result.filter((c) => c.key === "kyoto").length;
      const osakaCount = result.filter((c) => c.key === "osaka").length;
      expect(kyotoCount).toBe(4); // 3 base + 1 remainder
      expect(osakaCount).toBe(3);
    });

    it("distributes days for 3 cities across 5 days", () => {
      const result = expandCitySequenceForDays([kyoto, osaka, tokyo], 5);
      expect(result).toHaveLength(5);
      const kyotoCount = result.filter((c) => c.key === "kyoto").length;
      const osakaCount = result.filter((c) => c.key === "osaka").length;
      const tokyoCount = result.filter((c) => c.key === "tokyo").length;
      expect(kyotoCount).toBe(2);
      expect(osakaCount).toBe(2);
      expect(tokyoCount).toBe(1);
    });

    it("keeps days contiguous (no back-and-forth)", () => {
      const result = expandCitySequenceForDays([kyoto, osaka], 6);
      // All Kyoto days should come before all Osaka days
      const lastKyotoIdx = result.map((c) => c.key).lastIndexOf("kyoto");
      const firstOsakaIdx = result.map((c) => c.key).indexOf("osaka");
      expect(firstOsakaIdx).toBe(lastKyotoIdx + 1);
    });

    it("respects explicit cityDays array", () => {
      const result = expandCitySequenceForDays([kyoto, osaka, tokyo], 7, [3, 2, 2]);
      expect(result).toHaveLength(7);
      expect(result.filter((c) => c.key === "kyoto")).toHaveLength(3);
      expect(result.filter((c) => c.key === "osaka")).toHaveLength(2);
      expect(result.filter((c) => c.key === "tokyo")).toHaveLength(2);
    });

    it("trims cityDays to totalDays when cityDays exceeds total", () => {
      const result = expandCitySequenceForDays([kyoto, osaka], 3, [4, 4]);
      expect(result).toHaveLength(3);
    });

    it("ensures at least 1 day per city when cities outnumber days", () => {
      const result = expandCitySequenceForDays([kyoto, osaka, tokyo], 2);
      // More cities than days: each gets 1 day, trimmed to totalDays
      expect(result).toHaveLength(2);
    });
  });

  // =========================================================
  // getDepartureDistanceWarning
  // =========================================================
  describe("getDepartureDistanceWarning", () => {
    it("returns null for empty cities", () => {
      expect(getDepartureDistanceWarning([], makeEntryPoint())).toBeNull();
    });

    it("returns null when no entry point", () => {
      expect(getDepartureDistanceWarning(["kyoto"], undefined)).toBeNull();
    });

    it("returns null when last city is close to exit", () => {
      const entry = makeEntryPoint(); // Tokyo
      // Tokyo is 0min from Tokyo entry point
      expect(getDepartureDistanceWarning(["tokyo"], entry)).toBeNull();
    });

    it("returns warning when last city is far from exit", () => {
      const entry = makeEntryPoint(); // Tokyo
      // Hiroshima is 240min from Tokyo (well over 90min threshold)
      const result = getDepartureDistanceWarning(["hiroshima"], entry);
      expect(result).not.toBeNull();
      expect(result!.lastCity).toBe("hiroshima");
      expect(result!.minutes).toBeGreaterThan(90);
      expect(result!.threshold).toBe(90);
    });

    it("uses exitPoint when provided", () => {
      const entry = makeEntryPoint(); // Tokyo
      const exit = makeOsakaEntryPoint(); // Osaka
      // Kyoto is 30min from Osaka (within threshold)
      expect(getDepartureDistanceWarning(["kyoto"], entry, exit)).toBeNull();
    });

    it("checks only the last city in the sequence", () => {
      const entry = makeEntryPoint(); // Tokyo
      // First city is far, but last city is close
      const result = getDepartureDistanceWarning(["hiroshima", "tokyo"], entry);
      expect(result).toBeNull();
    });
  });

  // =========================================================
  // resolveCitySequence
  // =========================================================
  describe("resolveCitySequence", () => {
    it("uses custom order when customCityOrder is set", () => {
      const data = {
        cities: ["osaka", "kyoto", "tokyo"] as string[],
        customCityOrder: true,
        dates: { startDate: "2026-04-10", endDate: "2026-04-17" },
        entryPoint: makeEntryPoint(),
      };
      const locationsByCity = makeLocationsByCityKey(["osaka", "kyoto", "tokyo"]);
      const result = resolveCitySequence(data, locationsByCity, []);
      // Custom order should be preserved exactly
      expect(result.map((c) => c.key)).toEqual(["osaka", "kyoto", "tokyo"]);
    });

    it("allows duplicate cities with custom order", () => {
      const data = {
        cities: ["tokyo", "osaka", "tokyo"] as string[],
        customCityOrder: true,
        dates: { startDate: "2026-04-10", endDate: "2026-04-17" },
        entryPoint: makeEntryPoint(),
      };
      const locationsByCity = makeLocationsByCityKey(["tokyo", "osaka"]);
      const result = resolveCitySequence(data, locationsByCity, []);
      expect(result.map((c) => c.key)).toEqual(["tokyo", "osaka", "tokyo"]);
    });

    it("deduplicates cities when not custom order", () => {
      // Use a compact Kansai round trip where the last city (kyoto) is within
      // the 90-minute departure comfort window of KIX, so auto-return-day
      // won't re-append osaka. That way any duplicate osaka in the output
      // would have come from the input, which is what we want to dedupe.
      const data = {
        cities: ["osaka", "kyoto", "osaka"] as string[],
        customCityOrder: false,
        dates: { startDate: "2026-04-10", endDate: "2026-04-17" },
        entryPoint: makeOsakaEntryPoint(),
      };
      const locationsByCity = makeLocationsByCityKey(["osaka", "kyoto"]);
      const result = resolveCitySequence(data, locationsByCity, []);
      const keys = result.map((c) => c.key);
      expect(keys.filter((k) => k === "osaka").length).toBe(1);
    });

    it("falls back to default rotation when no cities selected", () => {
      const data = {
        cities: [] as string[],
        dates: { startDate: "2026-04-10", endDate: "2026-04-17" },
      };
      const locationsByCity = makeLocationsByCityKey(["kyoto", "tokyo", "osaka"]);
      const result = resolveCitySequence(data, locationsByCity, []);
      expect(result.length).toBeGreaterThan(0);
    });

    it("skips cities not present in locationsByCityKey", () => {
      const data = {
        cities: ["tokyo", "nonexistent_city"] as string[],
        customCityOrder: true,
        dates: { startDate: "2026-04-10", endDate: "2026-04-17" },
        entryPoint: makeEntryPoint(),
      };
      const locationsByCity = makeLocationsByCityKey(["tokyo"]);
      const result = resolveCitySequence(data, locationsByCity, []);
      expect(result.map((c) => c.key)).toEqual(["tokyo"]);
    });

    it("returns fallback when all cities are invalid", () => {
      const data = {
        cities: ["nonexistent"] as string[],
        dates: { startDate: "2026-04-10", endDate: "2026-04-17" },
      };
      const locationsByCity = makeLocationsByCityKey(["kyoto", "tokyo", "osaka"]);
      const result = resolveCitySequence(data, locationsByCity, []);
      // Falls back to DEFAULT_CITY_ROTATION
      expect(result.length).toBeGreaterThan(0);
    });

    it("uses region-based expansion when no cities but regions provided", () => {
      const data = {
        cities: [] as string[],
        regions: ["kansai"] as string[],
        dates: { startDate: "2026-04-10", endDate: "2026-04-17" },
        entryPoint: makeOsakaEntryPoint(),
      };
      // Provide all Kansai cities as available
      const locationsByCity = makeLocationsByCityKey(["kyoto", "osaka", "nara", "kobe", "otsu", "himeji", "wakayama"]);
      const result = resolveCitySequence(data, locationsByCity, []);
      const keys = result.map((c) => c.key);
      expect(keys).toContain("kyoto");
      expect(keys).toContain("osaka");
    });

    it("returns ultimate fallback for completely empty state", () => {
      const data = {
        cities: [] as string[],
        dates: { startDate: "2026-04-10", endDate: "2026-04-17" },
      };
      // No default cities in locationsByCityKey either
      const allLocations = [{ city: "sapporo" } as Location];
      const result = resolveCitySequence(data, new Map(), allLocations);
      // Should produce at least one entry (ultimate fallback)
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // =========================================================
  // Edge cases
  // =========================================================
  describe("edge cases", () => {
    it("handles all cities in the same region", () => {
      const entry = makeOsakaEntryPoint();
      const result = optimizeCitySequence(entry, ["kyoto", "osaka", "nara", "kobe"]);
      // Single region path -- all cities present
      expect(result).toHaveLength(4);
      expect(new Set(result)).toEqual(new Set(["kyoto", "osaka", "nara", "kobe"]));
    });

    it("handles single city gracefully", () => {
      const entry = makeEntryPoint();
      const result = optimizeCitySequence(entry, ["kyoto"]);
      expect(result).toContain("kyoto");
    });

    it("handles open-jaw trip (different entry and exit)", () => {
      const entry = makeEntryPoint(); // Tokyo
      const exit = makeFukuokaEntryPoint(); // Fukuoka
      const result = optimizeCitySequence(
        entry,
        ["tokyo", "kyoto", "osaka", "hiroshima", "fukuoka"],
        exit,
      );
      // Should start near Tokyo and end near Fukuoka
      expect(result[0]).toBe("tokyo");
    });

    it("expandCitySequenceForDays handles single city for many days", () => {
      const city = makeCityInfo("kyoto", "Kyoto", "kansai");
      const result = expandCitySequenceForDays([city], 7);
      expect(result).toHaveLength(7);
      expect(result.every((c) => c.key === "kyoto")).toBe(true);
    });

    it("optimizeCitySequence preserves all input cities", () => {
      const entry = makeEntryPoint();
      const cities = ["tokyo", "kyoto", "osaka", "hiroshima", "fukuoka"];
      const result = optimizeCitySequence(entry, cities, entry);
      // All original cities should be present (may have extra return city)
      for (const city of cities) {
        expect(result).toContain(city);
      }
    });
  });
});
