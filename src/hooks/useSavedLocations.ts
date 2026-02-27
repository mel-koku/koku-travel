"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Location } from "@/types/location";
import { extractFetchErrorMessage } from "@/lib/api/fetchError";

/**
 * Query key factory for saved locations
 */
export const savedLocationsKeys = {
  all: ["saved-locations"] as const,
  byIds: (ids: string[]) => [...savedLocationsKeys.all, ids.sort().join(",")] as const,
};

/**
 * Response type from the batch locations API
 */
interface BatchLocationsResponse {
  data: Location[];
}

/**
 * Fetches locations by IDs from the batch API
 */
async function fetchSavedLocations(ids: string[]): Promise<Location[]> {
  if (ids.length === 0) {
    return [];
  }

  const response = await fetch(`/api/locations/batch?ids=${ids.join(",")}`);

  if (!response.ok) {
    throw new Error(await extractFetchErrorMessage(response));
  }

  const data = (await response.json()) as BatchLocationsResponse;
  return data.data;
}

/**
 * React Query hook for fetching saved locations
 *
 * Features:
 * - Fetches multiple locations by IDs in a single request
 * - Automatic caching with 5-minute stale time
 * - Only fetches when IDs are provided (enabled check)
 * - Stable query key based on sorted IDs
 *
 * @param savedIds - Array of location IDs to fetch
 * @returns Query result with locations array
 */
export function useSavedLocations(savedIds: string[]) {
  // Memoize the sorted IDs to prevent unnecessary refetches
  const sortedIds = useMemo(() => [...savedIds].sort(), [savedIds]);

  return useQuery({
    queryKey: savedLocationsKeys.byIds(sortedIds),
    queryFn: () => fetchSavedLocations(sortedIds),
    // Only fetch when we have IDs
    enabled: sortedIds.length > 0,
    // Data is considered fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Keep in cache for 30 minutes after last use
    gcTime: 30 * 60 * 1000,
    // Retry up to 2 times on failure
    retry: 2,
    // Don't refetch on window focus for this data
    refetchOnWindowFocus: false,
  });
}
