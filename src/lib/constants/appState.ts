/**
 * Constants for AppState management
 */

/**
 * Debounce delay for localStorage writes (milliseconds)
 * Prevents excessive writes during rapid state changes
 */
export const APP_STATE_DEBOUNCE_MS = 500;

/**
 * Maximum number of edit history entries to keep per trip
 * Limits memory usage while maintaining useful undo/redo functionality
 */
export const MAX_EDIT_HISTORY_ENTRIES = 50;

/**
 * Stable default user ID used for SSR to prevent hydration mismatches
 * Real ID will be generated on client after hydration
 */
export const STABLE_DEFAULT_USER_ID = "default-user-id";

/**
 * Duration for toast notifications in milliseconds
 */
export const TOAST_DURATION_MS = 8000;

/**
 * Maximum display name length for user profiles
 */
export const MAX_DISPLAY_NAME_LENGTH = 100;
