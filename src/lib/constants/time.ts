/**
 * Time constants in milliseconds
 * Used throughout the application for timeouts, cache TTLs, and intervals
 */

// Base time units
export const MILLISECOND = 1;
export const SECOND = 1000 * MILLISECOND;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

// Common timeouts
export const TIMEOUT_10_SECONDS = 10 * SECOND;
export const TIMEOUT_30_SECONDS = 30 * SECOND;
export const TIMEOUT_1_MINUTE = 1 * MINUTE;
export const TIMEOUT_5_MINUTES = 5 * MINUTE;

// Cache TTLs
export const CACHE_TTL_6_HOURS = 6 * HOUR;
export const CACHE_TTL_7_DAYS = 7 * DAY;
export const CACHE_TTL_30_DAYS = 30 * DAY;

// Cleanup intervals
export const CLEANUP_INTERVAL_5_MINUTES = 5 * MINUTE;

