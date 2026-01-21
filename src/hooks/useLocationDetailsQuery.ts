"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cacheLocationDetails } from "@/state/locationDetailsStore";
import type { LocationDetails } from "@/types/location";
import { logger } from "@/lib/logger";

/**
 * Query key factory for location details
 */
export const locationDetailsKeys = {
  all: ["locationDetails"] as const,
  detail: (id: string) => [...locationDetailsKeys.all, id] as const,
};

type LocationDetailsResponse = {
  details: LocationDetails;
};

/**
 * Fetches location details from the API
 */
async function fetchLocationDetails(locationId: string): Promise<LocationDetails> {
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
  return payload.details;
}

/**
 * React Query hook for fetching location details with automatic caching
 *
 * Features:
 * - Automatic caching with TTL (5 min stale, 30 min garbage collection)
 * - Automatic retry on failure
 * - Updates legacy locationDetailsStore for backwards compatibility
 * - Same interface as the original useLocationDetails hook
 *
 * @param locationId - The location ID to fetch details for
 * @returns Object with status, details, errorMessage, and retry function
 */
export function useLocationDetailsQuery(locationId: string | null) {
  const queryClient = useQueryClient();

  const { data, status, error, refetch } = useQuery({
    queryKey: locationDetailsKeys.detail(locationId ?? ""),
    queryFn: () => fetchLocationDetails(locationId!),
    enabled: !!locationId,
    // Data is considered fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Keep in cache for 30 minutes after last use
    gcTime: 30 * 60 * 1000,
    // Retry up to 2 times on failure
    retry: 2,
    // Don't refetch on window focus for this data
    refetchOnWindowFocus: false,
  });

  // Update legacy store for backwards compatibility with other components
  // that still use useLocationEditorialSummary/useLocationDisplayName
  if (data && locationId) {
    cacheLocationDetails(locationId, data);
  }

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
    details: data ?? null,
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
    staleTime: 5 * 60 * 1000,
  });
}
