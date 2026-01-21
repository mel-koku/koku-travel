/**
 * Edit history management for undo/redo functionality
 *
 * Pure functions for managing itinerary edit history.
 */

import type { Itinerary, ItineraryEdit } from "@/types/itinerary";
import type { EditHistoryState, StoredTrip } from "./types";
import { MAX_EDIT_HISTORY_ENTRIES } from "@/lib/constants";

/**
 * Generates a unique ID
 */
function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "u_" + Math.random().toString(36).slice(2, 10);
}

/**
 * Creates a new edit history entry
 */
export function createEditHistoryEntry(
  tripId: string,
  dayId: string,
  type: ItineraryEdit["type"],
  previousItinerary: Itinerary,
  nextItinerary: Itinerary,
  metadata?: Record<string, unknown>,
): ItineraryEdit {
  return {
    id: newId(),
    tripId,
    timestamp: new Date().toISOString(),
    type,
    dayId,
    previousItinerary,
    nextItinerary,
    metadata,
  };
}

/**
 * Adds an edit to the history, handling redo branch pruning
 */
export function addEditToHistory(
  historyState: EditHistoryState,
  tripId: string,
  edit: ItineraryEdit,
): EditHistoryState {
  const history = historyState.editHistory[tripId] ?? [];
  const currentIndex = historyState.currentHistoryIndex[tripId] ?? -1;

  // Remove any edits after current index (when undoing and then making new edit)
  const newHistory = history.slice(0, currentIndex + 1);
  newHistory.push(edit);

  // Limit history to last N edits
  const trimmedHistory = newHistory.slice(-MAX_EDIT_HISTORY_ENTRIES);

  return {
    editHistory: {
      ...historyState.editHistory,
      [tripId]: trimmedHistory,
    },
    currentHistoryIndex: {
      ...historyState.currentHistoryIndex,
      [tripId]: trimmedHistory.length - 1,
    },
  };
}

/**
 * Performs an undo operation
 * Returns the previous itinerary and updated history state, or null if nothing to undo
 */
export function performUndo(
  trips: StoredTrip[],
  historyState: EditHistoryState,
  tripId: string,
): { trips: StoredTrip[]; historyState: EditHistoryState } | null {
  const history = historyState.editHistory[tripId] ?? [];
  const currentIndex = historyState.currentHistoryIndex[tripId] ?? -1;

  if (currentIndex < 0) {
    return null; // Nothing to undo
  }

  const edit = history[currentIndex];
  if (!edit) {
    return null;
  }

  // Restore previous itinerary state
  const updatedTrips = trips.map((t) =>
    t.id === tripId
      ? {
          ...t,
          itinerary: edit.previousItinerary,
          updatedAt: new Date().toISOString(),
        }
      : t,
  );

  return {
    trips: updatedTrips,
    historyState: {
      ...historyState,
      currentHistoryIndex: {
        ...historyState.currentHistoryIndex,
        [tripId]: currentIndex - 1,
      },
    },
  };
}

/**
 * Performs a redo operation
 * Returns the next itinerary and updated history state, or null if nothing to redo
 */
export function performRedo(
  trips: StoredTrip[],
  historyState: EditHistoryState,
  tripId: string,
): { trips: StoredTrip[]; historyState: EditHistoryState } | null {
  const history = historyState.editHistory[tripId] ?? [];
  const currentIndex = historyState.currentHistoryIndex[tripId] ?? -1;

  if (currentIndex >= history.length - 1) {
    return null; // Nothing to redo
  }

  const edit = history[currentIndex + 1];
  if (!edit) {
    return null;
  }

  // Restore next itinerary state
  const updatedTrips = trips.map((t) =>
    t.id === tripId
      ? {
          ...t,
          itinerary: edit.nextItinerary,
          updatedAt: new Date().toISOString(),
        }
      : t,
  );

  return {
    trips: updatedTrips,
    historyState: {
      ...historyState,
      currentHistoryIndex: {
        ...historyState.currentHistoryIndex,
        [tripId]: currentIndex + 1,
      },
    },
  };
}

/**
 * Checks if undo is available for a trip
 */
export function canUndo(
  historyState: EditHistoryState,
  tripId: string,
): boolean {
  const currentIndex = historyState.currentHistoryIndex[tripId] ?? -1;
  return currentIndex >= 0;
}

/**
 * Checks if redo is available for a trip
 */
export function canRedo(
  historyState: EditHistoryState,
  tripId: string,
): boolean {
  const history = historyState.editHistory[tripId] ?? [];
  const currentIndex = historyState.currentHistoryIndex[tripId] ?? -1;
  return currentIndex < history.length - 1;
}
