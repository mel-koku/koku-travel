import { describe, it, expect } from "vitest";
import {
  isValidPhotoName,
  isValidLocationId,
  parsePositiveInt,
  isValidArraySize,
  isValidObjectDepth,
} from "../src/lib/api/validation";

describe("Validation Utilities", () => {
  describe("isValidPhotoName", () => {
    it("should accept valid photo names", () => {
      expect(isValidPhotoName("places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos/AQ")).toBe(true);
      expect(isValidPhotoName("places/abc123/photos/xyz789")).toBe(true);
      expect(isValidPhotoName("places/test-place_id/photos/photo_ref")).toBe(true);
    });

    it("should reject invalid photo names", () => {
      expect(isValidPhotoName("")).toBe(false);
      expect(isValidPhotoName("invalid")).toBe(false);
      expect(isValidPhotoName("places/")).toBe(false);
      expect(isValidPhotoName("/photos/ref")).toBe(false);
      expect(isValidPhotoName("places/id")).toBe(false);
    });

    it("should reject photo names that are too long", () => {
      const longName = "places/" + "a".repeat(500) + "/photos/ref";
      expect(isValidPhotoName(longName)).toBe(false);
    });

    it("should reject non-string inputs", () => {
      expect(isValidPhotoName(null as unknown as string)).toBe(false);
      expect(isValidPhotoName(123 as unknown as string)).toBe(false);
      expect(isValidPhotoName({} as unknown as string)).toBe(false);
    });
  });

  describe("isValidLocationId", () => {
    it("should accept valid location IDs", () => {
      expect(isValidLocationId("tokyo")).toBe(true);
      expect(isValidLocationId("location-123")).toBe(true);
      expect(isValidLocationId("test_location")).toBe(true);
      expect(isValidLocationId("a.b-c_d")).toBe(true);
    });

    it("should reject invalid location IDs", () => {
      expect(isValidLocationId("")).toBe(false);
      expect(isValidLocationId("   ")).toBe(false);
      expect(isValidLocationId("../path")).toBe(false);
      expect(isValidLocationId("path//traversal")).toBe(false);
      expect(isValidLocationId("path with spaces")).toBe(false);
      expect(isValidLocationId("path@with#special$chars")).toBe(false);
    });

    it("should reject location IDs that are too long", () => {
      const longId = "a".repeat(256);
      expect(isValidLocationId(longId)).toBe(false);
    });

    it("should reject non-string inputs", () => {
      expect(isValidLocationId(null as unknown as string)).toBe(false);
      expect(isValidLocationId(123 as unknown as string)).toBe(false);
    });
  });

  describe("parsePositiveInt", () => {
    it("should parse valid positive integers", () => {
      expect(parsePositiveInt("1")).toBe(1);
      expect(parsePositiveInt("100")).toBe(100);
      expect(parsePositiveInt("999")).toBe(999);
    });

    it("should respect min parameter", () => {
      expect(parsePositiveInt("0", undefined, 1)).toBe(null);
      expect(parsePositiveInt("5", undefined, 10)).toBe(null);
      expect(parsePositiveInt("10", undefined, 10)).toBe(10);
    });

    it("should respect max parameter", () => {
      expect(parsePositiveInt("100", 50)).toBe(null);
      expect(parsePositiveInt("50", 50)).toBe(50);
      expect(parsePositiveInt("1", 50)).toBe(1);
    });

    it("should reject invalid inputs", () => {
      expect(parsePositiveInt("")).toBe(null);
      expect(parsePositiveInt("abc")).toBe(null);
      expect(parsePositiveInt("-5")).toBe(null);
      expect(parsePositiveInt("0")).toBe(null);
      expect(parsePositiveInt("1.5")).toBe(null);
      expect(parsePositiveInt(null)).toBe(null);
    });

    it("should reject strings that are too long", () => {
      const longString = "1".repeat(11);
      expect(parsePositiveInt(longString)).toBe(null);
    });
  });

  describe("isValidArraySize", () => {
    it("should validate array sizes", () => {
      expect(isValidArraySize([1, 2, 3], 10)).toBe(true);
      expect(isValidArraySize([], 10)).toBe(true);
      expect(isValidArraySize(new Array(10).fill(0), 10)).toBe(true);
    });

    it("should reject arrays that are too large", () => {
      expect(isValidArraySize(new Array(11).fill(0), 10)).toBe(false);
      expect(isValidArraySize(new Array(100).fill(0), 10)).toBe(false);
    });

    it("should reject non-array inputs", () => {
      expect(isValidArraySize({} as unknown as unknown[], 10)).toBe(false);
      expect(isValidArraySize("string" as unknown as unknown[], 10)).toBe(false);
      expect(isValidArraySize(null as unknown as unknown[], 10)).toBe(false);
    });
  });

  describe("isValidObjectDepth", () => {
    it("should accept shallow objects", () => {
      expect(isValidObjectDepth({ a: 1 })).toBe(true);
      expect(isValidObjectDepth({ a: { b: 2 } })).toBe(true);
      expect(isValidObjectDepth(null)).toBe(true);
      expect(isValidObjectDepth("string")).toBe(true);
    });

    it("should accept objects within depth limit", () => {
      const obj: Record<string, unknown> = {};
      let current: Record<string, unknown> = obj;
      for (let i = 0; i < 10; i++) {
        current.nested = {};
        current = current.nested as Record<string, unknown>;
      }
      expect(isValidObjectDepth(obj, 10)).toBe(true);
    });

    it("should reject objects that are too deep", () => {
      const obj: Record<string, unknown> = {};
      let current: Record<string, unknown> = obj;
      for (let i = 0; i < 11; i++) {
        current.nested = {};
        current = current.nested as Record<string, unknown>;
      }
      expect(isValidObjectDepth(obj, 10)).toBe(false);
    });

    it("should handle arrays in objects", () => {
      const obj = {
        items: [
          { nested: { deep: { value: 1 } } },
          { nested: { deep: { value: 2 } } },
        ],
      };
      expect(isValidObjectDepth(obj, 5)).toBe(true);
    });
  });
});

