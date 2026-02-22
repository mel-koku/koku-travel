import { describe, it, expect, vi } from "vitest";
import { travelMinutes, travelTimeFromEntryPoint, getNearestCityToEntryPoint } from "@/lib/travelTime";
import type { EntryPoint } from "@/types/trip";

// Mock the entryPoints data module
vi.mock("@/data/entryPoints", () => ({
  getNearestCity: vi.fn((coords: { lat: number; lng: number }) => {
    // Return city based on proximity
    if (Math.abs(coords.lat - 35.6762) < 1) return "tokyo";
    if (Math.abs(coords.lat - 34.6937) < 0.5) return "osaka";
    if (Math.abs(coords.lat - 43.0618) < 1) return "sapporo";
    return "tokyo";
  }),
  getCityCenterCoordinates: vi.fn((cityId: string) => {
    const centers: Record<string, { lat: number; lng: number }> = {
      tokyo: { lat: 35.6762, lng: 139.6503 },
      osaka: { lat: 34.6937, lng: 135.5023 },
      kyoto: { lat: 35.0116, lng: 135.7681 },
      sapporo: { lat: 43.0618, lng: 141.3545 },
    };
    return centers[cityId] ?? { lat: 35.0, lng: 135.0 };
  }),
}));

describe("travelTime", () => {
  describe("travelMinutes", () => {
    it("returns 0 for the same city", () => {
      expect(travelMinutes("tokyo", "tokyo")).toBe(0);
      expect(travelMinutes("osaka", "osaka")).toBe(0);
    });

    it("returns forward lookup value", () => {
      expect(travelMinutes("kyoto", "osaka")).toBe(30);
      expect(travelMinutes("kyoto", "tokyo")).toBe(135);
    });

    it("returns reverse lookup value", () => {
      // osaka→kyoto is not defined but kyoto→osaka is
      expect(travelMinutes("osaka", "kyoto")).toBe(30);
      expect(travelMinutes("tokyo", "kyoto")).toBe(135);
    });

    it("returns undefined for unknown city pairs", () => {
      expect(travelMinutes("nara", "sapporo")).toBeUndefined();
    });

    it("handles Okinawa flight routes", () => {
      expect(travelMinutes("naha", "tokyo")).toBe(180);
      expect(travelMinutes("naha", "osaka")).toBe(165);
      expect(travelMinutes("naha", "fukuoka")).toBe(120);
    });

    it("handles Hokkaido routes", () => {
      expect(travelMinutes("sapporo", "hakodate")).toBe(210);
      expect(travelMinutes("tokyo", "sapporo")).toBe(250);
    });
  });

  describe("travelTimeFromEntryPoint", () => {
    it("returns 0 when entry point cityId matches target city", () => {
      const entryPoint: EntryPoint = {
        type: "airport",
        id: "nrt",
        name: "Narita Airport",
        coordinates: { lat: 35.7648, lng: 140.3864 },
        cityId: "tokyo",
      };
      expect(travelTimeFromEntryPoint(entryPoint, "tokyo")).toBe(0);
    });

    it("adds 30 min buffer for airports", () => {
      const entryPoint: EntryPoint = {
        type: "airport",
        id: "nrt",
        name: "Narita Airport",
        coordinates: { lat: 35.7648, lng: 140.3864 },
      };
      const time = travelTimeFromEntryPoint(entryPoint, "tokyo");
      expect(time).toBeDefined();
      // Should include +30 airport buffer
      expect(time).toBeGreaterThanOrEqual(30);
    });

    it("uses faster speed for long distances (>100km)", () => {
      const entryPoint: EntryPoint = {
        type: "airport",
        id: "nrt",
        name: "Narita Airport",
        coordinates: { lat: 35.7648, lng: 140.3864 },
      };
      // Tokyo→Osaka is ~400km, should use 200km/h
      const time = travelTimeFromEntryPoint(entryPoint, "osaka");
      expect(time).toBeDefined();
      // 400km at 200km/h = 120min + 30 airport buffer
      expect(time).toBeGreaterThan(100);
    });
  });

  describe("getNearestCityToEntryPoint", () => {
    it("returns nearest city to entry point", () => {
      const entryPoint: EntryPoint = {
        type: "airport",
        id: "nrt",
        name: "Narita Airport",
        coordinates: { lat: 35.7648, lng: 140.3864 },
      };
      const result = getNearestCityToEntryPoint(entryPoint);
      expect(result).toBe("tokyo");
    });

    it("returns osaka for KIX-like coordinates", () => {
      const entryPoint: EntryPoint = {
        type: "airport",
        id: "kix",
        name: "Kansai International",
        coordinates: { lat: 34.4347, lng: 135.244 },
      };
      const result = getNearestCityToEntryPoint(entryPoint);
      expect(result).toBe("osaka");
    });
  });
});
