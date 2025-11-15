import { describe, it, expect } from "vitest";
import { travelMinutes } from "@/lib/travelTime";

describe("travelTime", () => {
  describe("travelMinutes", () => {
    it("should return travel time between cities", () => {
      expect(travelMinutes("kyoto", "osaka")).toBe(30);
      expect(travelMinutes("osaka", "kyoto")).toBe(30);
      expect(travelMinutes("kyoto", "tokyo")).toBe(150);
      expect(travelMinutes("tokyo", "yokohama")).toBe(25);
    });

    it("should return 0 for same city", () => {
      expect(travelMinutes("kyoto", "kyoto")).toBe(0);
      expect(travelMinutes("tokyo", "tokyo")).toBe(0);
    });

    it("should fall back to inverse lookup when direction not defined", () => {
      // yokohama -> tokyo is defined, but tokyo -> yokohama should use inverse
      expect(travelMinutes("yokohama", "tokyo")).toBe(25);
    });

    it("should return undefined for cities without connection", () => {
      // nara and yokohama don't have a direct connection
      expect(travelMinutes("nara", "yokohama")).toBeUndefined();
      expect(travelMinutes("yokohama", "nara")).toBeUndefined();
    });

    it("should handle all defined city pairs", () => {
      expect(travelMinutes("kyoto", "nara")).toBe(45);
      expect(travelMinutes("nara", "kyoto")).toBe(45);
      expect(travelMinutes("osaka", "nara")).toBe(45);
      expect(travelMinutes("nara", "osaka")).toBe(45);
      expect(travelMinutes("osaka", "tokyo")).toBe(150);
      expect(travelMinutes("tokyo", "osaka")).toBe(150);
      expect(travelMinutes("nara", "tokyo")).toBe(180);
      expect(travelMinutes("tokyo", "nara")).toBe(180);
    });
  });
});

