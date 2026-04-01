/**
 * Supabase sync operations for user preferences
 *
 * This module handles syncing user travel preferences with Supabase.
 * It provides a clean separation between local state management and remote persistence.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { getErrorMessage, isAuthSessionMissing } from "@/lib/utils/errorUtils";
import { type UserPreferences, DEFAULT_USER_PREFERENCES } from "@/types/userPreferences";
import type { SyncResult } from "./types";

/**
 * Maps a snake_case database row to the camelCase UserPreferences type
 */
function rowToPreferences(row: Record<string, unknown>): UserPreferences {
  return {
    dietaryRestrictions: (row.dietary_restrictions as string[]) ?? [],
    accessibilityNeeds: (row.accessibility_needs as UserPreferences["accessibilityNeeds"]) ?? {},
    defaultGroupType: (row.default_group_type as UserPreferences["defaultGroupType"]) ?? undefined,
    defaultPace: (row.default_pace as UserPreferences["defaultPace"]) ?? undefined,
    accommodationStyle: (row.accommodation_style as string[]) ?? [],
    defaultVibes: (row.default_vibes as UserPreferences["defaultVibes"]) ?? [],
    learnedVibes: (row.learned_vibes as Record<string, number>) ?? {},
  };
}

/**
 * Fetches user preferences from Supabase
 * Returns DEFAULT_USER_PREFERENCES when no row exists yet
 */
export async function fetchPreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<SyncResult<UserPreferences>> {
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select(
        "dietary_restrictions, accessibility_needs, default_group_type, default_pace, accommodation_style, default_vibes, learned_vibes",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      logger.warn("Failed to load user preferences", { error });
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: true, data: DEFAULT_USER_PREFERENCES };
    }

    return { success: true, data: rowToPreferences(data as Record<string, unknown>) };
  } catch (error) {
    const message = getErrorMessage(error);
    logger.error("Error fetching user preferences", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Upserts user preferences to Supabase
 */
export async function savePreferences(
  supabase: SupabaseClient,
  userId: string,
  prefs: UserPreferences,
): Promise<SyncResult<void>> {
  try {
    const { error } = await supabase.from("user_preferences").upsert(
      {
        user_id: userId,
        dietary_restrictions: prefs.dietaryRestrictions,
        accessibility_needs: prefs.accessibilityNeeds,
        default_group_type: prefs.defaultGroupType ?? null,
        default_pace: prefs.defaultPace ?? null,
        accommodation_style: prefs.accommodationStyle,
        default_vibes: prefs.defaultVibes,
        learned_vibes: prefs.learnedVibes,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error ?? {});
    logger.error("Failed to save user preferences", new Error(message));
    return { success: false, error: message };
  }
}

/**
 * Auth-aware wrapper that saves preferences for the current user
 * Returns success silently for guests (no session)
 */
export async function syncPreferencesSave(
  supabase: SupabaseClient,
  prefs: UserPreferences,
): Promise<SyncResult<void>> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      if (isAuthSessionMissing(authError)) {
        return { success: true };
      }
      logger.error("Failed to read auth session when syncing user preferences", authError);
      return { success: false, error: getErrorMessage(authError) };
    }

    if (!user) {
      return { success: true };
    }

    return await savePreferences(supabase, user.id, prefs);
  } catch (error) {
    if (isAuthSessionMissing(error)) {
      return { success: true };
    }
    const message = getErrorMessage(error);
    logger.error("Failed to sync user preferences", new Error(message));
    return { success: false, error: message };
  }
}
