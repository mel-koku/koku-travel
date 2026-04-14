/**
 * Shared filter utilities used by usePlacesFilters, useCraftFilters,
 * and useExperienceFilters hooks.
 */

export { parseDuration } from "@/lib/utils/durationParser";
export { normalizePrefecture } from "@/lib/utils/prefectureUtils";
export { calculatePopularityScore } from "@/lib/utils/popularityScoring";
export { generateFallbackRating, generateFallbackReviewCount } from "@/lib/utils/ratingFallbacks";
export { DURATION_FILTERS } from "@/data/durationFilters";

export const PAGE_SIZE = 24;

/**
 * Page size for the /places grid view (numbered pagination).
 * Separate from PAGE_SIZE so other grids (crafts, experiences) are unaffected.
 */
export const PLACES_PAGE_SIZE = 36;
