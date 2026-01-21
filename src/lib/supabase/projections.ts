/**
 * Column projections for Supabase queries
 *
 * Instead of using .select("*") which fetches all 25+ columns,
 * use these targeted projections to fetch only what's needed.
 * This reduces network payload and improves query performance.
 */

import type {
  LocationOperatingHours,
  LocationVisitRecommendation,
  LocationTransitMode,
} from "@/types/location";

/**
 * Database row type for locations table
 * Used for type-safe transformation from Supabase to Location type
 */
export type LocationDbRow = {
  id: string;
  name: string;
  region: string;
  city: string;
  category: string;
  image: string;
  min_budget: string | null;
  estimated_duration: string | null;
  operating_hours: LocationOperatingHours | null;
  recommended_visit: LocationVisitRecommendation | null;
  preferred_transit_modes: LocationTransitMode[] | null;
  coordinates: { lat: number; lng: number } | null;
  timezone: string | null;
  short_description: string | null;
  rating: number | null;
  review_count: number | null;
  place_id: string | null;
};

/**
 * Columns needed for location listings/grids (11 columns)
 * Used by: ExploreShell, LocationGrid, search results
 */
export const LOCATION_LISTING_COLUMNS = `
  id,
  name,
  region,
  city,
  category,
  image,
  short_description,
  rating,
  review_count,
  estimated_duration,
  min_budget,
  place_id
`.replace(/\s+/g, "");

/**
 * Columns needed for location detail views (17 columns)
 * Used by: LocationDetailsModal, /api/locations/[id]
 */
export const LOCATION_DETAIL_COLUMNS = `
  id,
  name,
  region,
  city,
  category,
  image,
  short_description,
  rating,
  review_count,
  estimated_duration,
  min_budget,
  operating_hours,
  recommended_visit,
  coordinates,
  timezone,
  place_id,
  preferred_transit_modes
`.replace(/\s+/g, "");

/**
 * Columns needed for itinerary generation (13 columns)
 * Used by: itineraryGenerator, itineraryEngine, /api/itinerary/refine
 */
export const LOCATION_ITINERARY_COLUMNS = `
  id,
  name,
  region,
  city,
  category,
  image,
  coordinates,
  operating_hours,
  recommended_visit,
  estimated_duration,
  preferred_transit_modes,
  place_id,
  timezone,
  short_description,
  rating,
  review_count,
  min_budget
`.replace(/\s+/g, "");

/**
 * Columns needed for primary photo endpoint (5 columns)
 * Used by: /api/locations/[id]/primary-photo
 */
export const LOCATION_PHOTO_COLUMNS = `
  id,
  name,
  place_id,
  image,
  city,
  region,
  category,
  coordinates
`.replace(/\s+/g, "");

/**
 * Subset of LocationDbRow for photo endpoint
 */
export type LocationPhotoDbRow = Pick<LocationDbRow, "id" | "name" | "place_id" | "image" | "city" | "region" | "category" | "coordinates">;

/**
 * Subset of LocationDbRow for listing endpoint
 */
export type LocationListingDbRow = Pick<LocationDbRow,
  | "id"
  | "name"
  | "region"
  | "city"
  | "category"
  | "image"
  | "short_description"
  | "rating"
  | "review_count"
  | "estimated_duration"
  | "min_budget"
  | "place_id"
>;
