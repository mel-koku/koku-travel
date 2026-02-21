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
  SeasonalType,
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
  city_original: string | null;
  neighborhood: string | null;
  prefecture: string | null;
  category: string;
  image: string;
  description: string | null;
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
  primary_photo_url: string | null;
  // Google Places enrichment fields
  google_primary_type: string | null;
  google_types: string[] | null;
  business_status: string | null;
  price_level: number | null;
  accessibility_options: {
    wheelchairAccessibleEntrance?: boolean;
    wheelchairAccessibleParking?: boolean;
    wheelchairAccessibleRestroom?: boolean;
    wheelchairAccessibleSeating?: boolean;
  } | null;
  dietary_options: {
    servesVegetarianFood?: boolean;
  } | null;
  service_options: {
    dineIn?: boolean;
    takeout?: boolean;
    delivery?: boolean;
  } | null;
  meal_options: {
    servesBreakfast?: boolean;
    servesBrunch?: boolean;
    servesLunch?: boolean;
    servesDinner?: boolean;
  } | null;
  is_featured: boolean | null;
  is_hidden_gem: boolean | null;
  // Enhanced enrichment fields
  good_for_children: boolean | null;
  good_for_groups: boolean | null;
  outdoor_seating: boolean | null;
  reservable: boolean | null;
  editorial_summary: string | null;
  // Seasonal availability fields
  is_seasonal: boolean | null;
  seasonal_type: SeasonalType | null;
  // Practical travel info (Gemini-enriched)
  name_japanese: string | null;
  nearest_station: string | null;
  cash_only: boolean | null;
  reservation_info: "required" | "recommended" | null;
  tags: string[] | null;
  cuisine_type: string | null;
};

/**
 * Columns needed for location listings/grids (21 columns)
 * Used by: ExploreShell, search results
 * Includes Google Places enrichment fields for filtering
 */
// Note: is_featured column requires migration 20260124_add_is_featured_column.sql
// Once migration is run, add is_featured to this list to enable manual curation
export const LOCATION_LISTING_COLUMNS = `
  id,
  name,
  region,
  city,
  prefecture,
  category,
  image,
  short_description,
  rating,
  review_count,
  estimated_duration,
  min_budget,
  place_id,
  primary_photo_url,
  coordinates,
  google_primary_type,
  google_types,
  business_status,
  price_level,
  accessibility_options,
  dietary_options,
  service_options,
  tags
`.replace(/\s+/g, "");

/**
 * Slimmed projection for the explore /api/locations/all endpoint (15 columns).
 * Drops 6 fields unused by ExploreCompactCard / map: place_id, min_budget,
 * google_types, business_status, service_options, short_description.
 */
export const LOCATION_EXPLORE_COLUMNS = `
  id,
  name,
  region,
  city,
  prefecture,
  category,
  image,
  rating,
  review_count,
  estimated_duration,
  primary_photo_url,
  coordinates,
  google_primary_type,
  price_level,
  accessibility_options,
  dietary_options,
  is_hidden_gem,
  name_japanese,
  nearest_station,
  cash_only,
  reservation_info,
  operating_hours,
  good_for_children,
  good_for_groups,
  meal_options,
  service_options,
  tags
`.replace(/\s+/g, "");

/**
 * Columns needed for location detail views (18 columns)
 * Used by: LocationExpanded, /api/locations/[id]
 */
export const LOCATION_DETAIL_COLUMNS = `
  id,
  name,
  region,
  city,
  category,
  image,
  description,
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
 * Columns needed for itinerary generation (24 columns)
 * Used by: itineraryGenerator, itineraryEngine, /api/itinerary/refine
 * Includes Google Places enrichment fields for meal planning and filtering
 */
export const LOCATION_ITINERARY_COLUMNS = `
  id,
  name,
  region,
  city,
  neighborhood,
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
  min_budget,
  google_primary_type,
  google_types,
  business_status,
  meal_options,
  good_for_children,
  good_for_groups,
  outdoor_seating,
  reservable,
  editorial_summary,
  is_seasonal,
  seasonal_type,
  price_level,
  accessibility_options,
  dietary_options,
  tags,
  cuisine_type
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
 * Subset of LocationDbRow for the explore /api/locations/all endpoint
 */
export type LocationExploreDbRow = Pick<LocationDbRow,
  | "id"
  | "name"
  | "region"
  | "city"
  | "prefecture"
  | "category"
  | "image"
  | "rating"
  | "review_count"
  | "estimated_duration"
  | "primary_photo_url"
  | "coordinates"
  | "google_primary_type"
  | "price_level"
  | "accessibility_options"
  | "dietary_options"
  | "is_hidden_gem"
  | "name_japanese"
  | "nearest_station"
  | "cash_only"
  | "reservation_info"
  | "operating_hours"
  | "good_for_children"
  | "good_for_groups"
  | "meal_options"
  | "service_options"
  | "tags"
>;

/**
 * Subset of LocationDbRow for listing endpoint
 * Includes Google Places enrichment fields for filtering
 */
// Note: Add "is_featured" once migration 20260124_add_is_featured_column.sql is run
/**
 * Columns needed for AI chat responses (18 columns)
 * Used by: Ask Koku chat tools
 */
export const LOCATION_CHAT_COLUMNS = `
  id,
  name,
  city,
  region,
  prefecture,
  category,
  image,
  short_description,
  editorial_summary,
  description,
  rating,
  review_count,
  price_level,
  estimated_duration,
  operating_hours,
  coordinates,
  primary_photo_url,
  business_status
`.replace(/\s+/g, "");

/**
 * Subset of LocationDbRow for AI chat responses
 */
export type LocationChatDbRow = Pick<LocationDbRow,
  | "id"
  | "name"
  | "city"
  | "region"
  | "prefecture"
  | "category"
  | "image"
  | "short_description"
  | "editorial_summary"
  | "description"
  | "rating"
  | "review_count"
  | "price_level"
  | "estimated_duration"
  | "operating_hours"
  | "coordinates"
  | "primary_photo_url"
  | "business_status"
>;

export type LocationListingDbRow = Pick<LocationDbRow,
  | "id"
  | "name"
  | "region"
  | "city"
  | "prefecture"
  | "category"
  | "image"
  | "short_description"
  | "rating"
  | "review_count"
  | "estimated_duration"
  | "min_budget"
  | "place_id"
  | "primary_photo_url"
  | "coordinates"
  | "google_primary_type"
  | "google_types"
  | "business_status"
  | "price_level"
  | "accessibility_options"
  | "dietary_options"
  | "service_options"
  | "tags"
>;
