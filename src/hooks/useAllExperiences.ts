"use client";

import { useQuery } from "@tanstack/react-query";
import type { Location } from "@/types/location";
import {
  LOCATION_STALE_TIME,
  LOCATION_GC_TIME,
} from "@/lib/constants/time";
import { fetchWithTimeout } from "@/lib/utils/fetchWithTimeout";

/**
 * Query key factory for experiences
 */
export const experiencesKeys = {
  all: ["experiences"] as const,
};

/**
 * Fetches all experiences from /api/experiences/all.
 * Returns them as Location[] for component compatibility.
 */
export function useAllExperiences() {
  const { data, status, error } = useQuery({
    queryKey: [...experiencesKeys.all, "all-single"],
    queryFn: async ({ signal }) => {
      const res = await fetchWithTimeout("/api/experiences/all", { signal });
      if (!res.ok) throw new Error("Failed to load experiences");
      return res.json() as Promise<{ data: Location[]; total: number }>;
    },
    staleTime: LOCATION_STALE_TIME,
    gcTime: LOCATION_GC_TIME,
    retry: 1,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    refetchOnWindowFocus: false,
  });

  return {
    experiences: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading: status === "pending",
    error: error instanceof Error ? error.message : null,
  };
}
