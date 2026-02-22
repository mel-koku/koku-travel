import { describe, it, expect } from "vitest";
import {
  calculateDistance,
  calculateDistanceMeters,
  estimateTravelTime,
} from "@/lib/utils/geoUtils";

describe("geoUtils", () => {
  describe("calculateDistance", () => {
    it("returns 0 for the same point", () => {
      const point = { lat: 35.6762, lng: 139.6503 };
      expect(calculateDistance(point, point)).toBe(0);
    });

    it("calculates Tokyo↔Osaka (~400km)", () => {
      const tokyo = { lat: 35.6762, lng: 139.6503 };
      const osaka = { lat: 34.6937, lng: 135.5023 };
      const distance = calculateDistance(tokyo, osaka);
      expect(distance).toBeGreaterThan(380);
      expect(distance).toBeLessThan(420);
    });

    it("calculates Tokyo↔Kyoto (~370km)", () => {
      const tokyo = { lat: 35.6762, lng: 139.6503 };
      const kyoto = { lat: 35.0116, lng: 135.7681 };
      const distance = calculateDistance(tokyo, kyoto);
      expect(distance).toBeGreaterThan(350);
      expect(distance).toBeLessThan(390);
    });

    it("calculates Osaka↔Nara (~30km)", () => {
      const osaka = { lat: 34.6937, lng: 135.5023 };
      const nara = { lat: 34.6851, lng: 135.8048 };
      const distance = calculateDistance(osaka, nara);
      expect(distance).toBeGreaterThan(25);
      expect(distance).toBeLessThan(35);
    });

    it("handles antipodal points (long distances)", () => {
      const north = { lat: 43.0618, lng: 141.3545 }; // Sapporo
      const south = { lat: 26.2124, lng: 127.6792 }; // Naha
      const distance = calculateDistance(north, south);
      expect(distance).toBeGreaterThan(2000);
      expect(distance).toBeLessThan(2500);
    });

    it("is symmetric (A→B = B→A)", () => {
      const a = { lat: 35.6762, lng: 139.6503 };
      const b = { lat: 34.6937, lng: 135.5023 };
      expect(calculateDistance(a, b)).toBeCloseTo(calculateDistance(b, a), 10);
    });
  });

  describe("calculateDistanceMeters", () => {
    it("returns km × 1000", () => {
      const tokyo = { lat: 35.6762, lng: 139.6503 };
      const osaka = { lat: 34.6937, lng: 135.5023 };
      const km = calculateDistance(tokyo, osaka);
      const meters = calculateDistanceMeters(tokyo, osaka);
      expect(meters).toBeCloseTo(km * 1000, 5);
    });

    it("returns 0 for the same point", () => {
      const point = { lat: 35.0, lng: 135.0 };
      expect(calculateDistanceMeters(point, point)).toBe(0);
    });
  });

  describe("estimateTravelTime", () => {
    it("defaults to walk mode", () => {
      // 4 km/h walking → 1km = 15min + 5min buffer = 20min → ceil
      const time = estimateTravelTime(1);
      expect(time).toBe(20);
    });

    it("calculates walk time with buffer", () => {
      // 2km / 4km/h = 0.5h = 30min + 5 buffer = 35
      expect(estimateTravelTime(2, "walk")).toBe(35);
    });

    it("calculates transit time with 10min buffer", () => {
      // 10km / 20km/h = 0.5h = 30min + 10 buffer = 40
      expect(estimateTravelTime(10, "transit")).toBe(40);
    });

    it("calculates taxi time with 5min buffer", () => {
      // 15km / 30km/h = 0.5h = 30min + 5 buffer = 35
      expect(estimateTravelTime(15, "taxi")).toBe(35);
    });

    it("returns buffer for 0 distance", () => {
      expect(estimateTravelTime(0, "walk")).toBe(5);
      expect(estimateTravelTime(0, "transit")).toBe(10);
      expect(estimateTravelTime(0, "taxi")).toBe(5);
    });

    it("rounds up to nearest minute", () => {
      // 1km / 20km/h = 3min + 10 buffer = 13 → ceil(13) = 13
      expect(estimateTravelTime(1, "transit")).toBe(13);
    });
  });
});
