import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { AppStateProvider, useAppState } from "../AppState";

// Mock Supabase client (truthy so the sync path runs)
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

describe("AppState — createTrip syncs synchronously without ref roundtrip", () => {
  beforeEach(() => {
    localStorage.clear();
    syncTripSave.mockClear();
  });

  it("calls syncTripSave with the new trip during the same act() — no microtask drain required", () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    let tripId = "";
    act(() => {
      tripId = result.current.createTrip({
        name: "Tokyo trip",
        builderData: {},
      } as Parameters<typeof result.current.createTrip>[0]);

      // Pre-fix: queueMicrotask deferred the sync until AFTER this act() block
      // returns, AND tripsRef.current would be stale at that point — sync
      // either fired with undefined or never fired at all.
      // Post-fix: sync fires synchronously with the freshly-built StoredTrip
      // returned by the slice, so it's already been called by this point.
      expect(syncTripSave).toHaveBeenCalledTimes(1);
      expect(syncTripSave).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: tripId, name: "Tokyo trip" }),
      );
    });

    expect(tripId).toBeTruthy();
  });
});
