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
   * Activities that were saved by the user
   */
  savedActivities: Array<{
    activityId: string;
    locationId: string;
    savedAt: string;
  }>;

  /**
   * Preferred location categories (learned from saved places and replacements)
   */
  preferredCategories: Record<string, number>; // category -> preference score

  /**
   * Preferred price ranges (learned from saved places)
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
  savedActivities: [],
  preferredCategories: {},
  preferredPriceRanges: {},
  preferredActivityTypes: {},
  lastUpdated: new Date().toISOString(),
};

/**
 * Preference event types
 */
export type PreferenceEventType = "replace" | "skip" | "save" | "unsave";

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

