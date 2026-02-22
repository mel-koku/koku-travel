/**
 * Custom React hooks for the application
 *
 * This module exports all custom hooks for:
 * - Location data (React Query based)
 * - Saved places management (React Query with optimistic updates)
 * - Bookmarks management (React Query with optimistic updates)
 * - Location details caching
 */

// Location data hooks
export {
  locationsKeys,
  useAllLocationsQuery,
  useFilterMetadataQuery,
  useAggregatedLocations,
  prefetchAllLocations,
  prefetchFilterMetadata,
} from "./useLocationsQuery";

// Saved places hooks
export {
  savedKeys,
  useSavedQuery,
  useToggleSavedMutation,
  useSavedPlaces,
} from "./useSavedQuery";

// Bookmarks hooks
export {
  bookmarkKeys,
  useBookmarksQuery,
  useToggleBookmarkMutation,
  useBookmarks,
} from "./useBookmarksQuery";

// Location details hook
export { useLocationDetailsQuery } from "./useLocationDetailsQuery";

// Saved locations hook
export {
  savedLocationsKeys,
  useSavedLocations,
} from "./useSavedLocations";

// Activity locations hook
export {
  activityLocationsKeys,
  useActivityLocations,
  useActivityLocation,
} from "./useActivityLocations";

// Activity replacement hook
export {
  useReplacementCandidates,
  locationToActivity,
  type ReplacementCandidate,
  type ReplacementOptions,
  type ScoreBreakdown,
} from "./useReplacementCandidates";

// Itinerary planning hook
export {
  usePlanItinerary,
  planItineraryClient,
  type PlannerOptions,
  type DayEntryPoints,
} from "./usePlanItinerary";

// Location search hook (database-backed)
export {
  locationSearchKeys,
  useLocationSearch,
  type LocationSearchOptions,
  type LocationSearchResult,
} from "./useLocationSearch";
