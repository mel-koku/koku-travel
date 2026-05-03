"use client";

import { useQuery } from "@tanstack/react-query";

import type { LocationPair, LocationPairsResponse } from "@/app/api/locations/pairs/route";

/**
 * Fetches one curated cluster pair per visible location ID. Returns a map
 * { sourceId → pair | null }. Cards omit the line entirely when the value
 * is null so users only see "Pairs with X" when there's an authored cluster.
 */
export function useLocationPairs(ids: string[]): Record<string, LocationPair | null> {
  const sortedIds = [...ids].sort();
  const key = sortedIds.join(",");

  const { data } = useQuery({
    queryKey: ["location-pairs", key],
    queryFn: async (): Promise<LocationPairsResponse> => {
      if (sortedIds.length === 0) return {};
      const res = await fetch(`/api/locations/pairs?ids=${encodeURIComponent(key)}`);
      if (!res.ok) return {};
      return (await res.json()) as LocationPairsResponse;
    },
    enabled: sortedIds.length > 0,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  return data ?? {};
}
