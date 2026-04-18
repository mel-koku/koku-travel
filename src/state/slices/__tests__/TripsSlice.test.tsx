import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { TripsProvider, useTrips } from "../TripsSlice";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TripsProvider>{children}</TripsProvider>
);

describe("TripsSlice", () => {
  it("creates a trip with a generated id", () => {
    const { result } = renderHook(() => useTrips(), { wrapper });
    let id = "";
    act(() => {
      id = result.current.actions.createTrip({
        name: "Tokyo trip",
        itinerary: { days: [] } as never,
        builderData: {} as never,
      });
    });
    expect(id).toBeTruthy();
    expect(result.current.state.trips).toHaveLength(1);
    expect(result.current.state.trips[0].name).toBe("Tokyo trip");
  });

  it("renames a trip", () => {
    const { result } = renderHook(() => useTrips(), { wrapper });
    let id = "";
    act(() => {
      id = result.current.actions.createTrip({
        name: "Tokyo trip",
        itinerary: { days: [] } as never,
        builderData: {} as never,
      });
    });
    act(() => result.current.actions.renameTrip(id, "Kyoto trip"));
    expect(result.current.state.trips[0].name).toBe("Kyoto trip");
  });

  it("deletes a trip and stamps localTripUpdatedAt", () => {
    const { result } = renderHook(() => useTrips(), { wrapper });
    let id = "";
    act(() => {
      id = result.current.actions.createTrip({
        name: "To delete",
        itinerary: { days: [] } as never,
        builderData: {} as never,
      });
    });
    act(() => result.current.actions.deleteTrip(id));
    expect(result.current.state.trips).toHaveLength(0);
    expect(result.current.state.localTripUpdatedAt[id]).toBeGreaterThan(0);
  });

  it("returns referentially stable actions across re-renders when state unchanged", () => {
    const { result, rerender } = renderHook(() => useTrips(), { wrapper });
    const first = result.current.actions;
    rerender();
    expect(result.current.actions).toBe(first);
  });

  it("updates prepState on an existing trip and preserves other fields", () => {
    const { result } = renderHook(() => useTrips(), { wrapper });
    let id = "";
    act(() => {
      id = result.current.actions.createTrip({
        name: "Tokyo trip",
        itinerary: { days: [] } as never,
        builderData: {} as never,
      });
    });
    act(() => {
      result.current.actions.updateTripPrepState(id, { "passport-validity": true });
    });
    const updated = result.current.state.trips[0]!;
    expect(updated.id).toBe(id);
    expect(updated.prepState).toEqual({ "passport-validity": true });
    expect(updated.name).toBe("Tokyo trip");
    expect(result.current.state.localTripUpdatedAt[id]).toBeGreaterThan(0);
  });

  it("updateTripPrepState is a no-op for unknown trip ids", () => {
    const { result } = renderHook(() => useTrips(), { wrapper });
    act(() => {
      result.current.actions.updateTripPrepState("nonexistent", { x: true });
    });
    expect(result.current.state.trips).toHaveLength(0);
  });

  it("resets to default state", () => {
    const { result } = renderHook(() => useTrips(), { wrapper });
    act(() => {
      result.current.actions.createTrip({
        name: "T",
        itinerary: { days: [] } as never,
        builderData: {} as never,
      });
    });
    act(() => result.current.actions.reset());
    expect(result.current.state.trips).toEqual([]);
    expect(result.current.state.dayEntryPoints).toEqual({});
    expect(result.current.state.cityAccommodations).toEqual({});
  });
});
