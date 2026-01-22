"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Location } from "@/types/location";
import type { PaginatedResponse } from "@/lib/api/pagination";
import type { FilterMetadata } from "@/types/filters";
import { logger } from "@/lib/logger";

/**
 * Query key factory for locations
 */
export const locationsKeys = {
  all: ["locations"] as const,
  lists: () => [...locationsKeys.all, "list"] as const,
  list: (filters?: Record<string, string>) => [...locationsKeys.lists(), filters] as const,
  // v3 includes normalized prefecture names (removed " Prefecture" suffix)
  filterMetadata: () => [...locationsKeys.all, "filter-metadata", "v3"] as const,
};

type LocationsResponse = PaginatedResponse<Location>;

/**
 * Fetches a page of locations from the API
 */
async function fetchLocationsPage(
  page: number,
  limit: number = 100,
): Promise<LocationsResponse> {
  const response = await fetch(`/api/locations?page=${page}&limit=${limit}`);

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

  return (await response.json()) as LocationsResponse;
}

/**
 * Fetches filter metadata from the API
 */
async function fetchFilterMetadata(): Promise<FilterMetadata> {
  // Add version parameter to bust cache (v3 = normalized prefecture names)
  const response = await fetch("/api/locations/filter-options?v=3");

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

  return (await response.json()) as FilterMetadata;
}

/**
 * React Query hook for fetching all locations with progressive loading
 *
 * Features:
 * - Loads first 100 locations immediately
 * - Progressively fetches remaining locations in background
 * - Automatic caching with TTL (10 min stale, 1 hour garbage collection)
 * - Automatic retry on failure
 *
 * @returns Infinite query result with pages of locations
 */
export function useAllLocationsQuery() {
  return useInfiniteQuery({
    queryKey: locationsKeys.list(),
    queryFn: ({ pageParam = 1 }) => fetchLocationsPage(pageParam, 100),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNext
        ? lastPage.pagination.page + 1
        : undefined;
    },
    // Data is considered fresh for 10 minutes
    staleTime: 10 * 60 * 1000,
    // Keep in cache for 1 hour after last use
    gcTime: 60 * 60 * 1000,
    // Retry up to 2 times on failure
    retry: 2,
    // Don't refetch on window focus for this data
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook for fetching filter metadata
 *
 * Features:
 * - Fetches pre-computed filter options (cities, categories, regions)
 * - Long cache time (1 hour) since filter options change infrequently
 * - Automatic retry on failure
 *
 * @returns Query result with filter metadata
 */
export function useFilterMetadataQuery() {
  return useQuery({
    queryKey: locationsKeys.filterMetadata(),
    queryFn: fetchFilterMetadata,
    // Data is considered fresh for 1 hour (changes infrequently)
    staleTime: 60 * 60 * 1000,
    // Keep in cache for 2 hours after last use
    gcTime: 2 * 60 * 60 * 1000,
    // Retry up to 2 times on failure
    retry: 2,
    // Don't refetch on window focus for this data
    refetchOnWindowFocus: false,
  });
}

/**
 * Aggregates all pages from infinite query into a single locations array
 *
 * @returns Object with flattened locations array and loading states
 */
export function useAggregatedLocations() {
  const {
    data,
    status,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useAllLocationsQuery();

  // Flatten all pages into single array
  const locations = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data?.pages]);

  // Get total from first page
  const total = data?.pages[0]?.pagination.total ?? 0;

  // Check if we're still loading more pages
  const isLoadingMore = isFetchingNextPage;

  // Check if initial load is complete
  const isLoading = status === "pending";

  // Map error
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  return {
    locations,
    total,
    isLoading,
    isLoadingMore,
    error: errorMessage,
    hasNextPage,
    fetchNextPage,
    refetch,
    status,
  };
}

/**
 * Prefetch all locations into the cache
 * Useful for preloading data before navigation
 */
export function prefetchAllLocations(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return queryClient.prefetchInfiniteQuery({
    queryKey: locationsKeys.list(),
    queryFn: ({ pageParam = 1 }) => fetchLocationsPage(pageParam, 100),
    initialPageParam: 1,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Prefetch filter metadata into the cache
 * Useful for preloading data before navigation
 */
export function prefetchFilterMetadata(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return queryClient.prefetchQuery({
    queryKey: locationsKeys.filterMetadata(),
    queryFn: fetchFilterMetadata,
    staleTime: 60 * 60 * 1000,
  });
}
