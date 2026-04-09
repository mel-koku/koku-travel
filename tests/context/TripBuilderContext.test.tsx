import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { TripBuilderProvider, useTripBuilder } from "@/context/TripBuilderContext";
import type { TripStyle } from "@/types/trip";
import {
  setupLocalStorageMock,
  createContextWrapper,
  testLocalStoragePersistence,
  contextAssertions,
} from "../utils/contextTestHelpers";

// Setup localStorage mocking
setupLocalStorageMock();

describe("TripBuilderContext", () => {
  describe("Initialization", () => {
    it("should initialize with default data when no initialData provided", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: createContextWrapper(TripBuilderProvider),
      });

      expect(result.current.data.dates).toEqual({});
      expect(result.current.data.regions).toEqual([]);
      expect(result.current.data.cities).toEqual([]);
      // interests removed from TripBuilderData - now derived from vibes at point of use
      expect(result.current.data.vibes).toEqual([]);
      expect(result.current.data.style).toBeUndefined();
      expect(result.current.data.accessibility).toBeUndefined();
    });

    it("should initialize with provided initialData", () => {
      const initialData = {
        dates: { start: "2024-01-01", end: "2024-01-07" },
        regions: ["kansai"],
        cities: ["kyoto"],
        vibes: ["temples_tradition"], // vibes derive interests
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
      expect(result.current.data.vibes).toEqual(["temples_tradition"]);
      expect(result.current.data.style).toBe("balanced");
    });
  });

  describe("State updates", () => {
    it("should update data when setData is called", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: createContextWrapper(TripBuilderProvider),
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          regions: ["kansai", "kanto"],
        }));
      });

      expect(result.current.data.regions).toEqual(["kansai", "kanto"]);
    });

    it("should persist data to localStorage", async () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: createContextWrapper(TripBuilderProvider),
      });

      await testLocalStoragePersistence(
        "yuku_trip_builder",
        () => result.current.setData((prev) => ({ ...prev, regions: ["Kansai"] })),
        500,
        (parsed) => expect((parsed as { regions: string[] }).regions).toEqual(["Kansai"])
      );
    });
  });

  describe("Reset functionality", () => {
    it("should reset data to default values", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: createContextWrapper(TripBuilderProvider),
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          regions: ["Kansai"],
          cities: ["Kyoto"],
          interests: ["culture"],
        }));
      });

      expect(result.current.data.regions).toEqual(["Kansai"]);

      act(() => {
        result.current.reset();
      });

      expect(result.current.data.regions).toEqual([]);
      expect(result.current.data.cities).toEqual([]);
      // interests removed from TripBuilderData - now derived from vibes at point of use
      expect(result.current.data.vibes).toEqual([]);
    });
  });

  describe("Data sanitization", () => {
    it("should sanitize vibes to max 3", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: createContextWrapper(TripBuilderProvider),
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          vibes: ["temples_tradition", "foodie_paradise", "nature_adventure", "zen_wellness"],
        }));
      });

      contextAssertions.arrayLengthWithinBounds(result.current.data.vibes || [], 3);
    });

    it("should sanitize style to valid values", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: createContextWrapper(TripBuilderProvider),
      });

      act(() => {
        result.current.setData((prev) => ({ ...prev, style: "relaxed" as const }));
      });
      expect(result.current.data.style).toBe("relaxed");

      act(() => {
        result.current.setData((prev) => ({ ...prev, style: "invalid-style" as TripStyle }));
      });
      expect(result.current.data.style).toBeUndefined();
    });

    it("should trim dietaryOther and notes values", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: createContextWrapper(TripBuilderProvider),
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          accessibility: {
            dietary: ["vegetarian"],
            dietaryOther: "  custom diet  ",
            notes: "  extra notes  ",
          },
        }));
      });

      expect(result.current.data.accessibility?.dietaryOther).toBe("custom diet");
      expect(result.current.data.accessibility?.notes).toBe("extra notes");
    });

    it("should not include empty dietaryOther and notes after trimming", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: createContextWrapper(TripBuilderProvider),
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          accessibility: {
            mobility: true,
            dietary: [],
            dietaryOther: "   ",
            notes: "   ",
          },
        }));
      });

      expect(result.current.data.accessibility?.dietaryOther).toBeUndefined();
      expect(result.current.data.accessibility?.notes).toBeUndefined();
    });

    it("should deduplicate regions", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: createContextWrapper(TripBuilderProvider),
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          regions: ["kansai", "kanto", "kansai", "kanto", "tohoku"],
        }));
      });

      contextAssertions.arrayIsUnique(result.current.data.regions);
      expect(result.current.data.regions).toEqual(["kansai", "kanto", "tohoku"]);
    });

    it("should allow duplicate cities (return-to-airport pattern)", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: createContextWrapper(TripBuilderProvider),
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          cities: ["tokyo", "osaka", "tokyo"],
        }));
      });

      expect(result.current.data.cities).toEqual(["tokyo", "osaka", "tokyo"]);
    });

    it("should reject entry points with invalid coordinate bounds", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: createContextWrapper(TripBuilderProvider),
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          entryPoint: {
            type: "hotel",
            id: "custom-hotel",
            name: "Test Hotel",
            coordinates: { lat: 91, lng: 135 }, // Invalid: > 90
          },
        }));
      });

      expect(result.current.data.entryPoint).toBeUndefined();
    });

    it("should accept entry points with valid coordinate bounds", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: createContextWrapper(TripBuilderProvider),
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          entryPoint: {
            type: "airport",
            id: "NRT",
            name: "Narita International Airport",
            coordinates: { lat: 35.6762, lng: 139.6503 },
          },
        }));
      });

      expect(result.current.data.entryPoint).toBeDefined();
      expect(result.current.data.entryPoint?.coordinates.lat).toBe(35.6762);
      expect(result.current.data.entryPoint?.coordinates.lng).toBe(139.6503);
    });

    it("should reject entry points with NaN coordinates", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: createContextWrapper(TripBuilderProvider),
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          entryPoint: {
            type: "hotel",
            id: "custom-hotel",
            name: "Test Hotel",
            coordinates: { lat: NaN, lng: 139.6503 },
          },
        }));
      });

      expect(result.current.data.entryPoint).toBeUndefined();
    });

    it("should filter out empty region strings", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: createContextWrapper(TripBuilderProvider),
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          regions: ["kansai", "", "   ", "kanto"],
        }));
      });

      expect(result.current.data.regions).toEqual(["kansai", "kanto"]);
    });

    it("should filter out empty city strings", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: createContextWrapper(TripBuilderProvider),
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          cities: ["kyoto", "", "   ", "osaka"],
        }));
      });

      expect(result.current.data.cities).toEqual(["kyoto", "osaka"]);
    });

    it("should deduplicate dietary options", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: createContextWrapper(TripBuilderProvider),
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          accessibility: {
            dietary: ["vegetarian", "vegan", "vegetarian", "halal"],
          },
        }));
      });

      contextAssertions.arrayIsUnique(result.current.data.accessibility?.dietary || []);
      expect(result.current.data.accessibility?.dietary).toEqual(["vegetarian", "vegan", "halal"]);
    });

    it("should filter out invalid vibes and derive correct interests", () => {
      const { result } = renderHook(() => useTripBuilder(), {
        wrapper: createContextWrapper(TripBuilderProvider),
      });

      act(() => {
        result.current.setData((prev) => ({
          ...prev,
          // @ts-expect-error Testing invalid vibes
          vibes: ["temples_tradition", "invalid-vibe", "foodie_paradise"],
        }));
      });

      // Invalid vibes are filtered out
      expect(result.current.data.vibes).toEqual(["temples_tradition", "foodie_paradise"]);
    });
  });

  describe("Provider requirement", () => {
    it("should throw error when used outside provider", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTripBuilder());
      }).toThrow("useTripBuilder must be used within a TripBuilderProvider");

      consoleSpy.mockRestore();
    });
  });
});
