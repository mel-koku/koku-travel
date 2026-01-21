import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createEditHistoryEntry,
  addEditToHistory,
  performUndo,
  performRedo,
  canUndo,
  canRedo,
} from "@/services/trip/editHistory";
import type { EditHistoryState, StoredTrip } from "@/services/trip/types";
import type { Itinerary, ItineraryEdit } from "@/types/itinerary";

// Mock crypto.randomUUID
const mockRandomUUID = vi.fn(() => "mock-edit-uuid");
vi.stubGlobal("crypto", { randomUUID: mockRandomUUID });

describe("editHistory", () => {
  const mockItinerary1: Itinerary = {
    days: [{ id: "day-1", date: "2026-01-21", activities: [] }],
  };

  const mockItinerary2: Itinerary = {
    days: [
      {
        id: "day-1",
        date: "2026-01-21",
        activities: [{ id: "act-1", type: "attraction", locationId: "loc-1", name: "Activity", duration: 60, coordinates: { lat: 35, lng: 139 } }],
      },
    ],
  };

  const createMockTrip = (id: string, itinerary: Itinerary): StoredTrip => ({
    id,
    name: "Test Trip",
    createdAt: "2026-01-20T00:00:00.000Z",
    updatedAt: "2026-01-20T00:00:00.000Z",
    itinerary,
    builderData: { dates: {}, regions: [], cities: [], interests: [] },
  });

  const createEmptyHistoryState = (): EditHistoryState => ({
    editHistory: {},
    currentHistoryIndex: {},
  });

  beforeEach(() => {
    mockRandomUUID.mockClear();
  });

  describe("createEditHistoryEntry", () => {
    it("creates an edit entry with all fields", () => {
      const entry = createEditHistoryEntry(
        "trip-1",
        "day-1",
        "addActivity",
        mockItinerary1,
        mockItinerary2,
        { activityId: "act-1" },
      );

      expect(entry.id).toBe("mock-edit-uuid");
      expect(entry.tripId).toBe("trip-1");
      expect(entry.dayId).toBe("day-1");
      expect(entry.type).toBe("addActivity");
      expect(entry.previousItinerary).toBe(mockItinerary1);
      expect(entry.nextItinerary).toBe(mockItinerary2);
      expect(entry.metadata).toEqual({ activityId: "act-1" });
      expect(entry.timestamp).toBeDefined();
    });

    it("works without metadata", () => {
      const entry = createEditHistoryEntry(
        "trip-1",
        "day-1",
        "deleteActivity",
        mockItinerary1,
        mockItinerary2,
      );

      expect(entry.metadata).toBeUndefined();
    });
  });

  describe("addEditToHistory", () => {
    it("adds first edit to empty history", () => {
      const historyState = createEmptyHistoryState();
      const edit: ItineraryEdit = {
        id: "edit-1",
        tripId: "trip-1",
        dayId: "day-1",
        timestamp: new Date().toISOString(),
        type: "addActivity",
        previousItinerary: mockItinerary1,
        nextItinerary: mockItinerary2,
      };

      const result = addEditToHistory(historyState, "trip-1", edit);

      expect(result.editHistory["trip-1"]).toHaveLength(1);
      expect(result.currentHistoryIndex["trip-1"]).toBe(0);
    });

    it("appends edit to existing history", () => {
      const historyState: EditHistoryState = {
        editHistory: {
          "trip-1": [
            {
              id: "edit-1",
              tripId: "trip-1",
              dayId: "day-1",
              timestamp: new Date().toISOString(),
              type: "addActivity",
              previousItinerary: mockItinerary1,
              nextItinerary: mockItinerary2,
            },
          ],
        },
        currentHistoryIndex: { "trip-1": 0 },
      };

      const newEdit: ItineraryEdit = {
        id: "edit-2",
        tripId: "trip-1",
        dayId: "day-1",
        timestamp: new Date().toISOString(),
        type: "deleteActivity",
        previousItinerary: mockItinerary2,
        nextItinerary: mockItinerary1,
      };

      const result = addEditToHistory(historyState, "trip-1", newEdit);

      expect(result.editHistory["trip-1"]).toHaveLength(2);
      expect(result.currentHistoryIndex["trip-1"]).toBe(1);
    });

    it("prunes redo branch when adding after undo", () => {
      const historyState: EditHistoryState = {
        editHistory: {
          "trip-1": [
            { id: "edit-1", tripId: "trip-1", dayId: "day-1", timestamp: "", type: "addActivity", previousItinerary: mockItinerary1, nextItinerary: mockItinerary2 },
            { id: "edit-2", tripId: "trip-1", dayId: "day-1", timestamp: "", type: "deleteActivity", previousItinerary: mockItinerary2, nextItinerary: mockItinerary1 },
          ],
        },
        currentHistoryIndex: { "trip-1": 0 }, // After one undo
      };

      const newEdit: ItineraryEdit = {
        id: "edit-3",
        tripId: "trip-1",
        dayId: "day-1",
        timestamp: "",
        type: "replaceActivity",
        previousItinerary: mockItinerary2,
        nextItinerary: mockItinerary1,
      };

      const result = addEditToHistory(historyState, "trip-1", newEdit);

      expect(result.editHistory["trip-1"]).toHaveLength(2); // edit-1 and edit-3
      expect(result.editHistory["trip-1"][1].id).toBe("edit-3");
    });
  });

  describe("performUndo", () => {
    it("restores previous itinerary state", () => {
      const trips = [createMockTrip("trip-1", mockItinerary2)];
      const historyState: EditHistoryState = {
        editHistory: {
          "trip-1": [
            { id: "edit-1", tripId: "trip-1", dayId: "day-1", timestamp: "", type: "addActivity", previousItinerary: mockItinerary1, nextItinerary: mockItinerary2 },
          ],
        },
        currentHistoryIndex: { "trip-1": 0 },
      };

      const result = performUndo(trips, historyState, "trip-1");

      expect(result).not.toBeNull();
      expect(result!.trips[0].itinerary).toBe(mockItinerary1);
      expect(result!.historyState.currentHistoryIndex["trip-1"]).toBe(-1);
    });

    it("returns null when nothing to undo", () => {
      const trips = [createMockTrip("trip-1", mockItinerary1)];
      const historyState: EditHistoryState = {
        editHistory: { "trip-1": [] },
        currentHistoryIndex: { "trip-1": -1 },
      };

      const result = performUndo(trips, historyState, "trip-1");

      expect(result).toBeNull();
    });

    it("returns null for non-existent trip history", () => {
      const trips = [createMockTrip("trip-1", mockItinerary1)];
      const historyState = createEmptyHistoryState();

      const result = performUndo(trips, historyState, "trip-1");

      expect(result).toBeNull();
    });
  });

  describe("performRedo", () => {
    it("restores next itinerary state", () => {
      const trips = [createMockTrip("trip-1", mockItinerary1)];
      const historyState: EditHistoryState = {
        editHistory: {
          "trip-1": [
            { id: "edit-1", tripId: "trip-1", dayId: "day-1", timestamp: "", type: "addActivity", previousItinerary: mockItinerary1, nextItinerary: mockItinerary2 },
          ],
        },
        currentHistoryIndex: { "trip-1": -1 }, // After undo
      };

      const result = performRedo(trips, historyState, "trip-1");

      expect(result).not.toBeNull();
      expect(result!.trips[0].itinerary).toBe(mockItinerary2);
      expect(result!.historyState.currentHistoryIndex["trip-1"]).toBe(0);
    });

    it("returns null when nothing to redo", () => {
      const trips = [createMockTrip("trip-1", mockItinerary2)];
      const historyState: EditHistoryState = {
        editHistory: {
          "trip-1": [
            { id: "edit-1", tripId: "trip-1", dayId: "day-1", timestamp: "", type: "addActivity", previousItinerary: mockItinerary1, nextItinerary: mockItinerary2 },
          ],
        },
        currentHistoryIndex: { "trip-1": 0 }, // Already at latest
      };

      const result = performRedo(trips, historyState, "trip-1");

      expect(result).toBeNull();
    });
  });

  describe("canUndo", () => {
    it("returns true when undo is available", () => {
      const historyState: EditHistoryState = {
        editHistory: { "trip-1": [] },
        currentHistoryIndex: { "trip-1": 0 },
      };

      expect(canUndo(historyState, "trip-1")).toBe(true);
    });

    it("returns false when at start of history", () => {
      const historyState: EditHistoryState = {
        editHistory: { "trip-1": [] },
        currentHistoryIndex: { "trip-1": -1 },
      };

      expect(canUndo(historyState, "trip-1")).toBe(false);
    });

    it("returns false for non-existent trip", () => {
      const historyState = createEmptyHistoryState();

      expect(canUndo(historyState, "trip-1")).toBe(false);
    });
  });

  describe("canRedo", () => {
    it("returns true when redo is available", () => {
      const historyState: EditHistoryState = {
        editHistory: {
          "trip-1": [
            { id: "edit-1", tripId: "trip-1", dayId: "day-1", timestamp: "", type: "addActivity", previousItinerary: mockItinerary1, nextItinerary: mockItinerary2 },
          ],
        },
        currentHistoryIndex: { "trip-1": -1 },
      };

      expect(canRedo(historyState, "trip-1")).toBe(true);
    });

    it("returns false when at end of history", () => {
      const historyState: EditHistoryState = {
        editHistory: {
          "trip-1": [
            { id: "edit-1", tripId: "trip-1", dayId: "day-1", timestamp: "", type: "addActivity", previousItinerary: mockItinerary1, nextItinerary: mockItinerary2 },
          ],
        },
        currentHistoryIndex: { "trip-1": 0 },
      };

      expect(canRedo(historyState, "trip-1")).toBe(false);
    });

    it("returns false for empty history", () => {
      const historyState: EditHistoryState = {
        editHistory: { "trip-1": [] },
        currentHistoryIndex: { "trip-1": -1 },
      };

      expect(canRedo(historyState, "trip-1")).toBe(false);
    });
  });
});
