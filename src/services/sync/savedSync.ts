/**
 * Supabase sync operations for saved places
 *
 * This module handles syncing saved place IDs with Supabase.
 * It provides a clean separation between local state management and remote persistence.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import type { SyncResult, SavedRow } from "./types";

/**
 * Extended saved data including location_id for direct location joins
 */
export type SavedData = {
  placeId: string;
  locationId?: string;
};

/**
 * Fetches all saved places for a user from Supabase
 * Returns both place_id and location_id for better location resolution
 */
export async function fetchSaved(
  supabase: SupabaseClient,
  userId: string,
): Promise<SyncResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from("saved")
      .select("place_id, location_id")
      .eq("user_id", userId);

    if (error) {
      logger.warn("Failed to load saved places", { error });
      return { success: false, error: error.message };
    }

    const rows = (data ?? []) as SavedRow[];
    return { success: true, data: rows.map((row) => row.place_id) };
  } catch (error) {
    const message = getErrorMessage(error);
    logger.error("Error fetching saved places", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Fetches saved places with full data including location_id
 */
export async function fetchSavedWithLocationId(
  supabase: SupabaseClient,
  userId: string,
): Promise<SyncResult<SavedData[]>> {
  try {
    const { data, error } = await supabase
      .from("saved")
      .select("place_id, location_id")
      .eq("user_id", userId);

    if (error) {
      logger.warn("Failed to load saved places with location_id", { error });
      return { success: false, error: error.message };
    }

    const rows = (data ?? []) as SavedRow[];
    return {
      success: true,
      data: rows.map((row) => ({
        placeId: row.place_id,
        locationId: row.location_id,
      })),
    };
  } catch (error) {
    const message = getErrorMessage(error);
    logger.error("Error fetching saved places with location_id", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Looks up the internal location_id from the locations table by place_id
 */
async function lookupLocationId(
  supabase: SupabaseClient,
  placeId: string,
): Promise<string | undefined> {
  try {
    const { data, error } = await supabase
      .from("locations")
      .select("id")
      .eq("place_id", placeId)
      .limit(1)
      .single();

    if (error || !data) {
      return undefined;
    }

    return data.id as string;
  } catch {
    return undefined;
  }
}

/**
 * Adds a saved place to Supabase
 * Automatically looks up and stores the location_id for direct joins
 */
export async function addSaved(
  supabase: SupabaseClient,
  userId: string,
  placeId: string,
  locationId?: string,
): Promise<SyncResult<void>> {
  try {
    // If locationId not provided, try to look it up from the locations table
    let resolvedLocationId = locationId;
    if (!resolvedLocationId) {
      resolvedLocationId = await lookupLocationId(supabase, placeId);
    }

    const { error } = await supabase
      .from("saved")
      .upsert(
        {
          user_id: userId,
          place_id: placeId,
          location_id: resolvedLocationId,
        },
        { onConflict: "user_id,place_id" }
      );

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error ?? {});
    logger.error("Failed to add saved place", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Removes a saved place from Supabase
 */
export async function removeSaved(
  supabase: SupabaseClient,
  userId: string,
  placeId: string,
): Promise<SyncResult<void>> {
  try {
    const { error } = await supabase
      .from("saved")
      .delete()
      .eq("user_id", userId)
      .eq("place_id", placeId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error ?? {});
    logger.error("Failed to remove saved place", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Syncs a saved toggle to Supabase
 * Handles auth checking and error logging
 */
export async function syncSavedToggle(
  supabase: SupabaseClient,
  placeId: string,
  wasRemoved: boolean,
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

      logger.error("Failed to read auth session when syncing saved place", authError);
      return { success: false, error: errorMessage };
    }

    if (!user) {
      // No authenticated user - keep local state but skip remote sync
      return { success: true };
    }

    if (wasRemoved) {
      return await removeSaved(supabase, user.id, placeId);
    } else {
      return await addSaved(supabase, user.id, placeId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error ?? {});
    logger.error("Failed to sync saved place", new Error(message));
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
