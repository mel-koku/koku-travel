import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { AppStateProvider, useAppState } from "@/state/AppState";
import { createMockSupabaseClient } from "../utils/mocks";
import { createClient } from "@/lib/supabase/client";
import type { MockSupabaseClient } from "../utils/mocks";
import type { StoredTrip } from "@/services/trip";

// Mock dependencies
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/savedStorage", () => ({
  loadSaved: vi.fn().mockReturnValue([]),
  SAVED_KEY: "yuku_saved",
}));

type SupabaseBrowserClient = ReturnType<typeof createClient>;
const toBrowserClient = (client: MockSupabaseClient): SupabaseBrowserClient =>
  client as unknown as SupabaseBrowserClient;

describe("AppState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
    const mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockReturnValue(toBrowserClient(mockSupabase));
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  describe("localStorage persistence", () => {
    it("should load state from localStorage on mount", async () => {
      const persistedState = {
        user: { id: "test-id", displayName: "Test User" },
        saved: ["place-1", "place-2"],
        guideBookmarks: ["guide-1"],
        trips: [],
      };
      localStorage.setItem("yuku_app_state_v1", JSON.stringify(persistedState));

      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      // Wait for mount effects to complete
      await waitFor(() => {
        expect(result.current.user.displayName).toBe("Test User");
      });

      expect(result.current.user.displayName).toBe("Test User");
      expect(result.current.saved).toEqual(["place-1", "place-2"]);
      expect(result.current.guideBookmarks).toEqual(["guide-1"]);
    });

    it("should persist state changes to localStorage", async () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      // Wait for mount effects
      await waitFor(() => {
        expect(result.current.user).toBeDefined();
      });

      act(() => {
        result.current.setUser({ displayName: "Updated Name" });
      });

      // Wait for debounced write (500ms)
      await waitFor(
        () => {
          const stored = localStorage.getItem("yuku_app_state_v1");
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

      // Wait for mount effects
      await waitFor(() => {
        expect(result.current.user).toBeDefined();
      });

      act(() => {
        result.current.setUser({ displayName: "Test" });
      });

      await waitFor(
        () => {
          const stored = localStorage.getItem("yuku_app_state_v1");
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
      // Clear localStorage before test
      localStorage.clear();
      
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      // Wait for initial mount effects to complete and clear any initial writes
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      
      // Clear localStorage after initial mount to ensure clean state
      localStorage.clear();

      act(() => {
        result.current.setUser({ displayName: "First" });
      });

      // Should not be written immediately
      expect(localStorage.getItem("yuku_app_state_v1")).toBeNull();

      act(() => {
        result.current.setUser({ displayName: "Second" });
      });

      // Fast-forward 500ms
      await act(async () => {
        vi.advanceTimersByTime(500);
        await vi.runAllTimersAsync();
      });

      // Check localStorage directly (no waitFor needed with fake timers)
      const stored = localStorage.getItem("yuku_app_state_v1");
      expect(stored).toBeTruthy();
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.user.displayName).toBe("Second");
      }

      vi.useRealTimers();
    });
  });

  describe("state updates", () => {
    it("should update user profile", async () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      // Wait for mount effects
      await waitFor(() => {
        expect(result.current.user).toBeDefined();
      });

      act(() => {
        result.current.setUser({ displayName: "New Name" });
      });

      expect(result.current.user.displayName).toBe("New Name");
    });

    it("should toggle saved", async () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      // Wait for mount effects
      await waitFor(() => {
        expect(result.current.user).toBeDefined();
      });

      expect(result.current.isSaved("place-1")).toBe(false);

      act(() => {
        result.current.toggleSave("place-1");
      });

      expect(result.current.isSaved("place-1")).toBe(true);

      // Wait for the pending sync from the first toggle to resolve
      // so the double-toggle guard (pendingSavesRef) clears
      await waitFor(() => {
        act(() => {
          result.current.toggleSave("place-1");
        });
        expect(result.current.isSaved("place-1")).toBe(false);
      });
    });

    it("should create trip", async () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      // Wait for mount effects
      await waitFor(() => {
        expect(result.current.user).toBeDefined();
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

    it("should update trip itinerary", async () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      // Wait for mount effects
      await waitFor(() => {
        expect(result.current.user).toBeDefined();
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

    it("should rename trip", async () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      // Wait for mount effects
      await waitFor(() => {
        expect(result.current.user).toBeDefined();
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

    it("should delete trip", async () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      // Wait for mount effects
      await waitFor(() => {
        expect(result.current.user).toBeDefined();
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

  describe("sync race mitigation", () => {
    it("local rename survives refreshFromSupabase with stale server data", async () => {
      // Mock sync services so we can control what the server returns
      const syncModule = await import("@/services/sync");
      const fetchTripsSpy = vi.spyOn(syncModule, "fetchTrips");
      const fetchSavedSpy = vi.spyOn(syncModule, "fetchSaved");
      const fetchBookmarksSpy = vi.spyOn(syncModule, "fetchGuideBookmarks");
      const fetchPrefsSpy = vi.spyOn(syncModule, "fetchPreferences");
      vi.spyOn(syncModule, "syncTripSave").mockResolvedValue({ success: true, data: {} as StoredTrip });

      // Set up authenticated user so refreshFromSupabase actually fetches
      const mockSupabase = createMockSupabaseClient();
      const mockUser = { id: "user-1", email: "test@example.com", user_metadata: { full_name: "Test User" } };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      vi.mocked(createClient).mockReturnValue(toBrowserClient(mockSupabase));

      // Start with no server trips on initial mount
      fetchSavedSpy.mockResolvedValue({ success: true, data: [] });
      fetchBookmarksSpy.mockResolvedValue({ success: true, data: [] });
      fetchPrefsSpy.mockResolvedValue({ success: true, data: null });
      fetchTripsSpy.mockResolvedValue({ success: true, data: [] });

      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      await waitFor(() => {
        expect(result.current.user.email).toBe("test@example.com");
      });

      // Create and rename a trip locally
      const builderData = { dates: {}, regions: [], cities: [], interests: [] };
      let tripId: string;
      act(() => {
        tripId = result.current.createTrip({
          name: "Original Name",
          itinerary: { days: [] },
          builderData,
        });
      });

      act(() => {
        result.current.renameTrip(tripId!, "Renamed Locally");
      });

      expect(result.current.getTripById(tripId!)?.name).toBe("Renamed Locally");

      // Now simulate a server refresh returning STALE data (old name, old timestamp)
      const staleServerTrip: StoredTrip = {
        id: tripId!,
        name: "Original Name",
        createdAt: new Date(Date.now() - 60000).toISOString(),
        updatedAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
        itinerary: { days: [] },
        builderData,
        unlockedAt: null,
        unlockTier: null,
        stripeSessionId: null,
        unlockAmountCents: null,
        freeRefinementsUsed: 0,
      };
      fetchTripsSpy.mockResolvedValue({ success: true, data: [staleServerTrip] });

      // Trigger a refresh (simulates tab focus, auth state change, etc.)
      await act(async () => {
        await result.current.refreshFromSupabase();
      });

      // The local rename must survive -- stale server data must NOT overwrite it
      expect(result.current.getTripById(tripId!)?.name).toBe("Renamed Locally");

      // Cleanup spies
      fetchTripsSpy.mockRestore();
      fetchSavedSpy.mockRestore();
      fetchBookmarksSpy.mockRestore();
      fetchPrefsSpy.mockRestore();
    });

    it("server data wins when no local edit is pending", async () => {
      const syncModule = await import("@/services/sync");
      const fetchTripsSpy = vi.spyOn(syncModule, "fetchTrips");
      const fetchSavedSpy = vi.spyOn(syncModule, "fetchSaved");
      const fetchBookmarksSpy = vi.spyOn(syncModule, "fetchGuideBookmarks");
      const fetchPrefsSpy = vi.spyOn(syncModule, "fetchPreferences");
      vi.spyOn(syncModule, "syncTripSave").mockResolvedValue({ success: true, data: {} as StoredTrip });

      const mockSupabase = createMockSupabaseClient();
      const mockUser = { id: "user-2", email: "test2@example.com", user_metadata: { full_name: "Test" } };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      vi.mocked(createClient).mockReturnValue(toBrowserClient(mockSupabase));

      fetchSavedSpy.mockResolvedValue({ success: true, data: [] });
      fetchBookmarksSpy.mockResolvedValue({ success: true, data: [] });
      fetchPrefsSpy.mockResolvedValue({ success: true, data: null });
      fetchTripsSpy.mockResolvedValue({ success: true, data: [] });

      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      await waitFor(() => {
        expect(result.current.user.email).toBe("test2@example.com");
      });

      const builderData = { dates: {}, regions: [], cities: [], interests: [] };
      let tripId: string;
      act(() => {
        tripId = result.current.createTrip({
          name: "Local Name",
          itinerary: { days: [] },
          builderData,
        });
      });

      // Server returns a NEWER version of the same trip (no pending local edit guard)
      // The trip was just created (no rename/update that sets localTripUpdatedAt beyond
      // what createTrip sets). createTrip does NOT set localTripUpdatedAt, so server wins.
      const newerServerTrip: StoredTrip = {
        id: tripId!,
        name: "Server Renamed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date(Date.now() + 60000).toISOString(), // Future timestamp
        itinerary: { days: [{ activities: [] }] },
        builderData,
        unlockedAt: null,
        unlockTier: null,
        stripeSessionId: null,
        unlockAmountCents: null,
        freeRefinementsUsed: 0,
      };
      fetchTripsSpy.mockResolvedValue({ success: true, data: [newerServerTrip] });

      await act(async () => {
        await result.current.refreshFromSupabase();
      });

      // Server data should win since there was no pending local mutation
      expect(result.current.getTripById(tripId!)?.name).toBe("Server Renamed");

      fetchTripsSpy.mockRestore();
      fetchSavedSpy.mockRestore();
      fetchBookmarksSpy.mockRestore();
      fetchPrefsSpy.mockRestore();
    });

    it("deleteTrip cleans up localTripUpdatedAt (no orphaned timestamps)", async () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toBeDefined();
      });

      const builderData = { dates: {}, regions: [], cities: [], interests: [] };
      let tripId: string;
      act(() => {
        tripId = result.current.createTrip({
          name: "Doomed Trip",
          itinerary: { days: [] },
          builderData,
        });
      });

      // Rename sets localTripUpdatedAt
      act(() => {
        result.current.renameTrip(tripId!, "Still Doomed");
      });

      // Delete should remove the trip AND clean up the timestamp
      act(() => {
        result.current.deleteTrip(tripId!);
      });

      expect(result.current.getTripById(tripId!)).toBeUndefined();
    });

    it("localTripUpdatedAt is excluded from localStorage persistence", async () => {
      vi.useFakeTimers();
      localStorage.clear();

      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      const builderData = { dates: {}, regions: [], cities: [], interests: [] };
      let tripId: string;
      act(() => {
        tripId = result.current.createTrip({
          name: "Test Trip",
          itinerary: { days: [] },
          builderData,
        });
      });

      // Rename sets localTripUpdatedAt
      act(() => {
        result.current.renameTrip(tripId!, "Renamed");
      });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await vi.runAllTimersAsync();
      });

      const stored = localStorage.getItem("yuku_app_state_v1");
      expect(stored).toBeTruthy();
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed).not.toHaveProperty("localTripUpdatedAt");
      }

      vi.useRealTimers();
    });
  });

  describe("selective state persistence", () => {
    it("should only persist user, saved, guideBookmarks, and trips", async () => {
      vi.useFakeTimers();
      localStorage.clear();

      const { result } = renderHook(() => useAppState(), {
        wrapper: AppStateProvider,
      });

      // Wait for initial mount
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      act(() => {
        result.current.setUser({ displayName: "Test" });
        result.current.toggleSave("place-1");
      });

      // Advance timers to trigger debounced write
      await act(async () => {
        vi.advanceTimersByTime(500);
        await vi.runAllTimersAsync();
      });

      // Check localStorage directly (no waitFor needed with fake timers)
      const stored = localStorage.getItem("yuku_app_state_v1");
      expect(stored).toBeTruthy();
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed).toHaveProperty("user");
        expect(parsed).toHaveProperty("saved");
        expect(parsed).toHaveProperty("guideBookmarks");
        expect(parsed).toHaveProperty("trips");
        expect(parsed).not.toHaveProperty("isLoadingRefresh");
        expect(parsed).not.toHaveProperty("loadingBookmarks");
        expect(parsed).not.toHaveProperty("localTripUpdatedAt");
      }

      vi.useRealTimers();
    });
  });
});

