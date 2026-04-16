import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { PreferencesProvider, usePreferences } from "../PreferencesSlice";
import { DEFAULT_USER_PREFERENCES } from "@/types/userPreferences";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PreferencesProvider>{children}</PreferencesProvider>
);

describe("PreferencesSlice", () => {
  it("seeds with DEFAULT_USER_PREFERENCES", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.state.userPreferences).toEqual(DEFAULT_USER_PREFERENCES);
  });

  it("merges partial preference updates", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => result.current.actions.setUserPreferences({ defaultPace: "fast" }));
    expect(result.current.state.userPreferences.defaultPace).toBe("fast");
  });

  it("updates user profile patchwise", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => result.current.actions.setUser({ displayName: "Mel" }));
    expect(result.current.state.user.displayName).toBe("Mel");
  });

  it("returns referentially stable actions across re-renders when state unchanged", () => {
    const { result, rerender } = renderHook(() => usePreferences(), { wrapper });
    const firstActions = result.current.actions;
    rerender();
    expect(result.current.actions).toBe(firstActions);
  });

  it("resets to defaults", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => result.current.actions.setUser({ displayName: "Mel" }));
    act(() => result.current.actions.setUserPreferences({ defaultPace: "fast" }));
    act(() => result.current.actions.reset());
    expect(result.current.state.userPreferences).toEqual(DEFAULT_USER_PREFERENCES);
    expect(result.current.state.user.displayName).toBe("Guest");
  });
});
