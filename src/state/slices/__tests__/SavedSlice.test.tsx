import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { SavedProvider, useSaved } from "../SavedSlice";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SavedProvider>{children}</SavedProvider>
);

describe("SavedSlice", () => {
  it("toggles a saved id on and off", () => {
    const { result } = renderHook(() => useSaved(), { wrapper });
    expect(result.current.state.saved).toEqual([]);

    act(() => result.current.actions.toggleSave("loc-1"));
    expect(result.current.state.saved).toEqual(["loc-1"]);
    expect(result.current.actions.isSaved("loc-1")).toBe(true);

    act(() => result.current.actions.toggleSave("loc-1"));
    expect(result.current.state.saved).toEqual([]);
    expect(result.current.actions.isSaved("loc-1")).toBe(false);
  });

  it("toggles a guide bookmark on and off", () => {
    const { result } = renderHook(() => useSaved(), { wrapper });
    act(() => result.current.actions.toggleGuideBookmark("guide-1"));
    expect(result.current.state.guideBookmarks).toEqual(["guide-1"]);
    act(() => result.current.actions.toggleGuideBookmark("guide-1"));
    expect(result.current.state.guideBookmarks).toEqual([]);
  });

  it("returns a referentially stable actions object across re-renders when state is unchanged", () => {
    const { result, rerender } = renderHook(() => useSaved(), { wrapper });
    const firstActions = result.current.actions;
    rerender();
    expect(result.current.actions).toBe(firstActions);
  });

  it("resets to default state", () => {
    const { result } = renderHook(() => useSaved(), { wrapper });
    act(() => result.current.actions.toggleSave("loc-1"));
    act(() => result.current.actions.toggleGuideBookmark("guide-1"));
    act(() => result.current.actions.reset());
    expect(result.current.state.saved).toEqual([]);
    expect(result.current.state.guideBookmarks).toEqual([]);
  });
});
