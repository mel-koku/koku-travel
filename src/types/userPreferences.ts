import type { Location } from "./location";

/**
 * User preference data learned from behavior
 */
export type UserPreferences = {
  /**
   * Activities that were replaced by the user
   */
  replacedActivities: Array<{
    activityId: string;
    locationId: string;
    replacedAt: string;
    reason?: string;
  }>;

  /**
   * Activities that were skipped/deleted by the user
   */
  skippedActivities: Array<{
    activityId: string;
    locationId: string;
    skippedAt: string;
  }>;

  /**
   * Activities that were favorited by the user
   */
  favoriteActivities: Array<{
    activityId: string;
    locationId: string;
    favoritedAt: string;
  }>;

  /**
   * Preferred location categories (learned from favorites and replacements)
   */
  preferredCategories: Record<string, number>; // category -> preference score

  /**
   * Preferred price ranges (learned from favorites)
   */
  preferredPriceRanges: Record<string, number>; // price range -> preference score

  /**
   * Preferred activity types (learned from behavior)
   */
  preferredActivityTypes: Record<string, number>; // activity type -> preference score

  /**
   * Last updated timestamp
   */
  lastUpdated: string;
};

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  replacedActivities: [],
  skippedActivities: [],
  favoriteActivities: [],
  preferredCategories: {},
  preferredPriceRanges: {},
  preferredActivityTypes: {},
  lastUpdated: new Date().toISOString(),
};

/**
 * Preference event types
 */
export type PreferenceEventType = "replace" | "skip" | "favorite" | "unfavorite";

/**
 * Preference event data
 */
export type PreferenceEvent = {
  type: PreferenceEventType;
  activityId: string;
  locationId: string;
  location?: Location;
  timestamp: string;
  reason?: string;
};

