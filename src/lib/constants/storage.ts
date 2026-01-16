/**
 * Storage keys used throughout the application
 * Centralized to prevent typos and ensure consistency
 */

/**
 * LocalStorage key for app state (user, favorites, trips, etc.)
 */
export const APP_STATE_STORAGE_KEY = "koku_app_state_v1";

/**
 * LocalStorage key for trip builder form data
 */
export const TRIP_BUILDER_STORAGE_KEY = "koku_trip_builder";

/**
 * LocalStorage key for wishlist/favorites (legacy, migrated to APP_STATE_STORAGE_KEY)
 */
export const WISHLIST_STORAGE_KEY = "koku_wishlist";
