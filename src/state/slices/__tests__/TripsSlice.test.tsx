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

  it("setDayEntryPoint(undefined) marks the side as explicitly cleared", () => {
    // Regression: KOK-27. Clearing a day's start/end via the X button must
    // record an explicit-clear flag so the resolution layer can suppress the
    // city-level accommodation fallback. Without this, the X looks dead and
    // the input never re-renders.
    const { result } = renderHook(() => useTrips(), { wrapper });
    const tripId = "trip-1";
    const dayId = "day-1";
    const key = `${tripId}-${dayId}`;
    const accommodation = {
      type: "accommodation" as const,
      id: "sheraton-osaka",
      name: "Sheraton Miyako Hotel Osaka",
      coordinates: { lat: 34.65, lng: 135.52 },
    };

    act(() => {
      result.current.actions.setDayEntryPoint(tripId, dayId, "start", accommodation);
    });
    expect(result.current.state.dayEntryPoints[key]?.startPoint).toEqual(accommodation);
    expect(result.current.state.dayEntryPoints[key]?.clearedStart).toBe(false);

    act(() => {
      result.current.actions.setDayEntryPoint(tripId, dayId, "start", undefined);
    });
    expect(result.current.state.dayEntryPoints[key]?.startPoint).toBeUndefined();
    expect(result.current.state.dayEntryPoints[key]?.clearedStart).toBe(true);

    // Setting a value again clears the flag.
    act(() => {
      result.current.actions.setDayEntryPoint(tripId, dayId, "start", accommodation);
    });
    expect(result.current.state.dayEntryPoints[key]?.clearedStart).toBe(false);

    // Clearing end is independent of start.
    act(() => {
      result.current.actions.setDayEntryPoint(tripId, dayId, "end", undefined);
    });
    expect(result.current.state.dayEntryPoints[key]?.clearedEnd).toBe(true);
    expect(result.current.state.dayEntryPoints[key]?.clearedStart).toBe(false);
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
