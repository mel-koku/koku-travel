/**
 * Server-side location service for fetching locations from the database
 *
 * This service replaces the need for MOCK_LOCATIONS by providing async functions
 * to query the real 2,586 locations stored in Supabase.
 */

import { createClient } from "@/lib/supabase/server";
import type { Location } from "@/types/location";
import {
  LOCATION_ITINERARY_COLUMNS,
  LOCATION_LISTING_COLUMNS,
  type LocationDbRow,
  type LocationListingDbRow,
} from "@/lib/supabase/projections";
import { assertLocationDbRow, assertLocationDbRows } from "@/lib/supabase/assertDbRow";
import { logger } from "@/lib/logger";

/**
 * Fetches the total count of explorable locations in the database
 *
 * Only counts locations that are not permanently closed,
 * matching the filtering logic used by the /api/locations endpoint.
 *
 * @returns The total number of explorable locations
 */
export async function getLocationCount(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED");

  if (error || count === null) {
    return 0;
  }

  return count;
}

/**
 * Transforms a database row to a Location type
 * Works with both full LocationDbRow and LocationListingDbRow
 */
export function transformDbRowToLocation(row: LocationDbRow | LocationListingDbRow): Location {
  // Base fields present in both types
  const base: Location = {
    id: row.id,
    name: row.name,
    region: row.region,
    city: row.city,
    prefecture: row.prefecture ?? undefined,
    category: row.category,
    image: row.image,
    minBudget: row.min_budget ?? undefined,
    estimatedDuration: row.estimated_duration ?? undefined,
    shortDescription: "short_description" in row ? row.short_description ?? undefined : undefined,
    rating: "rating" in row ? row.rating ?? undefined : undefined,
    reviewCount: "review_count" in row ? row.review_count ?? undefined : undefined,
    placeId: row.place_id ?? undefined,
    primaryPhotoUrl: "primary_photo_url" in row ? row.primary_photo_url ?? undefined : undefined,
    // Google Places enrichment fields (present in both types)
    googlePrimaryType: "google_primary_type" in row ? row.google_primary_type ?? undefined : undefined,
    googleTypes: "google_types" in row ? row.google_types ?? undefined : undefined,
    businessStatus: "business_status" in row ? row.business_status as Location["businessStatus"] ?? undefined : undefined,
    priceLevel: "price_level" in row ? (row.price_level as 0 | 1 | 2 | 3 | 4 | null) ?? undefined : undefined,
    accessibilityOptions: "accessibility_options" in row ? row.accessibility_options ?? undefined : undefined,
    dietaryOptions: "dietary_options" in row ? row.dietary_options ?? undefined : undefined,
  };

  // Extended fields only present in full LocationDbRow
  if ("operating_hours" in row) {
    const fullRow = row as LocationDbRow;
    return {
      ...base,
      neighborhood: fullRow.neighborhood ?? undefined,
      description: fullRow.description ?? undefined,
      operatingHours: fullRow.operating_hours ?? undefined,
      recommendedVisit: fullRow.recommended_visit ?? undefined,
      preferredTransitModes: fullRow.preferred_transit_modes ?? undefined,
      coordinates: fullRow.coordinates ?? undefined,
      timezone: fullRow.timezone ?? undefined,
      // Additional Google Places enrichment fields
      mealOptions: fullRow.meal_options ?? undefined,
      goodForChildren: fullRow.good_for_children ?? undefined,
      goodForGroups: fullRow.good_for_groups ?? undefined,
      outdoorSeating: fullRow.outdoor_seating ?? undefined,
      reservable: fullRow.reservable ?? undefined,
      editorialSummary: fullRow.editorial_summary ?? undefined,
      // Seasonal fields
      isSeasonal: fullRow.is_seasonal ?? undefined,
      seasonalType: fullRow.seasonal_type ?? undefined,
    };
  }

  return base;
}

/**
 * Fetches a single location by ID
 *
 * @param id - The location ID
 * @returns The location or null if not found
 */
export async function fetchLocationById(id: string): Promise<Location | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .select(LOCATION_ITINERARY_COLUMNS)
    .eq("id", id)
    .single();

  if (error || !data) {
    if (error) logger.error("[fetchLocationById] Supabase query failed", { error: error.message, code: error.code, id });
    return null;
  }

  assertLocationDbRow(data, "fetchLocationById");
  return transformDbRowToLocation(data as unknown as LocationDbRow);
}

/**
 * Fetches multiple locations by their IDs
 *
 * @param ids - Array of location IDs
 * @returns Array of locations (may be fewer than requested if some IDs not found)
 */
export async function fetchLocationsByIds(ids: string[]): Promise<Location[]> {
  if (ids.length === 0) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .select(LOCATION_ITINERARY_COLUMNS)
    .in("id", ids);

  if (error || !data) {
    if (error) logger.error("[fetchLocationsByIds] Supabase query failed", { error: error.message, code: error.code });
    return [];
  }

  assertLocationDbRows(data, "fetchLocationsByIds");
  return (data as unknown as LocationDbRow[]).map(transformDbRowToLocation);
}

/**
 * Fetches a single location by name (case-insensitive)
 *
 * @param name - The location name to search for
 * @returns The location or null if not found
 */
export async function fetchLocationByName(name: string): Promise<Location | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .select(LOCATION_ITINERARY_COLUMNS)
    .ilike("name", name)
    .limit(1)
    .single();

  if (error || !data) {
    if (error) logger.error("[fetchLocationByName] Supabase query failed", { error: error.message, code: error.code, name });
    return null;
  }

  assertLocationDbRow(data, "fetchLocationByName");
  return transformDbRowToLocation(data as unknown as LocationDbRow);
}

/**
 * Fetches multiple locations by names in a single batch query (case-insensitive)
 *
 * @param names - Array of location names to search for
 * @returns Array of matching locations
 */
export async function fetchLocationsByNames(names: string[]): Promise<Location[]> {
  if (names.length === 0) {
    return [];
  }

  const supabase = await createClient();

  // Build case-insensitive OR filter for all names
  const nameFilters = names.map((n) => `name.ilike.${n}`).join(",");

  const { data, error } = await supabase
    .from("locations")
    .select(LOCATION_ITINERARY_COLUMNS)
    .or(nameFilters);

  if (error || !data) {
    if (error) logger.error("[fetchLocationsByNames] Supabase query failed", { error: error.message, code: error.code });
    return [];
  }

  assertLocationDbRows(data, "fetchLocationsByNames");
  return (data as unknown as LocationDbRow[]).map(transformDbRowToLocation);
}

/**
 * Options for filtering locations by city
 */
export interface FetchByCityOptions {
  /** Limit the number of results */
  limit?: number;
  /** Exclude specific location IDs */
  excludeIds?: string[];
  /** Only include locations with valid place_id */
  requirePlaceId?: boolean;
}

/**
 * Fetches locations by city
 *
 * @param city - The city name to filter by
 * @param options - Additional filtering options
 * @returns Array of matching locations
 */
export async function fetchLocationsByCity(
  city: string,
  options: FetchByCityOptions = {},
): Promise<Location[]> {
  const { limit = 100, excludeIds = [], requirePlaceId = true } = options;

  const supabase = await createClient();

  let query = supabase
    .from("locations")
    .select(LOCATION_ITINERARY_COLUMNS)
    .ilike("city", city);

  if (requirePlaceId) {
    query = query.not("place_id", "is", null).neq("place_id", "");
  }

  // Exclude permanently closed locations but include null business_status
  query = query.or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED");

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, error } = await query.limit(limit);

  if (error || !data) {
    if (error) logger.error("[fetchLocationsByCity] Supabase query failed", { error: error.message, code: error.code, city });
    return [];
  }

  assertLocationDbRows(data, "fetchLocationsByCity");
  return (data as unknown as LocationDbRow[]).map(transformDbRowToLocation);
}

/**
 * Options for filtering locations by categories
 */
export interface FetchByCategoriesOptions {
  /** Limit the number of results */
  limit?: number;
  /** Filter by city (optional) */
  city?: string;
  /** Exclude specific location IDs */
  excludeIds?: string[];
  /** Only include locations with valid place_id */
  requirePlaceId?: boolean;
}

/**
 * Fetches locations by categories
 *
 * @param categories - Array of category names to filter by
 * @param options - Additional filtering options
 * @returns Array of matching locations
 */
export async function fetchLocationsByCategories(
  categories: string[],
  options: FetchByCategoriesOptions = {},
): Promise<Location[]> {
  if (categories.length === 0) {
    return [];
  }

  const { limit = 100, city, excludeIds = [], requirePlaceId = true } = options;

  const supabase = await createClient();

  let query = supabase
    .from("locations")
    .select(LOCATION_ITINERARY_COLUMNS)
    .in("category", categories);

  if (city) {
    query = query.ilike("city", city);
  }

  if (requirePlaceId) {
    query = query.not("place_id", "is", null).neq("place_id", "");
  }

  // Exclude permanently closed locations but include null business_status
  query = query.or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED");

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, error } = await query.limit(limit);

  if (error || !data) {
    if (error) logger.error("[fetchLocationsByCategories] Supabase query failed", { error: error.message, code: error.code, categories });
    return [];
  }

  assertLocationDbRows(data, "fetchLocationsByCategories");
  return (data as unknown as LocationDbRow[]).map(transformDbRowToLocation);
}

/**
 * Fetches locations for batch API endpoint (listing columns only)
 *
 * @param ids - Array of location IDs
 * @returns Array of locations with listing columns
 */
export async function fetchLocationsByIdsForListing(ids: string[]): Promise<Location[]> {
  if (ids.length === 0) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .select(LOCATION_LISTING_COLUMNS)
    .in("id", ids);

  if (error || !data) {
    if (error) logger.error("[fetchLocationsByIdsForListing] Supabase query failed", { error: error.message, code: error.code });
    return [];
  }

  assertLocationDbRows(data, "fetchLocationsByIdsForListing");
  return (data as unknown as LocationListingDbRow[]).map(transformDbRowToLocation);
}

/**
 * Options for fetching top-rated locations
 */
export interface FetchTopRatedOptions {
  /** Maximum number of locations to return (default: 8) */
  limit?: number;
  /** Minimum rating threshold (default: 4.0) */
  minRating?: number;
  /** Minimum number of reviews required (default: 10) */
  minReviewCount?: number;
}

/**
 * Fetches top-rated locations for featured display
 *
 * @param options - Filtering options
 * @returns Array of top-rated locations sorted by rating descending
 */
export async function fetchTopRatedLocations(
  options: FetchTopRatedOptions = {},
): Promise<Location[]> {
  const { limit = 8, minRating = 4.0, minReviewCount = 10 } = options;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .select(LOCATION_LISTING_COLUMNS)
    .not("place_id", "is", null)
    .neq("place_id", "")
    .or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED")
    .not("rating", "is", null)
    .gte("rating", minRating)
    .not("review_count", "is", null)
    .gte("review_count", minReviewCount)
    .not("primary_photo_url", "is", null)
    .order("rating", { ascending: false })
    .order("review_count", { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) logger.error("[fetchTopRatedLocations] Supabase query failed", { error: error.message, code: error.code });
    return [];
  }

  assertLocationDbRows(data, "fetchTopRatedLocations");
  return (data as unknown as LocationListingDbRow[]).map(transformDbRowToLocation);
}

/**
 * Valid pattern for city names - letters, spaces, and hyphens only
 * Used to prevent SQL injection in city filter queries
 */
const VALID_CITY_PATTERN = /^[A-Za-z\s-]+$/;

/**
 * Validates city names before building filter strings
 * @throws Error if any city name contains invalid characters
 */
function validateCityNames(cities: string[]): void {
  for (const city of cities) {
    if (!VALID_CITY_PATTERN.test(city)) {
      throw new Error(`Invalid city name: "${city}". City names must contain only letters, spaces, and hyphens.`);
    }
  }
}

/**
 * Options for fetching all locations
 */
export interface FetchAllLocationsOptions {
  /** Filter by specific cities (case-insensitive) */
  cities?: string[];
  /** Maximum number of pages to fetch (default: 100) */
  maxPages?: number;
  /** Items per page (default: 100) */
  pageSize?: number;
}

/**
 * Fetches all locations from the database with pagination
 *
 * This function handles large datasets by paginating through results.
 * It validates city names to prevent injection attacks.
 *
 * @param options - Filtering and pagination options
 * @returns Array of all matching locations
 * @throws Error if database query fails or no locations found
 */
export async function fetchAllLocations(
  options: FetchAllLocationsOptions = {},
): Promise<Location[]> {
  const { cities, maxPages = 100, pageSize = 100 } = options;

  // Validate city names if provided
  if (cities && cities.length > 0) {
    validateCityNames(cities);
  }

  const supabase = await createClient();

  // Use larger page size (1000) to reduce round trips — was 100, causing 40+ sequential fetches
  const effectivePageSize = Math.max(pageSize, 1000);

  // First, fetch page 0 to determine if we need more
  let baseQuery = supabase
    .from("locations")
    .select(LOCATION_ITINERARY_COLUMNS)
    .order("name", { ascending: true });

  if (cities && cities.length > 0) {
    const cityFilters = cities.map((c) => `city.ilike.${c}`).join(",");
    baseQuery = baseQuery.or(cityFilters);
  }

  const { data: firstPage, error: firstError } = await baseQuery.range(0, effectivePageSize - 1);

  if (firstError) {
    throw new Error(`Failed to fetch locations from database: ${firstError.message}`);
  }

  if (!firstPage || firstPage.length === 0) {
    throw new Error("No locations found in database. Please ensure locations are seeded.");
  }

  assertLocationDbRows(firstPage, "fetchAllLocations");
  const allLocations: Location[] = (firstPage as unknown as LocationDbRow[]).map(transformDbRowToLocation);

  // If first page was full, fetch remaining pages in parallel
  if (firstPage.length === effectivePageSize) {
    // Estimate total pages needed and fire requests in parallel
    const pagePromises: Promise<Location[]>[] = [];
    for (let page = 1; page < maxPages; page++) {
      pagePromises.push(
        (async () => {
          let query = supabase
            .from("locations")
            .select(LOCATION_ITINERARY_COLUMNS)
            .order("name", { ascending: true });

          if (cities && cities.length > 0) {
            const cityFilters = cities.map((c) => `city.ilike.${c}`).join(",");
            query = query.or(cityFilters);
          }

          const { data, error } = await query.range(
            page * effectivePageSize,
            (page + 1) * effectivePageSize - 1,
          );

          if (error || !data || data.length === 0) {
            return [];
          }
          assertLocationDbRows(data, "fetchAllLocations.page");
          return (data as unknown as LocationDbRow[]).map(transformDbRowToLocation);
        })(),
      );
    }

    // Resolve all in parallel — empty arrays indicate we've passed the last page
    const results = await Promise.all(pagePromises);
    for (const locations of results) {
      if (locations.length === 0) break;
      allLocations.push(...locations);
    }
  }

  return allLocations;
}
