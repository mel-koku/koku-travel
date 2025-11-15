import { describe, it, expect, beforeEach, vi } from "vitest";
import { getLocal, setLocal } from "@/lib/storageHelpers";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

describe("storageHelpers", () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Mock window.localStorage
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
  });

  describe("getLocal", () => {
    it("should return parsed JSON from localStorage", () => {
      const testData = { name: "test", value: 123 };
      localStorageMock.setItem("test-key", JSON.stringify(testData));

      const result = getLocal("test-key");
      expect(result).toEqual(testData);
    });

    it("should return fallback when key doesn't exist", () => {
      const fallback = { default: true };
      const result = getLocal("non-existent", fallback);
      expect(result).toBe(fallback);
    });

    it("should return undefined when key doesn't exist and no fallback", () => {
      const result = getLocal("non-existent");
      expect(result).toBeUndefined();
    });

    it("should return fallback when localStorage is unavailable (SSR)", () => {
      const originalWindow = global.window;
      // @ts-expect-error - intentionally removing window for SSR test
      delete global.window;

      const fallback = { default: true };
      const result = getLocal("test-key", fallback);
      expect(result).toBe(fallback);

      global.window = originalWindow;
    });

    it("should return fallback on JSON parse error", () => {
      localStorageMock.setItem("invalid-json", "not valid json{");
      const fallback = { default: true };
      const result = getLocal("invalid-json", fallback);
      expect(result).toBe(fallback);
    });

    it("should handle typed return values", () => {
      interface TestType {
        id: number;
        name: string;
      }

      const testData: TestType = { id: 1, name: "test" };
      localStorageMock.setItem("typed-key", JSON.stringify(testData));

      const result = getLocal<TestType>("typed-key");
      expect(result).toEqual(testData);
      expect(result?.id).toBe(1);
      expect(result?.name).toBe("test");
    });
  });

  describe("setLocal", () => {
    it("should serialize and store data in localStorage", () => {
      const testData = { name: "test", value: 123 };
      setLocal("test-key", testData);

      const stored = localStorageMock.getItem("test-key");
      expect(stored).toBe(JSON.stringify(testData));
    });

    it("should handle complex nested objects", () => {
      const complexData = {
        nested: {
          array: [1, 2, 3],
          object: { key: "value" },
        },
      };
      setLocal("complex-key", complexData);

      const stored = localStorageMock.getItem("complex-key");
      expect(stored).toBe(JSON.stringify(complexData));
    });

    it("should not throw when localStorage is unavailable (SSR)", () => {
      const originalWindow = global.window;
      // @ts-expect-error - intentionally removing window for SSR test
      delete global.window;

      expect(() => {
        setLocal("test-key", { data: "test" });
      }).not.toThrow();

      global.window = originalWindow;
    });

    it("should handle storage quota exceeded gracefully", () => {
      // Mock setItem to throw quota exceeded error
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        const error = new Error("QuotaExceededError");
        error.name = "QuotaExceededError";
        throw error;
      });

      // Should not throw, just fail silently
      expect(() => {
        setLocal("large-key", { data: "x".repeat(1000000) });
      }).not.toThrow();

      localStorageMock.setItem = originalSetItem;
    });
  });
});

