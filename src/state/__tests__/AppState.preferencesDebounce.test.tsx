import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { AppStateProvider, useAppState } from "../AppState";

// Mock Supabase client (truthy so the debounce path runs)
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

const syncPreferencesSave = vi.fn().mockResolvedValue({ success: true });
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
  syncPreferencesSave: (...args: unknown[]) => syncPreferencesSave(...args),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <AppStateProvider>{children}</AppStateProvider>;
}

describe("AppState — setUserPreferences debounce captures live state", () => {
  beforeEach(() => {
    localStorage.clear();
    syncPreferencesSave.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("syncs the merged state of two patches issued within the debounce window", async () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    act(() => {
      result.current.setUserPreferences({ defaultPace: "balanced" });
    });
    act(() => {
      result.current.setUserPreferences({ defaultGroupType: "couple" });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    expect(syncPreferencesSave).toHaveBeenCalledTimes(1);
    const sentPrefs = syncPreferencesSave.mock.calls[0][1];
    expect(sentPrefs).toMatchObject({
      defaultPace: "balanced",
      defaultGroupType: "couple",
    });
  });
});
