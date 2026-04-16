import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { EditHistoryProvider, useEditHistorySlice } from "../EditHistorySlice";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <EditHistoryProvider>{children}</EditHistoryProvider>
);

describe("EditHistorySlice", () => {
  it("starts with empty history", () => {
    const { result } = renderHook(() => useEditHistorySlice(), { wrapper });
    expect(result.current.state.editHistory).toEqual({});
    expect(result.current.state.currentHistoryIndex).toEqual({});
  });

  it("sets history and index atomically for a trip", () => {
    const { result } = renderHook(() => useEditHistorySlice(), { wrapper });
    const fakeEdits = [{ type: "replaceActivity" }] as never[];
    act(() => {
      result.current.actions.setHistoryAndIndex("trip-1", fakeEdits, 0);
    });
    expect(result.current.state.editHistory["trip-1"]).toEqual(fakeEdits);
    expect(result.current.state.currentHistoryIndex["trip-1"]).toBe(0);
  });

  it("prunes history for a specific trip", () => {
    const { result } = renderHook(() => useEditHistorySlice(), { wrapper });
    act(() => {
      result.current.actions.setHistoryAndIndex("t1", [{ type: "add" }] as never[], 0);
      result.current.actions.setHistoryAndIndex("t2", [{ type: "delete" }] as never[], 0);
    });
    act(() => result.current.actions.pruneForTrip("t1"));
    expect(result.current.state.editHistory["t1"]).toBeUndefined();
    expect(result.current.state.currentHistoryIndex["t1"]).toBeUndefined();
    expect(result.current.state.editHistory["t2"]).toBeDefined();
  });

  it("returns referentially stable actions when state unchanged", () => {
    const { result, rerender } = renderHook(() => useEditHistorySlice(), { wrapper });
    const first = result.current.actions;
    rerender();
    expect(result.current.actions).toBe(first);
  });

  it("resets to empty state", () => {
    const { result } = renderHook(() => useEditHistorySlice(), { wrapper });
    act(() => {
      result.current.actions.setHistoryAndIndex("t1", [{ type: "add" }] as never[], 0);
    });
    act(() => result.current.actions.reset());
    expect(result.current.state.editHistory).toEqual({});
  });
});
