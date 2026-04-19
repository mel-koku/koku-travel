import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { AppStateProvider, useAppState } from "../AppState";

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  }),
}));

// Mock saved storage
vi.mock("@/lib/savedStorage", () => ({
  loadSaved: vi.fn().mockReturnValue([]),
}));

// Mock sync services
vi.mock("@/services/sync", () => ({
  syncSavedToggle: vi.fn().mockResolvedValue({ success: true }),
  syncBookmarkToggle: vi.fn().mockResolvedValue({ success: true }),
  fetchSaved: vi.fn().mockResolvedValue({ success: true, data: [] }),
  fetchGuideBookmarks: vi.fn().mockResolvedValue({ success: true, data: [] }),
  fetchTrips: vi.fn().mockResolvedValue({ success: true, data: [] }),
  syncTripSave: vi.fn().mockResolvedValue({ success: true }),
  syncTripDelete: vi.fn().mockResolvedValue({ success: true }),
  mergeTrips: vi.fn((local: unknown[]) => local),
  fetchPreferences: vi.fn().mockResolvedValue({ success: true, data: null }),
  syncPreferencesSave: vi.fn().mockResolvedValue({ success: true }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <AppStateProvider>{children}</AppStateProvider>;
}

describe("AppState shim (useAppState)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // -----------------------------------------------------------------------
  // a. All legacy fields and actions are present
  // -----------------------------------------------------------------------
  it("exposes every property and method defined in AppStateShape", () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    const api = result.current;

    // State fields
    expect(api).toHaveProperty("user");
    expect(api).toHaveProperty("saved");
    expect(api).toHaveProperty("guideBookmarks");
    expect(api).toHaveProperty("userPreferences");
    expect(api).toHaveProperty("trips");
    expect(api).toHaveProperty("isLoadingRefresh");
    expect(api).toHaveProperty("loadingBookmarks");
    expect(api).toHaveProperty("dayEntryPoints");
    expect(api).toHaveProperty("cityAccommodations");
    expect(api).toHaveProperty("editHistory");
    expect(api).toHaveProperty("currentHistoryIndex");

    // Actions
    expect(typeof api.setUser).toBe("function");
    expect(typeof api.setUserPreferences).toBe("function");
    expect(typeof api.toggleSave).toBe("function");
    expect(typeof api.isSaved).toBe("function");
    expect(typeof api.toggleGuideBookmark).toBe("function");
    expect(typeof api.isGuideBookmarked).toBe("function");
    expect(typeof api.createTrip).toBe("function");
    expect(typeof api.updateTripItinerary).toBe("function");
    expect(typeof api.renameTrip).toBe("function");
    expect(typeof api.deleteTrip).toBe("function");
    expect(typeof api.restoreTrip).toBe("function");
    expect(typeof api.getTripById).toBe("function");
    expect(typeof api.setDayEntryPoint).toBe("function");
    expect(typeof api.setCityAccommodation).toBe("function");
    expect(typeof api.replaceActivity).toBe("function");
    expect(typeof api.deleteActivity).toBe("function");
    expect(typeof api.reorderActivities).toBe("function");
    expect(typeof api.addActivity).toBe("function");
    expect(typeof api.updateDayActivities).toBe("function");
    expect(typeof api.undo).toBe("function");
    expect(typeof api.redo).toBe("function");
    expect(typeof api.canUndo).toBe("function");
    expect(typeof api.canRedo).toBe("function");
    expect(typeof api.clearAllLocalData).toBe("function");
    expect(typeof api.refreshFromSupabase).toBe("function");
  });

  // -----------------------------------------------------------------------
  // b. deleteTrip prunes edit history
  // -----------------------------------------------------------------------
  it("deleteTrip removes edit history for that trip", () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    // Create a trip
    let tripId: string;
    act(() => {
      tripId = result.current.createTrip({
        name: "Test Trip",
        itinerary: { days: [{ id: "d1", date: "2026-05-01", cityId: "tokyo", activities: [] }] } as never,
        builderData: {} as never,
      });
    });

    // Add an activity to produce edit history
    const activity = {
      id: "a1",
      locationId: "loc-1",
      name: "Test",
      category: "culture",
      estimatedDuration: 60,
      scheduledTime: "10:00",
    };
    act(() => {
      result.current.addActivity(tripId!, "d1", activity as never);
    });

    // Verify history exists
    expect(Object.keys(result.current.editHistory).length).toBeGreaterThanOrEqual(0);

    // Delete the trip
    act(() => {
      result.current.deleteTrip(tripId!);
    });

    // History for this trip should be pruned
    expect(result.current.editHistory[tripId!]).toBeUndefined();
    expect(result.current.currentHistoryIndex[tripId!]).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // c. clearAllLocalData resets all four slices
  // -----------------------------------------------------------------------
  it("clearAllLocalData resets state to defaults", () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    // Make some state changes
    act(() => {
      result.current.toggleSave("place-1");
      result.current.setUser({ displayName: "Someone" });
    });

    expect(result.current.saved).toContain("place-1");
    expect(result.current.user.displayName).toBe("Someone");

    // Clear
    act(() => {
      result.current.clearAllLocalData();
    });

    expect(result.current.saved).toEqual([]);
    expect(result.current.trips).toEqual([]);
    expect(result.current.editHistory).toEqual({});
    expect(result.current.user.displayName).toBe("Guest");
  });

  // -----------------------------------------------------------------------
  // d. replaceActivity updates both trips and history
  // -----------------------------------------------------------------------
  it("replaceActivity updates trip itinerary and adds edit history entry", () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    const activity = {
      id: "a1",
      locationId: "loc-1",
      name: "Original",
      category: "culture",
      estimatedDuration: 60,
      scheduledTime: "10:00",
    };

    let tripId: string;
    act(() => {
      tripId = result.current.createTrip({
        name: "Test Trip",
        itinerary: {
          days: [{
            id: "d1",
            date: "2026-05-01",
            cityId: "tokyo",
            activities: [activity],
          }],
        } as never,
        builderData: {} as never,
      });
    });

    const updated = { ...activity, name: "Replaced" };
    act(() => {
      result.current.replaceActivity(tripId!, "d1", "a1", updated as never);
    });

    // Trip itinerary should have the replaced activity
    const trip = result.current.getTripById(tripId!);
    expect(trip).toBeDefined();
    expect(trip!.itinerary.days[0].activities[0].name).toBe("Replaced");

    // Edit history should have a new entry
    expect(result.current.editHistory[tripId!]?.length).toBeGreaterThanOrEqual(1);
  });

  // -----------------------------------------------------------------------
  // e. Actions object is referentially stable when no state changed
  // -----------------------------------------------------------------------
  it("actions are referentially stable across renders with no state change", () => {
    const { result, rerender } = renderHook(() => useAppState(), { wrapper });

    const first = result.current;
    rerender();
    const second = result.current;

    // Core action functions should be the same references
    expect(first.setUser).toBe(second.setUser);
    expect(first.createTrip).toBe(second.createTrip);
    expect(first.clearAllLocalData).toBe(second.clearAllLocalData);
  });

  // -----------------------------------------------------------------------
  // f. Hydrates state from localStorage on mount
  // -----------------------------------------------------------------------
  it("hydrates state from localStorage on mount", () => {
    // Seed localStorage with persisted state
    localStorage.setItem(
      "yuku_app_state_v1",
      JSON.stringify({
        user: { id: "u-123", displayName: "Test User" },
        saved: ["loc-1", "loc-2"],
        guideBookmarks: ["guide-1"],
        userPreferences: { dietaryRestrictions: ["vegetarian"], accessibilityNeeds: {}, accommodationStyle: [], defaultVibes: [], learnedVibes: {} },
        trips: [],
        dayEntryPoints: {},
        cityAccommodations: {},
        editHistory: {},
        currentHistoryIndex: {},
      }),
    );

    const { result } = renderHook(() => useAppState(), { wrapper });

    expect(result.current.saved).toEqual(["loc-1", "loc-2"]);
    expect(result.current.guideBookmarks).toEqual(["guide-1"]);
    expect(result.current.user.displayName).toBe("Test User");
    expect(result.current.userPreferences.dietaryRestrictions).toEqual(["vegetarian"]);
  });
});
