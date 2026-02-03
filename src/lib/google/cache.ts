/**
 * Cache management for Google Places API data.
 *
 * This module provides in-memory caching for place IDs and place details
 * to reduce API calls and improve response times.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LocationDetails } from "@/types/location";
import { CACHE_TTL_30_DAYS, CACHE_TTL_7_DAYS } from "@/lib/constants";
import { logger } from "@/lib/logger";

export const PLACE_ID_CACHE_TTL = CACHE_TTL_30_DAYS;
export const PLACE_DETAILS_CACHE_TTL = CACHE_TTL_7_DAYS;
export const PLACE_DETAILS_TABLE = "place_details";
export const SUPABASE_DETAILS_COLUMN_SET = "place_id, payload, fetched_at";

let supabaseServiceWarningLogged = false;

/**
 * Cache entry for place ID lookups.
 */
export type PlaceIdCacheEntry = {
  placeId: string;
  matchedName?: string;
  formattedAddress?: string;
  expiresAt: number;
};

/**
 * Cache entry for place details.
 */
export type PlaceDetailsCacheEntry = {
  details: LocationDetails;
  expiresAt: number;
};

/**
 * Database row type for place details storage.
 */
export type PlaceDetailsRow = {
  location_id: string;
  place_id: string;
  payload: LocationDetails;
  fetched_at: string;
};

/**
 * Supabase client state with persistence capability flag.
 */
export type SupabaseClientState = {
  client: SupabaseClient<Record<string, unknown>> | null;
  canPersist: boolean;
};

// Module-level cache instances (initialized once per module load)
// In Next.js, these persist across requests in the same process but reset on hot reload
const placeIdCache = new Map<string, PlaceIdCacheEntry>();
const placeDetailsCache = new Map<string, PlaceDetailsCacheEntry>();

/**
 * Get the place ID cache instance.
 */
export function getPlaceIdCache(): Map<string, PlaceIdCacheEntry> {
  return placeIdCache;
}

/**
 * Get the place details cache instance.
 */
export function getPlaceDetailsCache(): Map<string, PlaceDetailsCacheEntry> {
  return placeDetailsCache;
}

/**
 * Safely get a Supabase client for caching operations.
 * Returns null if Supabase is not configured or unavailable.
 */
export async function getSupabaseClientSafe(): Promise<SupabaseClientState> {
  // Skip Supabase entirely on client-side (service role key is server-only)
  // This prevents Next.js from trying to analyze server-only modules during client builds
  if (typeof window !== "undefined") {
    return { client: null, canPersist: false };
  }

  // Use dynamic import to avoid analyzing server-only modules during client builds
  // Only use service role client (doesn't require next/headers)
  try {
    const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
    return { client: getServiceRoleClient(), canPersist: true };
  } catch (serviceError) {
    if (!supabaseServiceWarningLogged && process.env.NODE_ENV !== "production") {
      supabaseServiceWarningLogged = true;
      logger.warn(
        "Service-role client unavailable for Google Places cache. Falling back to in-memory cache only.",
        { error: serviceError },
      );
    }
    return { client: null, canPersist: false };
  }
}

/**
 * Normalize a database row to LocationDetails format.
 */
export function normalizeDetailsRow(row: PlaceDetailsRow): LocationDetails {
  const payload = row.payload ?? ({} as LocationDetails);
  return {
    ...payload,
    placeId: payload.placeId ?? row.place_id,
    fetchedAt: payload.fetchedAt ?? row.fetched_at,
    photos: payload.photos ?? [],
    reviews: payload.reviews ?? [],
  };
}
