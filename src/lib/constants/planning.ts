/**
 * Planning and itinerary engine constants.
 * Centralizes magic numbers used across scoring, gap detection, and scheduling.
 */

// Itinerary planner — distance/mode thresholds
/** Distance threshold (km) above which transit routing is preferred over walking */
export const TRANSIT_DISTANCE_THRESHOLD_KM = 1;
/** Travel time threshold (minutes) for short-distance train classification */
export const SHORT_DISTANCE_TRAIN_THRESHOLD_MIN = 60;
/** Travel time threshold (minutes) for long-distance shinkansen classification */
export const LONG_DISTANCE_TRAIN_THRESHOLD_MIN = 120;
