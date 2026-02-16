/**
 * Trip CRUD operations
 *
 * Pure functions for manipulating trip data.
 * These functions don't mutate state directly but return new data.
 */

import type { Itinerary } from "@/types/itinerary";
import type { StoredTrip, CreateTripInput } from "./types";

/**
 * Generates a unique trip ID
 */
export function generateTripId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `trip_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Creates a new trip record
 */
export function createTripRecord(input: CreateTripInput): StoredTrip {
  const id = generateTripId();
  const timestamp = new Date().toISOString();
  const trimmedName = input.name.trim();

  return {
    id,
    name: trimmedName.length > 0 ? trimmedName : "Untitled itinerary",
    createdAt: timestamp,
    updatedAt: timestamp,
    itinerary: input.itinerary,
    builderData: input.builderData,
    dayIntros: input.dayIntros,
  };
}

/**
 * Updates a trip's itinerary
 * Returns null if no changes were made
 */
export function updateTripItinerary(
  trips: StoredTrip[],
  tripId: string,
  itinerary: Itinerary,
): StoredTrip[] | null {
  let hasChanged = false;
  const nextTrips = trips.map((trip) => {
    if (trip.id !== tripId) {
      return trip;
    }
    if (trip.itinerary === itinerary) {
      return trip;
    }
    hasChanged = true;
    return {
      ...trip,
      itinerary,
      updatedAt: new Date().toISOString(),
    };
  });

  return hasChanged ? nextTrips : null;
}

/**
 * Renames a trip
 * Returns null if no changes were made or name is empty
 */
export function renameTrip(
  trips: StoredTrip[],
  tripId: string,
  name: string,
): StoredTrip[] | null {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return null;
  }

  let hasChanged = false;
  const nextTrips = trips.map((trip) => {
    if (trip.id !== tripId) {
      return trip;
    }
    if (trip.name === trimmedName) {
      return trip;
    }
    hasChanged = true;
    return {
      ...trip,
      name: trimmedName,
      updatedAt: new Date().toISOString(),
    };
  });

  return hasChanged ? nextTrips : null;
}

/**
 * Deletes a trip
 * Returns null if trip wasn't found
 */
export function deleteTrip(
  trips: StoredTrip[],
  tripId: string,
): StoredTrip[] | null {
  const nextTrips = trips.filter((trip) => trip.id !== tripId);
  return nextTrips.length === trips.length ? null : nextTrips;
}

/**
 * Restores a trip (adds if not exists)
 * Returns null if trip already exists
 */
export function restoreTrip(
  trips: StoredTrip[],
  trip: StoredTrip,
): StoredTrip[] | null {
  const exists = trips.some((entry) => entry.id === trip.id);
  if (exists) {
    return null;
  }

  const nextTrips = [...trips, trip].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return nextTrips;
}

/**
 * Finds a trip by ID
 */
export function getTripById(
  trips: StoredTrip[],
  tripId: string,
): StoredTrip | undefined {
  return trips.find((trip) => trip.id === tripId);
}

/**
 * Validates and sanitizes trips from storage
 */
export function sanitizeTrips(raw: unknown): StoredTrip[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const record = entry as Partial<StoredTrip>;
      if (typeof record.id !== "string" || record.id.length === 0) {
        return null;
      }
      if (typeof record.name !== "string" || record.name.length === 0) {
        return null;
      }
      const itinerary = record.itinerary;
      if (!itinerary || typeof itinerary !== "object" || !Array.isArray((itinerary as Itinerary).days)) {
        return null;
      }
      const builderData = record.builderData;
      if (!builderData || typeof builderData !== "object") {
        return null;
      }
      const trip: StoredTrip = {
        id: record.id,
        name: record.name,
        createdAt:
          typeof record.createdAt === "string" && record.createdAt.length > 0
            ? record.createdAt
            : new Date().toISOString(),
        updatedAt:
          typeof record.updatedAt === "string" && record.updatedAt.length > 0
            ? record.updatedAt
            : new Date().toISOString(),
        itinerary: itinerary as Itinerary,
        builderData: builderData,
      };
      if (record.dayIntros && typeof record.dayIntros === "object") {
        trip.dayIntros = record.dayIntros;
      }
      return trip;
    })
    .filter((entry): entry is StoredTrip => Boolean(entry));
}
