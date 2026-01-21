import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateTripId,
  createTripRecord,
  updateTripItinerary,
  renameTrip,
  deleteTrip,
  restoreTrip,
  getTripById,
  sanitizeTrips,
} from "@/services/trip/tripOperations";
import type { StoredTrip } from "@/services/trip/types";
import type { Itinerary } from "@/types/itinerary";

// Mock crypto.randomUUID
const mockRandomUUID = vi.fn(() => "mock-uuid-12345");
vi.stubGlobal("crypto", { randomUUID: mockRandomUUID });

describe("tripOperations", () => {
  const mockItinerary: Itinerary = {
    days: [
      {
        id: "day-1",
        date: "2026-01-21",
        activities: [],
      },
    ],
  };

  const mockBuilderData = {
    dates: { start: "2026-01-21", end: "2026-01-23" },
    regions: [],
    cities: [],
    interests: [],
  };

  const createMockTrip = (id: string, name: string): StoredTrip => ({
    id,
    name,
    createdAt: "2026-01-20T00:00:00.000Z",
    updatedAt: "2026-01-20T00:00:00.000Z",
    itinerary: mockItinerary,
    builderData: mockBuilderData,
  });

  beforeEach(() => {
    mockRandomUUID.mockClear();
  });

  describe("generateTripId", () => {
    it("uses crypto.randomUUID when available", () => {
      const id = generateTripId();
      expect(id).toBe("mock-uuid-12345");
      expect(mockRandomUUID).toHaveBeenCalledOnce();
    });
  });

  describe("createTripRecord", () => {
    it("creates a trip with provided data", () => {
      const input = {
        name: "My Tokyo Trip",
        itinerary: mockItinerary,
        builderData: mockBuilderData,
      };

      const result = createTripRecord(input);

      expect(result.id).toBe("mock-uuid-12345");
      expect(result.name).toBe("My Tokyo Trip");
      expect(result.itinerary).toBe(mockItinerary);
      expect(result.builderData).toBe(mockBuilderData);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("trims whitespace from name", () => {
      const input = {
        name: "  Trimmed Name  ",
        itinerary: mockItinerary,
        builderData: mockBuilderData,
      };

      const result = createTripRecord(input);
      expect(result.name).toBe("Trimmed Name");
    });

    it("uses default name for empty string", () => {
      const input = {
        name: "   ",
        itinerary: mockItinerary,
        builderData: mockBuilderData,
      };

      const result = createTripRecord(input);
      expect(result.name).toBe("Untitled itinerary");
    });
  });

  describe("updateTripItinerary", () => {
    it("updates itinerary for matching trip", () => {
      const trips = [createMockTrip("trip-1", "Trip 1")];
      const newItinerary: Itinerary = { days: [] };

      const result = updateTripItinerary(trips, "trip-1", newItinerary);

      expect(result).not.toBeNull();
      expect(result![0].itinerary).toBe(newItinerary);
      expect(result![0].updatedAt).not.toBe(trips[0].updatedAt);
    });

    it("returns null if trip not found", () => {
      const trips = [createMockTrip("trip-1", "Trip 1")];
      const newItinerary: Itinerary = { days: [] };

      const result = updateTripItinerary(trips, "non-existent", newItinerary);

      expect(result).toBeNull();
    });

    it("returns null if itinerary is same reference", () => {
      const trip = createMockTrip("trip-1", "Trip 1");
      const trips = [trip];

      const result = updateTripItinerary(trips, "trip-1", trip.itinerary);

      expect(result).toBeNull();
    });
  });

  describe("renameTrip", () => {
    it("renames trip successfully", () => {
      const trips = [createMockTrip("trip-1", "Old Name")];

      const result = renameTrip(trips, "trip-1", "New Name");

      expect(result).not.toBeNull();
      expect(result![0].name).toBe("New Name");
    });

    it("returns null for empty name", () => {
      const trips = [createMockTrip("trip-1", "Old Name")];

      const result = renameTrip(trips, "trip-1", "   ");

      expect(result).toBeNull();
    });

    it("returns null if name unchanged", () => {
      const trips = [createMockTrip("trip-1", "Same Name")];

      const result = renameTrip(trips, "trip-1", "Same Name");

      expect(result).toBeNull();
    });
  });

  describe("deleteTrip", () => {
    it("removes trip from array", () => {
      const trips = [
        createMockTrip("trip-1", "Trip 1"),
        createMockTrip("trip-2", "Trip 2"),
      ];

      const result = deleteTrip(trips, "trip-1");

      expect(result).not.toBeNull();
      expect(result!.length).toBe(1);
      expect(result![0].id).toBe("trip-2");
    });

    it("returns null if trip not found", () => {
      const trips = [createMockTrip("trip-1", "Trip 1")];

      const result = deleteTrip(trips, "non-existent");

      expect(result).toBeNull();
    });
  });

  describe("restoreTrip", () => {
    it("adds trip if not exists", () => {
      const trips = [createMockTrip("trip-1", "Trip 1")];
      const newTrip = createMockTrip("trip-2", "Trip 2");

      const result = restoreTrip(trips, newTrip);

      expect(result).not.toBeNull();
      expect(result!.length).toBe(2);
    });

    it("returns null if trip already exists", () => {
      const trip = createMockTrip("trip-1", "Trip 1");
      const trips = [trip];

      const result = restoreTrip(trips, trip);

      expect(result).toBeNull();
    });

    it("sorts trips by createdAt", () => {
      const trip1 = createMockTrip("trip-1", "Trip 1");
      trip1.createdAt = "2026-01-22T00:00:00.000Z";
      const trip2 = createMockTrip("trip-2", "Trip 2");
      trip2.createdAt = "2026-01-20T00:00:00.000Z";

      const result = restoreTrip([trip1], trip2);

      expect(result).not.toBeNull();
      expect(result![0].id).toBe("trip-2"); // Earlier date first
      expect(result![1].id).toBe("trip-1");
    });
  });

  describe("getTripById", () => {
    it("returns trip if found", () => {
      const trips = [createMockTrip("trip-1", "Trip 1")];

      const result = getTripById(trips, "trip-1");

      expect(result).toBeDefined();
      expect(result!.id).toBe("trip-1");
    });

    it("returns undefined if not found", () => {
      const trips = [createMockTrip("trip-1", "Trip 1")];

      const result = getTripById(trips, "non-existent");

      expect(result).toBeUndefined();
    });
  });

  describe("sanitizeTrips", () => {
    it("returns empty array for non-array input", () => {
      expect(sanitizeTrips(null)).toEqual([]);
      expect(sanitizeTrips(undefined)).toEqual([]);
      expect(sanitizeTrips("string")).toEqual([]);
      expect(sanitizeTrips(123)).toEqual([]);
    });

    it("filters out invalid entries", () => {
      const input = [
        null,
        {},
        { id: "" },
        { id: "valid", name: "" },
        { id: "valid", name: "Valid", itinerary: null },
        { id: "valid", name: "Valid", itinerary: { days: [] }, builderData: null },
      ];

      const result = sanitizeTrips(input);
      expect(result).toEqual([]);
    });

    it("keeps valid trips", () => {
      const validTrip = {
        id: "trip-1",
        name: "Valid Trip",
        createdAt: "2026-01-20T00:00:00.000Z",
        updatedAt: "2026-01-20T00:00:00.000Z",
        itinerary: { days: [] },
        builderData: {},
      };

      const result = sanitizeTrips([validTrip]);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("trip-1");
    });

    it("adds default timestamps if missing", () => {
      const tripWithoutTimestamps = {
        id: "trip-1",
        name: "Trip",
        itinerary: { days: [] },
        builderData: {},
      };

      const result = sanitizeTrips([tripWithoutTimestamps]);

      expect(result[0].createdAt).toBeDefined();
      expect(result[0].updatedAt).toBeDefined();
    });
  });
});
