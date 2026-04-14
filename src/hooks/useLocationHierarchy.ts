"use client";

import { useQuery } from "@tanstack/react-query";
import type { Location, SubExperience, LocationRelationship } from "@/types/location";
import { fetchWithTimeout } from "@/lib/utils/fetchWithTimeout";

export type HierarchyContext = {
  children: Location[];
  subExperiences: SubExperience[];
  relationships: (LocationRelationship & { relatedLocation?: Location })[];
};

export const locationHierarchyKeys = {
  all: ["locationHierarchy"] as const,
  detail: (id: string) => [...locationHierarchyKeys.all, id] as const,
};

/**
 * Fetches hierarchy context for a location: children, sub-experiences, and relationships.
 * Only fetches when the location has parentMode set (is a parent) or might have sub-experiences.
 */
export function useLocationHierarchy(locationId: string | undefined) {
  return useQuery<HierarchyContext>({
    queryKey: locationHierarchyKeys.detail(locationId ?? ""),
    queryFn: async ({ signal }) => {
      const res = await fetchWithTimeout(`/api/locations/${locationId}/hierarchy`, { signal });
      if (!res.ok) {
        throw new Error(`Failed to fetch hierarchy: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!locationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
