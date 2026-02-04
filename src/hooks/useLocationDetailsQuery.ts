"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LocationDetails } from "@/types/location";
import { logger } from "@/lib/logger";
import { LOCATION_STALE_TIME, LOCATION_GC_TIME } from "@/lib/constants/time";

/**
 * Query key factory for location details
 */
export const locationDetailsKeys = {
  all: ["locationDetails"] as const,
  detail: (id: string) => [...locationDetailsKeys.all, id] as const,
};

type LocationDetailsResponse = {
  location: import("@/types/location").Location;
  details: LocationDetails;
};

type PlaceDetailsResponse = {
  details: LocationDetails;
  location?: import("@/types/location").Location;
};

/**
 * Checks if a location ID looks like a Google Place ID.
 * Google Place IDs have various formats:
 * - Most common: Start with "ChIJ" followed by alphanumeric characters
 * - Some start with other prefixes like "EiQ", "GhIJ", etc.
 * - Generally 27+ characters, but can vary
 *
 * Our database location IDs are slugified names like "kyoto-fushimi-inari-taisha"
 * which are lowercase with hyphens.
 */
function isGooglePlaceId(locationId: string): boolean {
  // Check for common Google Place ID patterns
  // Most start with "ChIJ" but some have other prefixes
  if (/^(ChIJ|EiQ|GhIJ)[A-Za-z0-9_-]{15,}$/.test(locationId)) {
    return true;
  }

  // Our database IDs are slugified (lowercase, hyphens, no uppercase)
  // If the ID has uppercase letters and is long, it's likely a Google Place ID
  if (locationId.length > 20 && /[A-Z]/.test(locationId)) {
    return true;
  }

  return false;
}

/**
 * Result type for location details queries
 */
type LocationDetailsResult = {
  details: LocationDetails;
  location?: import("@/types/location").Location;
};

/**
 * Fetches location details from the database API
 */
async function fetchLocationDetailsFromDb(locationId: string): Promise<LocationDetailsResult> {
  const response = await fetch(`/api/locations/${locationId}`);

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const payload = await response.json();
      if (payload?.error) {
        message = payload.error as string;
      }
    } catch (jsonError) {
      logger.debug("Unable to parse error response", { error: jsonError });
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as LocationDetailsResponse;
  return { details: payload.details, location: payload.location };
}

/**
 * Fetches location details from Google Places API
 */
async function fetchLocationDetailsFromGooglePlaces(placeId: string): Promise<LocationDetailsResult> {
  const response = await fetch(`/api/places/details?placeId=${encodeURIComponent(placeId)}`);

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const payload = await response.json();
      if (payload?.error) {
        message = payload.error as string;
      }
    } catch (jsonError) {
      logger.debug("Unable to parse error response", { error: jsonError });
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as PlaceDetailsResponse;
  return { details: payload.details, location: payload.location };
}

/**
 * Fetches location details from the appropriate API based on ID format
 */
async function fetchLocationDetails(locationId: string): Promise<LocationDetailsResult> {
  if (isGooglePlaceId(locationId)) {
    return fetchLocationDetailsFromGooglePlaces(locationId);
  }
  return fetchLocationDetailsFromDb(locationId);
}

/**
 * Checks if a location ID is valid for fetching (not a fallback or entry point)
 */
function isValidLocationIdForFetch(locationId: string | null): boolean {
  if (!locationId) return false;
  // Skip fallback IDs created by buildFallbackLocation
  if (locationId.startsWith("__fallback__")) return false;
  // Skip entry point IDs (various formats)
  if (locationId.startsWith("__entry_point")) return false;
  if (locationId.startsWith("entry-point")) return false;
  // Skip IDs that look like activity IDs (contain time slot pattern)
  if (/-\d+-(morning|afternoon|evening|night)-\d+$/.test(locationId)) return false;
  return true;
}

/**
 * React Query hook for fetching location details with automatic caching
 *
 * Features:
 * - Automatic caching with TTL (5 min stale, 30 min garbage collection)
 * - Automatic retry on failure
 *
 * @param locationId - The location ID to fetch details for
 * @returns Object with status, details, errorMessage, and retry function
 */
export function useLocationDetailsQuery(locationId: string | null) {
  const queryClient = useQueryClient();
  const isValidId = isValidLocationIdForFetch(locationId);

  const { data, status, error, refetch } = useQuery({
    queryKey: locationDetailsKeys.detail(locationId ?? ""),
    queryFn: () => fetchLocationDetails(locationId!),
    enabled: isValidId,
    staleTime: LOCATION_STALE_TIME,
    gcTime: LOCATION_GC_TIME,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Map React Query status to the original hook's status format
  const mappedStatus = locationId
    ? status === "pending"
      ? "loading"
      : status === "error"
        ? "error"
        : status === "success"
          ? "success"
          : "idle"
    : "idle";

  const retry = () => {
    if (!locationId) return;
    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: locationDetailsKeys.detail(locationId) });
    refetch();
  };

  return {
    status: mappedStatus as "idle" | "loading" | "success" | "error",
    details: data?.details ?? null,
    fetchedLocation: data?.location ?? null,
    errorMessage: error instanceof Error ? error.message : error ? String(error) : null,
    retry,
  };
}

/**
 * Prefetch location details into the cache
 * Useful for preloading data before navigation
 */
export function prefetchLocationDetails(
  queryClient: ReturnType<typeof useQueryClient>,
  locationId: string,
) {
  return queryClient.prefetchQuery({
    queryKey: locationDetailsKeys.detail(locationId),
    queryFn: () => fetchLocationDetails(locationId),
    staleTime: LOCATION_STALE_TIME,
  });
}
