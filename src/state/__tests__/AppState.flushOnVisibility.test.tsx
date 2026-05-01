import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { AppStateProvider, useAppState } from "../AppState";
import type { Itinerary } from "@/types/itinerary";

// Mock Supabase client (truthy so the flush effect mounts)
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

vi.mock("@/lib/savedStorage", () => ({
  loadSaved: vi.fn().mockReturnValue([]),
}));

const syncTripSave = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/services/sync", () => ({
  syncSavedToggle: vi.fn().mockResolvedValue({ success: true }),
  syncBookmarkToggle: vi.fn().mockResolvedValue({ success: true }),
  fetchSaved: vi.fn().mockResolvedValue({ success: true, data: [] }),
  fetchGuideBookmarks: vi.fn().mockResolvedValue({ success: true, data: [] }),
  fetchTrips: vi.fn().mockResolvedValue({ success: true, data: [] }),
  syncTripSave: (...args: unknown[]) => syncTripSave(...args),
  syncTripDelete: vi.fn().mockResolvedValue({ success: true }),
  mergeTrips: vi.fn((local: unknown[]) => local),
  fetchPreferences: vi.fn().mockResolvedValue({ success: true, data: null }),
  syncPreferencesSave: vi.fn().mockResolvedValue({ success: true }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <AppStateProvider>{children}</AppStateProvider>;
}

describe("AppState — visibilitychange flushes debounced trip syncs", () => {
  beforeEach(() => {
    localStorage.clear();
    syncTripSave.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("flushes a debounced sync from updateTripItinerary the moment the tab is hidden, instead of waiting the 2s window", async () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    // createTrip fires syncTripSave immediately via queueMicrotask — that's
    // the SETUP, not the thing we're testing. Settle it and reset the spy.
    let tripId = "";
    act(() => {
      tripId = result.current.createTrip({
        name: "Test Trip",
        builderData: {},
      } as Parameters<typeof result.current.createTrip>[0]);
    });
    await act(async () => {
      await Promise.resolve();
    });
    syncTripSave.mockClear();

    // updateTripItinerary goes through scheduleTripSync, which sets a 2s
    // setTimeout into tripSyncTimeouts. Without the flush handler, sync
    // would not fire until that timeout elapses.
    const minimalItinerary = { days: [] } as unknown as Itinerary;
    act(() => {
      result.current.updateTripItinerary(tripId, minimalItinerary);
    });

    // 100ms in: debounce hasn't fired. Without flush, no sync should exist.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(syncTripSave).not.toHaveBeenCalled();

    // Hide the tab. The flush handler should drain tripSyncTimeouts now,
    // 1900ms before the debounce would have fired on its own.
    act(() => {
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(syncTripSave).toHaveBeenCalledTimes(1);
  });
});
