"use client";

import { useQuery } from "@tanstack/react-query";

import type { LocationDurationsResponse } from "@/app/api/locations/durations/route";

/**
 * Fetches summed sub_experiences.time_estimate (minutes) per visible location
 * id. Returns a map { sourceId → totalMinutes }. Cards fall back to the
 * curated `estimatedDuration` and then the category-based static estimate
 * when an id is absent from the response.
 */
export function useLocationDurations(ids: string[]): Record<string, number> {
  const sortedIds = [...ids].sort();
  const key = sortedIds.join(",");

  const { data } = useQuery({
    queryKey: ["location-durations", key],
    queryFn: async (): Promise<LocationDurationsResponse> => {
      if (sortedIds.length === 0) return {};
      const res = await fetch(
        `/api/locations/durations?ids=${encodeURIComponent(key)}`,
      );
      if (!res.ok) return {};
      return (await res.json()) as LocationDurationsResponse;
    },
    enabled: sortedIds.length > 0,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  return data ?? {};
}
