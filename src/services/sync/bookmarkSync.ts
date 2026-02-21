/**
 * Supabase sync operations for guide bookmarks
 *
 * This module handles syncing guide bookmark IDs with Supabase.
 * It provides a clean separation between local state management and remote persistence.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import type { SyncResult, GuideBookmarkRow } from "./types";

/**
 * Fetches all guide bookmarks for a user from Supabase
 */
export async function fetchGuideBookmarks(
  supabase: SupabaseClient,
  userId: string,
): Promise<SyncResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from("guide_bookmarks")
      .select("guide_id")
      .eq("user_id", userId);

    if (error) {
      logger.warn("Failed to load guide bookmarks", { error });
      return { success: false, error: error.message };
    }

    const rows = (data ?? []) as GuideBookmarkRow[];
    return { success: true, data: rows.map((row) => row.guide_id) };
  } catch (error) {
    const message = getErrorMessage(error);
    logger.error("Error fetching guide bookmarks", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Adds a guide bookmark to Supabase
 */
export async function addGuideBookmark(
  supabase: SupabaseClient,
  userId: string,
  guideId: string,
): Promise<SyncResult<void>> {
  try {
    const { error } = await supabase
      .from("guide_bookmarks")
      .upsert({ user_id: userId, guide_id: guideId }, { onConflict: "user_id,guide_id" });

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error ?? {});
    logger.error("Failed to add guide bookmark", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Removes a guide bookmark from Supabase
 */
export async function removeGuideBookmark(
  supabase: SupabaseClient,
  userId: string,
  guideId: string,
): Promise<SyncResult<void>> {
  try {
    const { error } = await supabase
      .from("guide_bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("guide_id", guideId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error ?? {});
    logger.error("Failed to remove guide bookmark", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Syncs a guide bookmark toggle to Supabase
 * Handles auth checking and error logging
 *
 * @returns SyncResult with success status and optional revert flag
 */
export async function syncBookmarkToggle(
  supabase: SupabaseClient,
  guideId: string,
  wasRemoved: boolean,
): Promise<SyncResult<void> & { shouldRevert?: boolean }> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      logger.error("Failed to read auth session when syncing guide bookmark", authError);
      return { success: false, error: extractErrorMessage(authError) };
    }

    if (!user) {
      // No authenticated user - keep local state but skip remote sync
      return { success: true };
    }

    if (wasRemoved) {
      return await removeGuideBookmark(supabase, user.id, guideId);
    } else {
      return await addGuideBookmark(supabase, user.id, guideId);
    }
  } catch (error) {
    const message = extractErrorMessage(error);

    // Suppress "Auth session missing" errors
    if (message.includes("Auth session missing")) {
      return { success: true };
    }

    logger.error("Failed to sync guide bookmark", message || error);
    return { success: false, error: message, shouldRevert: true };
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
