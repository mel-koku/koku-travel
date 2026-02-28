import { useCallback, useRef } from "react";
import type { Itinerary, ItineraryActivity, ItineraryEdit } from "@/types/itinerary";
import type { StoredTrip } from "@/services/trip";
import {
  type EditHistoryState,
  createEditHistoryEntry,
  addEditToHistory,
  performUndo,
  performRedo,
  canUndo as canUndoCheck,
  canRedo as canRedoCheck,
} from "@/services/trip";
import {
  replaceActivity as replaceActivityOp,
  deleteActivity as deleteActivityOp,
  reorderActivities as reorderActivitiesOp,
  addActivity as addActivityOp,
} from "@/services/trip";

export type EditHistoryInternalState = {
  trips: StoredTrip[];
  editHistory: Record<string, ItineraryEdit[]>;
  currentHistoryIndex: Record<string, number>;
};

type EditHistoryDeps = {
  setState: (updater: (s: EditHistoryInternalState) => EditHistoryInternalState) => void;
  supabase: ReturnType<typeof import("@/lib/supabase/client").createClient> | null;
  tripSyncTimeouts: React.MutableRefObject<Map<string, NodeJS.Timeout>>;
  syncTripSave: (supabase: NonNullable<EditHistoryDeps["supabase"]>, trip: StoredTrip) => Promise<unknown>;
  tripSyncDebounceMs: number;
};

/**
 * Encapsulates edit history logic (undo/redo, activity mutations with history tracking).
 * Consumer API is unchanged — returns the same action functions that AppState exposes.
 */
export function useEditHistory({
  setState,
  supabase,
  tripSyncTimeouts,
  syncTripSave,
  tripSyncDebounceMs,
}: EditHistoryDeps) {
  // Ref to track latest trips for debounced sync callbacks (avoids stale closures)
  const latestTripsRef = useRef<StoredTrip[]>([]);

  // Helper for itinerary updates with history
  const updateItineraryWithHistory = useCallback(
    (
      tripId: string,
      dayId: string,
      editType: ItineraryEdit["type"],
      updater: (itinerary: Itinerary) => Itinerary,
      metadata?: Record<string, unknown>,
    ) => {
      setState((s) => {
        const trip = s.trips.find((t) => t.id === tripId);
        if (!trip) return s;

        const previousItinerary = trip.itinerary;
        const nextItinerary = updater(previousItinerary);

        const edit = createEditHistoryEntry(tripId, dayId, editType, previousItinerary, nextItinerary, metadata);

        const historyState: EditHistoryState = {
          editHistory: s.editHistory,
          currentHistoryIndex: s.currentHistoryIndex,
        };
        const newHistoryState = addEditToHistory(historyState, tripId, edit);

        const updatedTrips = s.trips.map((t) =>
          t.id === tripId
            ? { ...t, itinerary: nextItinerary, updatedAt: new Date().toISOString() }
            : t,
        );

        // Update ref so debounced callback reads the latest state
        latestTripsRef.current = updatedTrips;

        // Schedule debounced sync for activity changes
        if (supabase) {
          const existingTimeout = tripSyncTimeouts.current.get(tripId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          const timeout = setTimeout(() => {
            // Read from ref to get the most recent trips, not a stale closure snapshot
            const currentTrip = latestTripsRef.current.find((t) => t.id === tripId);
            if (currentTrip) {
              void syncTripSave(supabase, currentTrip);
            }
            tripSyncTimeouts.current.delete(tripId);
          }, tripSyncDebounceMs);

          tripSyncTimeouts.current.set(tripId, timeout);
        }

        return {
          ...s,
          trips: updatedTrips,
          editHistory: newHistoryState.editHistory,
          currentHistoryIndex: newHistoryState.currentHistoryIndex,
        };
      });
    },
    [setState, supabase, tripSyncTimeouts, syncTripSave, tripSyncDebounceMs],
  );

  const replaceActivity = useCallback(
    (tripId: string, dayId: string, activityId: string, newActivity: ItineraryActivity) => {
      updateItineraryWithHistory(
        tripId,
        dayId,
        "replaceActivity",
        (itinerary) => replaceActivityOp(itinerary, dayId, activityId, newActivity),
        { activityId, newActivityId: newActivity.id },
      );
    },
    [updateItineraryWithHistory],
  );

  const deleteActivity = useCallback(
    (tripId: string, dayId: string, activityId: string) => {
      updateItineraryWithHistory(
        tripId,
        dayId,
        "deleteActivity",
        (itinerary) => deleteActivityOp(itinerary, dayId, activityId),
        { activityId },
      );
    },
    [updateItineraryWithHistory],
  );

  const reorderActivities = useCallback(
    (tripId: string, dayId: string, activityIds: string[]) => {
      updateItineraryWithHistory(
        tripId,
        dayId,
        "reorderActivities",
        (itinerary) => reorderActivitiesOp(itinerary, dayId, activityIds),
        { activityIds },
      );
    },
    [updateItineraryWithHistory],
  );

  const addActivity = useCallback(
    (tripId: string, dayId: string, activity: ItineraryActivity, position?: number) => {
      updateItineraryWithHistory(
        tripId,
        dayId,
        "addActivity",
        (itinerary) => addActivityOp(itinerary, dayId, activity, position),
        { activityId: activity.id, position },
      );
    },
    [updateItineraryWithHistory],
  );

  const undo = useCallback(
    (tripId: string) => {
      setState((s) => {
        const historyState: EditHistoryState = {
          editHistory: s.editHistory,
          currentHistoryIndex: s.currentHistoryIndex,
        };
        const result = performUndo(s.trips, historyState, tripId);
        if (!result) return s;

        return {
          ...s,
          trips: result.trips,
          editHistory: result.historyState.editHistory,
          currentHistoryIndex: result.historyState.currentHistoryIndex,
        };
      });
    },
    [setState],
  );

  const redo = useCallback(
    (tripId: string) => {
      setState((s) => {
        const historyState: EditHistoryState = {
          editHistory: s.editHistory,
          currentHistoryIndex: s.currentHistoryIndex,
        };
        const result = performRedo(s.trips, historyState, tripId);
        if (!result) return s;

        return {
          ...s,
          trips: result.trips,
          editHistory: result.historyState.editHistory,
          currentHistoryIndex: result.historyState.currentHistoryIndex,
        };
      });
    },
    [setState],
  );

  return {
    replaceActivity,
    deleteActivity,
    reorderActivities,
    addActivity,
    undo,
    redo,
    canUndoCheck,
    canRedoCheck,
  };
}
