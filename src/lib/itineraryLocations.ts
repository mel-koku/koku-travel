import type { ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import {
  fetchLocationById,
  fetchLocationByName,
  fetchLocationsByIds,
  fetchLocationsByNames,
} from "@/lib/locations/locationService";

const ACTIVITY_ID_PATTERN = /^(.*)-\d+-\d+$/;

export function extractBaseLocationId(activityId: string): string | null {
  const match = activityId.match(ACTIVITY_ID_PATTERN);
  if (!match) {
    return null;
  }
  const [, baseId] = match;
  return baseId ?? null;
}

/**
 * Extracts Google Place ID from entry point locationId format: __entry_point_{type}__{placeId}__
 */
function extractPlaceIdFromEntryPoint(locationId: string): string | null {
  const match = locationId.match(/^__entry_point_(?:start|end)__(.+?)__$/);
  return typeof match?.[1] === "string" ? match[1] : null;
}

/**
 * Finds a location for a given activity by querying the database.
 * This is an async function that replaces the previous sync MOCK_LOCATIONS lookup.
 *
 * @param activity - The activity to find a location for
 * @returns The location or null if not found
 */
export async function findLocationForActivity(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
): Promise<Location | null> {
  if (activity.locationId) {
    // Check if it's an entry point with a placeId
    const placeId = extractPlaceIdFromEntryPoint(activity.locationId);
    if (placeId) {
      // Return null - caller should fetch details via API
      // This allows async fetching of place details
      return null;
    }

    // Try to fetch by explicit locationId
    const fromExplicit = await fetchLocationById(activity.locationId);
    if (fromExplicit) {
      return fromExplicit;
    }
  }

  // Try to extract location ID from activity ID pattern
  const extractedId = extractBaseLocationId(activity.id);
  if (extractedId) {
    const record = await fetchLocationById(extractedId);
    if (record) {
      return record;
    }
  }

  // Fall back to matching by name
  const matchByName = await fetchLocationByName(activity.title);
  if (matchByName) {
    return matchByName;
  }

  return null;
}

/**
 * Batch fetches locations for multiple activities.
 * More efficient than calling findLocationForActivity multiple times.
 *
 * @param activities - Array of activities to find locations for
 * @returns Map of activity ID to location (or null if not found)
 */
export async function findLocationsForActivities(
  activities: Extract<ItineraryActivity, { kind: "place" }>[],
): Promise<Map<string, Location | null>> {
  const result = new Map<string, Location | null>();

  if (activities.length === 0) {
    return result;
  }

  // Collect all possible IDs to fetch
  const idsToFetch = new Set<string>();
  const activityToIds = new Map<string, string[]>();

  for (const activity of activities) {
    const possibleIds: string[] = [];

    // Skip entry points
    if (activity.locationId) {
      const placeId = extractPlaceIdFromEntryPoint(activity.locationId);
      if (placeId) {
        result.set(activity.id, null);
        continue;
      }
      possibleIds.push(activity.locationId);
      idsToFetch.add(activity.locationId);
    }

    const extractedId = extractBaseLocationId(activity.id);
    if (extractedId) {
      possibleIds.push(extractedId);
      idsToFetch.add(extractedId);
    }

    activityToIds.set(activity.id, possibleIds);
  }

  // Batch fetch all locations by ID
  const locations = await fetchLocationsByIds(Array.from(idsToFetch));
  const locationMap = new Map(locations.map((loc) => [loc.id, loc]));

  // First pass: match by ID and collect names for batch fallback lookup
  const namesToFetch = new Set<string>();
  const activitiesNeedingNameLookup: Extract<ItineraryActivity, { kind: "place" }>[] = [];

  for (const activity of activities) {
    // Skip if already set (entry point)
    if (result.has(activity.id)) {
      continue;
    }

    const possibleIds = activityToIds.get(activity.id) ?? [];
    let found: Location | null = null;

    for (const id of possibleIds) {
      const loc = locationMap.get(id);
      if (loc) {
        found = loc;
        break;
      }
    }

    if (found) {
      result.set(activity.id, found);
    } else {
      // Collect name for batch lookup
      namesToFetch.add(activity.title);
      activitiesNeedingNameLookup.push(activity);
    }
  }

  // Batch fetch locations by name (single query instead of N queries)
  if (namesToFetch.size > 0) {
    const locationsByName = await fetchLocationsByNames(Array.from(namesToFetch));
    const nameMap = new Map(
      locationsByName.map((loc) => [loc.name.toLowerCase().trim(), loc]),
    );

    // Second pass: match remaining activities by name
    for (const activity of activitiesNeedingNameLookup) {
      const normalizedTitle = activity.title.toLowerCase().trim();
      const found = nameMap.get(normalizedTitle) ?? null;
      result.set(activity.id, found);
    }
  }

  return result;
}
