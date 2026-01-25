/**
 * Supabase sync operations for trips
 *
 * This module handles syncing user trips with Supabase.
 * It provides a clean separation between local state management and remote persistence.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import type { SyncResult } from "./types";
import type { StoredTrip } from "@/services/trip/types";
import type { Itinerary } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";

/**
 * Database row type for trips table
 */
export type TripRow = {
  id: string;
  user_id: string;
  name: string;
  itinerary: Itinerary;
  builder_data: TripBuilderData;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
};

/**
 * Transforms a database row to a StoredTrip
 */
function rowToStoredTrip(row: TripRow): StoredTrip {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    itinerary: row.itinerary,
    builderData: row.builder_data,
  };
}

/**
 * Fetches all active trips for a user from Supabase
 */
export async function fetchTrips(
  supabase: SupabaseClient,
  userId: string,
): Promise<SyncResult<StoredTrip[]>> {
  try {
    const { data, error } = await supabase
      .from("trips")
      .select("id, user_id, name, itinerary, builder_data, created_at, updated_at, deleted_at, version")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) {
      logger.warn("Failed to load trips", { error });
      return { success: false, error: error.message };
    }

    const rows = (data ?? []) as TripRow[];
    return { success: true, data: rows.map(rowToStoredTrip) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Error fetching trips", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Fetches a single trip by ID
 */
export async function fetchTripById(
  supabase: SupabaseClient,
  userId: string,
  tripId: string,
): Promise<SyncResult<StoredTrip | null>> {
  try {
    const { data, error } = await supabase
      .from("trips")
      .select("id, user_id, name, itinerary, builder_data, created_at, updated_at, deleted_at, version")
      .eq("id", tripId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return { success: true, data: null };
      }
      logger.warn("Failed to load trip", { error, tripId });
      return { success: false, error: error.message };
    }

    return { success: true, data: rowToStoredTrip(data as TripRow) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Error fetching trip", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Saves a trip to Supabase (insert or update via upsert)
 */
export async function saveTrip(
  supabase: SupabaseClient,
  userId: string,
  trip: StoredTrip,
): Promise<SyncResult<StoredTrip>> {
  try {
    const { data, error } = await supabase
      .from("trips")
      .upsert(
        {
          id: trip.id,
          user_id: userId,
          name: trip.name,
          itinerary: trip.itinerary,
          builder_data: trip.builderData,
          // Don't set created_at on upsert - let DB handle it for new rows
          // updated_at is handled by trigger
        },
        { onConflict: "id" },
      )
      .select("id, user_id, name, itinerary, builder_data, created_at, updated_at, deleted_at, version")
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data: rowToStoredTrip(data as TripRow) };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error ?? {});
    logger.error("Failed to save trip", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Soft deletes a trip from Supabase
 */
export async function deleteTrip(
  supabase: SupabaseClient,
  userId: string,
  tripId: string,
): Promise<SyncResult<void>> {
  try {
    const { error } = await supabase
      .from("trips")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", tripId)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error ?? {});
    logger.error("Failed to delete trip", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Helper to extract error message from various error types
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return String(error);
}

/**
 * Syncs a trip save to Supabase
 * Handles auth checking and error logging
 */
export async function syncTripSave(
  supabase: SupabaseClient,
  trip: StoredTrip,
): Promise<SyncResult<StoredTrip>> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      const errorMessage = extractErrorMessage(authError);

      // Suppress "Auth session missing" errors (expected when not logged in)
      if (errorMessage.includes("Auth session missing")) {
        return { success: true, data: trip }; // Return local trip
      }

      logger.error("Failed to read auth session when syncing trip", authError);
      return { success: false, error: errorMessage };
    }

    if (!user) {
      // No authenticated user - keep local state but skip remote sync
      return { success: true, data: trip };
    }

    return await saveTrip(supabase, user.id, trip);
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error ?? {});
    logger.error("Failed to sync trip save", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Syncs a trip deletion to Supabase
 * Handles auth checking and error logging
 */
export async function syncTripDelete(
  supabase: SupabaseClient,
  tripId: string,
): Promise<SyncResult<void>> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      const errorMessage = extractErrorMessage(authError);

      // Suppress "Auth session missing" errors (expected when not logged in)
      if (errorMessage.includes("Auth session missing")) {
        return { success: true }; // Local state is still valid
      }

      logger.error("Failed to read auth session when deleting trip", authError);
      return { success: false, error: errorMessage };
    }

    if (!user) {
      // No authenticated user - keep local state but skip remote sync
      return { success: true };
    }

    return await deleteTrip(supabase, user.id, tripId);
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error ?? {});
    logger.error("Failed to sync trip delete", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Merges local and remote trips, resolving conflicts by timestamp
 *
 * Merge strategy:
 * - Remote trips as base
 * - Override with local if local.updatedAt > remote.updatedAt
 * - Add local-only trips (they need upload on next save)
 */
export function mergeTrips(local: StoredTrip[], remote: StoredTrip[]): StoredTrip[] {
  const remoteById = new Map(remote.map((t) => [t.id, t]));
  const merged = new Map<string, StoredTrip>();

  // Start with remote trips
  for (const remoteTrip of remote) {
    merged.set(remoteTrip.id, remoteTrip);
  }

  // Override with local if newer, or add if local-only
  for (const localTrip of local) {
    const remoteTrip = remoteById.get(localTrip.id);

    if (!remoteTrip) {
      // Local-only trip - add it
      merged.set(localTrip.id, localTrip);
    } else {
      // Both exist - keep the newer one
      const localDate = new Date(localTrip.updatedAt);
      const remoteDate = new Date(remoteTrip.updatedAt);

      if (localDate > remoteDate) {
        merged.set(localTrip.id, localTrip);
      }
      // Otherwise keep remote (already in merged)
    }
  }

  // Return sorted by updatedAt descending
  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}
