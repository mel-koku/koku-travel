"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Location } from "@/types/location";
import type { ItineraryActivity } from "@/types/itinerary";
import { logger } from "@/lib/logger";
import { LOCATION_STALE_TIME, LOCATION_GC_TIME } from "@/lib/constants/time";

/**
 * Query key factory for activity locations
 */
export const activityLocationsKeys = {
  all: ["activity-locations"] as const,
  byIds: (ids: string[]) => [...activityLocationsKeys.all, ids.sort().join(",")] as const,
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
async function fetchLocationsByIds(ids: string[]): Promise<Location[]> {
  if (ids.length === 0) {
    return [];
  }

  const response = await fetch(`/api/locations/batch?ids=${ids.join(",")}`);

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

  const data = (await response.json()) as BatchLocationsResponse;
  return data.data;
}

/**
 * Extracts location ID from an activity ID pattern.
 * Activity ID format: {locationId}-{dayIndex}-{timeSlot}-{activityIndex}
 * Example: nyk-hikawa-kanto-0aa6cf85-1-morning-1
 */
function extractBaseLocationId(activityId: string): string | null {
  // Match format: {locationId}-{dayIndex}-{timeSlot}-{activityIndex}
  const match = activityId.match(/^(.+)-\d+-(morning|afternoon|evening|night)-\d+$/);
  if (!match) {
    return null;
  }
  const [, baseId] = match;
  return baseId ?? null;
}

/**
 * Checks if a location ID is valid for fetching
 */
function isValidLocationId(locationId: string): boolean {
  // Skip entry point IDs (various formats)
  if (locationId.startsWith("__entry_point")) return false;
  if (locationId.startsWith("entry-point")) return false;
  // Skip fallback IDs
  if (locationId.startsWith("__fallback__")) return false;
  // Skip IDs that look like activity IDs (contain time slot pattern)
  if (/-\d+-(morning|afternoon|evening|night)-\d+$/.test(locationId)) return false;
  return true;
}

/**
 * Extracts unique location IDs from activities
 */
function extractLocationIds(
  activities: Extract<ItineraryActivity, { kind: "place" }>[],
): string[] {
  const ids = new Set<string>();

  for (const activity of activities) {
    // Skip entry points
    if (activity.locationId?.startsWith("__entry_point")) {
      continue;
    }

    // Add explicit locationId if valid
    if (activity.locationId && isValidLocationId(activity.locationId)) {
      ids.add(activity.locationId);
    }

    // Add extracted ID from activity ID pattern if valid
    const extractedId = extractBaseLocationId(activity.id);
    if (extractedId && isValidLocationId(extractedId)) {
      ids.add(extractedId);
    }
  }

  return Array.from(ids);
}

/**
 * React Query hook for fetching locations for a list of activities
 *
 * @param activities - Array of place activities to fetch locations for
 * @returns Query result with a Map of activity ID to Location
 */
export function useActivityLocations(
  activities: Extract<ItineraryActivity, { kind: "place" }>[],
) {
  // Extract unique location IDs
  const locationIds = useMemo(
    () => extractLocationIds(activities),
    [activities],
  );

  // Fetch locations
  const query = useQuery({
    queryKey: activityLocationsKeys.byIds(locationIds),
    queryFn: () => fetchLocationsByIds(locationIds),
    enabled: locationIds.length > 0,
    staleTime: LOCATION_STALE_TIME,
    gcTime: LOCATION_GC_TIME,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Build a map of activity ID to location
  const locationsMap = useMemo(() => {
    const map = new Map<string, Location | null>();
    const locationById = new Map(
      (query.data ?? []).map((loc) => [loc.id, loc]),
    );

    for (const activity of activities) {
      // Skip entry points
      if (activity.locationId?.startsWith("__entry_point_")) {
        map.set(activity.id, null);
        continue;
      }

      // Try explicit locationId first
      if (activity.locationId) {
        const loc = locationById.get(activity.locationId);
        if (loc) {
          map.set(activity.id, loc);
          continue;
        }
      }

      // Try extracted ID
      const extractedId = extractBaseLocationId(activity.id);
      if (extractedId) {
        const loc = locationById.get(extractedId);
        if (loc) {
          map.set(activity.id, loc);
          continue;
        }
      }

      // Not found
      map.set(activity.id, null);
    }

    return map;
  }, [activities, query.data]);

  return {
    ...query,
    locationsMap,
    getLocation: (activityId: string) => locationsMap.get(activityId) ?? null,
  };
}

/**
 * Simple hook to get a single location for an activity
 */
export function useActivityLocation(
  activity: Extract<ItineraryActivity, { kind: "place" }> | null,
) {
  const activities = useMemo(
    () => (activity ? [activity] : []),
    [activity],
  );

  const { locationsMap, isLoading, error } = useActivityLocations(activities);

  return {
    location: activity ? locationsMap.get(activity.id) ?? null : null,
    isLoading,
    error,
  };
}
