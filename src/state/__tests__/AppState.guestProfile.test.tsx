import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import { AppStateProvider, useAppState } from "../AppState";

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

describe("AppState — guest user profile", () => {
  it("the seeded default user has no email so !!user.email correctly identifies guests", () => {
    // Regression for: ItineraryShell.fullAccessEnabled was gating on `!!user`,
    // which is always true because AppState seeds a Guest profile object.
    // The correct guard is `!!user.email`. If a future change adds an email
    // to the default profile, the promo-day gating would silently break.
    const { result } = renderHook(() => useAppState(), { wrapper });
    expect(result.current.user).toBeDefined();
    expect(result.current.user.email).toBeUndefined();
    expect(Boolean(result.current.user.email)).toBe(false);
  });
});
