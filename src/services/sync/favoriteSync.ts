/**
 * Supabase sync operations for favorites
 *
 * This module handles syncing favorite place IDs with Supabase.
 * It provides a clean separation between local state management and remote persistence.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import type { SyncResult, FavoriteRow } from "./types";

/**
 * Fetches all favorites for a user from Supabase
 */
export async function fetchFavorites(
  supabase: SupabaseClient,
  userId: string,
): Promise<SyncResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from("favorites")
      .select("place_id")
      .eq("user_id", userId);

    if (error) {
      logger.warn("Failed to load favorites", { error });
      return { success: false, error: error.message };
    }

    const rows = (data ?? []) as FavoriteRow[];
    return { success: true, data: rows.map((row) => row.place_id) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Error fetching favorites", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Adds a favorite to Supabase
 */
export async function addFavorite(
  supabase: SupabaseClient,
  userId: string,
  placeId: string,
): Promise<SyncResult<void>> {
  try {
    const { error } = await supabase
      .from("favorites")
      .upsert({ user_id: userId, place_id: placeId }, { onConflict: "user_id,place_id" });

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error ?? {});
    logger.error("Failed to add favorite", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Removes a favorite from Supabase
 */
export async function removeFavorite(
  supabase: SupabaseClient,
  userId: string,
  placeId: string,
): Promise<SyncResult<void>> {
  try {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("place_id", placeId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error ?? {});
    logger.error("Failed to remove favorite", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Syncs a favorite toggle to Supabase
 * Handles auth checking and error logging
 */
export async function syncFavoriteToggle(
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

      logger.error("Failed to read auth session when syncing favorite", authError);
      return { success: false, error: errorMessage };
    }

    if (!user) {
      // No authenticated user - keep local state but skip remote sync
      return { success: true };
    }

    if (wasRemoved) {
      return await removeFavorite(supabase, user.id, placeId);
    } else {
      return await addFavorite(supabase, user.id, placeId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error ?? {});
    logger.error("Failed to sync favorite", new Error(message));
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
