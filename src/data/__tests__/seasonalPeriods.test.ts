import { describe, it, expect } from "vitest";
import { getSeasonalPeriod } from "../seasonalPeriods";

describe("getSeasonalPeriod", () => {
  describe("cherry blossom", () => {
    it("temperate region: late March to mid April", () => {
      const p = getSeasonalPeriod("cherryBlossom", "temperate");
      expect(p).not.toBeNull();
      expect(p!.startMonth).toBe(3);
      expect(p!.startDay).toBe(20);
      expect(p!.endMonth).toBe(4);
      expect(p!.endDay).toBe(15);
    });

    it("tropical_south (Okinawa): late January to February", () => {
      const p = getSeasonalPeriod("cherryBlossom", "tropical_south");
      expect(p).not.toBeNull();
      expect(p!.startMonth).toBe(1);
      expect(p!.endMonth).toBe(2);
    });

    it("subarctic_north (Hokkaido): late April to early May", () => {
      const p = getSeasonalPeriod("cherryBlossom", "subarctic_north");
      expect(p).not.toBeNull();
      expect(p!.startMonth).toBe(4);
      expect(p!.endMonth).toBe(5);
    });
  });

  describe("rainy season (tsuyu)", () => {
    it("temperate region: June to mid July", () => {
      const p = getSeasonalPeriod("rainy", "temperate");
      expect(p).not.toBeNull();
      expect(p!.startMonth).toBe(6);
      expect(p!.endMonth).toBe(7);
    });

    it("tropical_south: starts earlier, in May", () => {
      const p = getSeasonalPeriod("rainy", "tropical_south");
      expect(p).not.toBeNull();
      expect(p!.startMonth).toBe(5);
    });

    it("subarctic_north: returns null (Hokkaido has no tsuyu)", () => {
      const p = getSeasonalPeriod("rainy", "subarctic_north");
      expect(p).toBeNull();
    });
  });

  describe("autumn leaves", () => {
    it("temperate region: mid October to end of November", () => {
      const p = getSeasonalPeriod("autumnLeaves", "temperate");
      expect(p).not.toBeNull();
    });

    it("subarctic_north: shifts earlier, late September to October", () => {
      const p = getSeasonalPeriod("autumnLeaves", "subarctic_north");
      expect(p).not.toBeNull();
      expect(p!.startMonth).toBe(9);
    });
  });
});
