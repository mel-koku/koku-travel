import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { AppStateProvider, useAppState } from "@/state/AppState";
import { createMockSupabaseClient } from "../utils/mocks";
import { createClient } from "@/lib/supabase/client";

// Mock dependencies
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/wishlistStorage", () => ({
  loadWishlist: vi.fn().mockReturnValue([]),
  WISHLIST_KEY: "koku_wishlist",
}));

describe("AppState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
    const mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  describe("localStorage persistence", () => {
    it("should load state from localStorage on mount", () => {
      const savedState = {
        user: { id: "test-id", displayName: "Test User", locale: "en" as const },
        favorites: ["place-1", "place-2"],
        guideBookmarks: ["guide-1"],
        trips: [],
      };
      localStorage.setItem("koku_app_state_v1", JSON.stringify(savedState));

      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      expect(result.current.user.displayName).toBe("Test User");
      expect(result.current.favorites).toEqual(["place-1", "place-2"]);
      expect(result.current.guideBookmarks).toEqual(["guide-1"]);
    });

    it("should persist state changes to localStorage", async () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      act(() => {
        result.current.setUser({ displayName: "Updated Name" });
      });

      // Wait for debounced write (500ms)
      await waitFor(
        () => {
          const stored = localStorage.getItem("koku_app_state_v1");
          expect(stored).toBeTruthy();
          if (stored) {
            const parsed = JSON.parse(stored);
            expect(parsed.user.displayName).toBe("Updated Name");
          }
        },
        { timeout: 1000 },
      );
    });

    it("should exclude loading states from persistence", async () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      act(() => {
        result.current.setUser({ displayName: "Test" });
      });

      await waitFor(
        () => {
          const stored = localStorage.getItem("koku_app_state_v1");
          if (stored) {
            const parsed = JSON.parse(stored);
            expect(parsed.isLoadingRefresh).toBeUndefined();
            expect(parsed.loadingBookmarks).toBeUndefined();
          }
        },
        { timeout: 1000 },
      );
    });
  });

  describe("debounced writes", () => {
    it("should debounce localStorage writes by 500ms", async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      act(() => {
        result.current.setUser({ displayName: "First" });
      });

      // Should not be written immediately
      expect(localStorage.getItem("koku_app_state_v1")).toBeNull();

      act(() => {
        result.current.setUser({ displayName: "Second" });
      });

      // Fast-forward 500ms
      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        const stored = localStorage.getItem("koku_app_state_v1");
        expect(stored).toBeTruthy();
        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed.user.displayName).toBe("Second");
        }
      });

      vi.useRealTimers();
    });
  });

  describe("state updates", () => {
    it("should update user profile", () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      act(() => {
        result.current.setUser({ displayName: "New Name", locale: "jp" });
      });

      expect(result.current.user.displayName).toBe("New Name");
      expect(result.current.user.locale).toBe("jp");
    });

    it("should toggle favorites", () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      expect(result.current.isFavorite("place-1")).toBe(false);

      act(() => {
        result.current.toggleFavorite("place-1");
      });

      expect(result.current.isFavorite("place-1")).toBe(true);

      act(() => {
        result.current.toggleFavorite("place-1");
      });

      expect(result.current.isFavorite("place-1")).toBe(false);
    });

    it("should create trip", () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      const itinerary = { days: [] };
      const builderData = { dates: {}, regions: [], cities: [], interests: [] };

      let tripId: string;
      act(() => {
        tripId = result.current.createTrip({
          name: "Test Trip",
          itinerary,
          builderData,
        });
      });

      expect(tripId!).toBeTruthy();
      const trip = result.current.getTripById(tripId!);
      expect(trip).toBeDefined();
      expect(trip?.name).toBe("Test Trip");
    });

    it("should update trip itinerary", () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      const itinerary1 = { days: [] };
      const itinerary2 = { days: [{ activities: [] }] };
      const builderData = { dates: {}, regions: [], cities: [], interests: [] };

      let tripId: string;
      act(() => {
        tripId = result.current.createTrip({
          name: "Test Trip",
          itinerary: itinerary1,
          builderData,
        });
      });

      act(() => {
        result.current.updateTripItinerary(tripId!, itinerary2);
      });

      const trip = result.current.getTripById(tripId!);
      expect(trip?.itinerary.days).toHaveLength(1);
    });

    it("should rename trip", () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      const itinerary = { days: [] };
      const builderData = { dates: {}, regions: [], cities: [], interests: [] };

      let tripId: string;
      act(() => {
        tripId = result.current.createTrip({
          name: "Old Name",
          itinerary,
          builderData,
        });
      });

      act(() => {
        result.current.renameTrip(tripId!, "New Name");
      });

      const trip = result.current.getTripById(tripId!);
      expect(trip?.name).toBe("New Name");
    });

    it("should delete trip", () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      const itinerary = { days: [] };
      const builderData = { dates: {}, regions: [], cities: [], interests: [] };

      let tripId: string;
      act(() => {
        tripId = result.current.createTrip({
          name: "Test Trip",
          itinerary,
          builderData,
        });
      });

      expect(result.current.getTripById(tripId!)).toBeDefined();

      act(() => {
        result.current.deleteTrip(tripId!);
      });

      expect(result.current.getTripById(tripId!)).toBeUndefined();
    });
  });

  describe("selective state persistence", () => {
    it("should only persist user, favorites, guideBookmarks, and trips", async () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      act(() => {
        result.current.setUser({ displayName: "Test" });
        result.current.toggleFavorite("place-1");
      });

      await waitFor(
        () => {
          const stored = localStorage.getItem("koku_app_state_v1");
          if (stored) {
            const parsed = JSON.parse(stored);
            expect(parsed).toHaveProperty("user");
            expect(parsed).toHaveProperty("favorites");
            expect(parsed).toHaveProperty("guideBookmarks");
            expect(parsed).toHaveProperty("trips");
            expect(parsed).not.toHaveProperty("isLoadingRefresh");
            expect(parsed).not.toHaveProperty("loadingBookmarks");
          }
        },
        { timeout: 1000 },
      );
    });
  });
});

