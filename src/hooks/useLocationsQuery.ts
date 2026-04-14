"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Location } from "@/types/location";
import type { PaginatedResponse } from "@/lib/api/pagination";
import type { FilterMetadata } from "@/types/filters";
import { extractFetchErrorMessage } from "@/lib/api/fetchError";
import { fetchWithTimeout } from "@/lib/utils/fetchWithTimeout";
import {
  LOCATION_STALE_TIME,
  LOCATION_GC_TIME,
  FILTER_METADATA_STALE_TIME,
  FILTER_METADATA_GC_TIME,
  DAY,
} from "@/lib/constants/time";
import { FILTER_METADATA_STORAGE_KEY } from "@/lib/constants/storage";
import { getLocal, setLocal, removeLocal } from "@/lib/storageHelpers";

// TTL for filter metadata persistence
const FILTER_METADATA_STORAGE_TTL = DAY; // 24 hours

type StoredFilterMetadata = {
  data: FilterMetadata;
  cachedAt: number;
};

/**
 * Gets filter metadata from localStorage if available and not expired
 */
function getFilterMetadataFromStorage(): FilterMetadata | null {
  const stored = getLocal<StoredFilterMetadata>(FILTER_METADATA_STORAGE_KEY);
  if (!stored) return null;

  const age = Date.now() - stored.cachedAt;
  if (age > FILTER_METADATA_STORAGE_TTL) {
    removeLocal(FILTER_METADATA_STORAGE_KEY);
    return null;
  }

  return stored.data;
}

/**
 * Saves filter metadata to localStorage
 */
function setFilterMetadataToStorage(data: FilterMetadata): void {
  setLocal<StoredFilterMetadata>(FILTER_METADATA_STORAGE_KEY, {
    data,
    cachedAt: Date.now(),
  });
}

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

/**
 * Fetches filter metadata from localStorage or API
 * Persists to localStorage after successful fetch for 24-hour caching
 */
async function fetchFilterMetadata(): Promise<FilterMetadata> {
  // Check localStorage first
  const cached = getFilterMetadataFromStorage();
  if (cached) {
    return cached;
  }

  // Fetch from API
  const response = await fetch("/api/locations/filter-options?v=3");

  if (!response.ok) {
    throw new Error(await extractFetchErrorMessage(response));
  }

  const data = (await response.json()) as FilterMetadata;

  // Persist to localStorage for future sessions
  setFilterMetadataToStorage(data);

  return data;
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
    staleTime: FILTER_METADATA_STALE_TIME,
    gcTime: FILTER_METADATA_GC_TIME,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Single-request hook that fetches all locations from /api/locations/all.
 * Replaces the 38-page infinite query approach to prevent OOM crashes.
 *
 * @returns Object with all locations, total count, and loading state
 */
export function useAllLocationsSingle() {
  const { data, status, error } = useQuery({
    queryKey: [...locationsKeys.all, "all-single"],
    queryFn: async ({ signal }) => {
      const res = await fetchWithTimeout("/api/locations/all", { signal });
      if (!res.ok) throw new Error("Failed to load locations");
      return (await res.json()) as { data: Location[]; total: number };
    },
    staleTime: LOCATION_STALE_TIME,
    gcTime: LOCATION_GC_TIME,
    retry: 1,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    refetchOnWindowFocus: false,
  });

  return {
    locations: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading: status === "pending",
    error: error instanceof Error ? error.message : null,
  };
}

/**
 * React Query hook for server-side location search.
 * Used by the Explore page to find locations not yet loaded client-side.
 * Only fires when query is at least 2 characters.
 */
export function useLocationSearchQuery(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: [...locationsKeys.all, "search", trimmed],
    queryFn: async (): Promise<Location[]> => {
      const res = await fetch(`/api/locations?search=${encodeURIComponent(trimmed)}&limit=50`);
      if (!res.ok) throw new Error("Search failed");
      const data = (await res.json()) as PaginatedResponse<Location>;
      return data.data;
    },
    enabled: trimmed.length >= 2,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
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
    staleTime: FILTER_METADATA_STALE_TIME,
  });
}

/**
 * React Query hook for fetching nearby locations.
 * Only fires when lat/lng are provided.
 */
export type NearbyLocation = Location & { distance: number };

export function useNearbyLocationsQuery(
  lat: number | null,
  lng: number | null,
  options?: { radius?: number; category?: string; openNow?: boolean; limit?: number },
) {
  const radius = options?.radius ?? 1.5;
  const category = options?.category ?? "";
  const openNow = options?.openNow ?? true;
  const limit = options?.limit ?? 20;

  return useQuery({
    queryKey: [...locationsKeys.all, "nearby", lat, lng, radius, category, openNow, limit],
    queryFn: async (): Promise<{ data: NearbyLocation[]; total: number }> => {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: String(radius),
        openNow: String(openNow),
        limit: String(limit),
      });
      if (category) params.set("category", category);

      const res = await fetch(`/api/locations/nearby?${params}`);
      if (!res.ok) throw new Error("Failed to load nearby locations");
      return res.json() as Promise<{ data: NearbyLocation[]; total: number }>;
    },
    enabled: lat !== null && lng !== null,
    staleTime: 2 * 60_000, // 2 min — nearby results change with time (open/closed)
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
