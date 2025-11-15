import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { TripBuilderProvider, useTripBuilder } from "@/context/TripBuilderContext";

describe("TripBuilderContext", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  afterEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  describe("context provider initialization", () => {
    it("should initialize with default data when no initialData provided", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: TripBuilderProvider,
      });

      expect(result.current.data.dates).toEqual({});
      expect(result.current.data.regions).toEqual([]);
      expect(result.current.data.cities).toEqual([]);
      expect(result.current.data.interests).toEqual([]);
      expect(result.current.data.style).toBeUndefined();
      expect(result.current.data.accessibility).toBeUndefined();
    });

    it("should initialize with provided initialData", () => {
      const initialData = {
        dates: { start: "2024-01-01", end: "2024-01-07" },
        regions: ["kansai"],
        cities: ["kyoto"],
        interests: ["culture"],
        style: "balanced" as const,
        accessibility: { mobility: true },
      };

      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: ({ children }) => (
          <TripBuilderProvider initialData={initialData}>{children}</TripBuilderProvider>
        ),
      });

      expect(result.current.data.regions).toEqual(["kansai"]);
      expect(result.current.data.cities).toEqual(["kyoto"]);
      expect(result.current.data.interests).toEqual(["culture"]);
      expect(result.current.data.style).toBe("balanced");
    });
  });

  describe("context value updates", () => {
    it("should update data when setData is called", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: TripBuilderProvider,
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          regions: ["kansai", "kanto"],
        }));
      });

      expect(result.current.data.regions).toEqual(["kansai", "kanto"]);
    });

    it("should persist data to localStorage", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: TripBuilderProvider,
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          regions: ["Kansai"],
        }));
      });

      const stored = localStorage.getItem("koku_trip_builder");
      expect(stored).toBeTruthy();
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.regions).toEqual(["kansai"]);
      }
    });
  });

  describe("reset functionality", () => {
    it("should reset data to default values", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: TripBuilderProvider,
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          regions: ["Kansai"],
          cities: ["Kyoto"],
          interests: ["culture"],
        }));
      });

      expect(result.current.data.regions).toEqual(["kansai"]);

      act(() => {
        result.current.reset();
      });

      expect(result.current.data.regions).toEqual([]);
      expect(result.current.data.cities).toEqual([]);
      expect(result.current.data.interests).toEqual([]);
    });

    it("should clear localStorage on reset", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: TripBuilderProvider,
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          regions: ["Kansai"],
        }));
      });

      expect(localStorage.getItem("koku_trip_builder")).toBeTruthy();

      act(() => {
        result.current.reset();
      });

      // Reset should clear the step storage but keep the builder data
      const stored = localStorage.getItem("koku_trip_builder");
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.regions).toEqual([]);
      }
    });
  });

  describe("data sanitization", () => {
    it("should sanitize interests to max 5", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: TripBuilderProvider,
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          interests: ["culture", "food", "nature", "shopping", "nightlife", "photography"],
        }));
      });

      // Should limit to 5 interests
      expect(result.current.data.interests?.length).toBeLessThanOrEqual(5);
    });

    it("should sanitize style to valid values", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: TripBuilderProvider,
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          style: "relaxed" as const,
        }));
      });

      expect(result.current.data.style).toBe("relaxed");

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          style: "invalid-style" as any,
        }));
      });

      // Invalid style should be sanitized to undefined
      expect(result.current.data.style).toBeUndefined();
    });
  });

  describe("context consumption", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTripBuilder());
      }).toThrow("useTripBuilder must be used within a TripBuilderProvider");

      consoleSpy.mockRestore();
    });
  });
});

