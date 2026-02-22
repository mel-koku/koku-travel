/**
 * Storage keys used throughout the application
 * Centralized to prevent typos and ensure consistency
 */

/**
 * LocalStorage key for app state (user, saved places, trips, etc.)
 */
export const APP_STATE_STORAGE_KEY = "koku_app_state_v1";

/**
 * LocalStorage key for trip builder form data
 */
export const TRIP_BUILDER_STORAGE_KEY = "koku_trip_builder";

/**
 * LocalStorage key for saved places (legacy, migrated to APP_STATE_STORAGE_KEY)
 */
export const SAVED_STORAGE_KEY = "koku_saved";

/**
 * LocalStorage key for filter metadata (cities, categories, regions)
 */
export const FILTER_METADATA_STORAGE_KEY = "koku:filter-metadata:v3";

/**
 * LocalStorage key prefix for dismissed smart prompts (per trip)
 */
export const DISMISSED_PROMPTS_PREFIX = "koku:dismissed-prompts:";

/**
 * LocalStorage key for trip confidence checklist
 */
export const CONFIDENCE_CHECKLIST_STORAGE_KEY = "koku:trip-checklist";

/**
 * LocalStorage key for first-save educational toast
 */
export const FIRST_SAVE_TOAST_STORAGE_KEY = "koku_first_save_toast_shown";

/**
 * LocalStorage key for user preference learning data
 */
export const USER_PREFERENCES_STORAGE_KEY = "koku_user_preferences";

/**
 * SessionStorage key for cached geolocation
 */
export const GEOLOCATION_STORAGE_KEY = "koku:geolocation";

/**
 * LocalStorage key for trip step tracker
 */
export const TRIP_STEP_STORAGE_KEY = "koku_trip_step";
