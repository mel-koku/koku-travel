import { MOCK_LOCATIONS } from "@/data/mocks/mockLocations";
import type { ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";

const LOCATION_INDEX = new Map<string, Location>(
  MOCK_LOCATIONS.map((location) => [location.id, location]),
);

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

export function findLocationForActivity(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
): Location | null {
  if (activity.locationId) {
    // Check if it's an entry point with a placeId
    const placeId = extractPlaceIdFromEntryPoint(activity.locationId);
    if (placeId) {
      // Return null - caller should fetch details via API
      // This allows async fetching of place details
      return null;
    }

    const fromExplicit = LOCATION_INDEX.get(activity.locationId);
    if (fromExplicit) {
      return fromExplicit;
    }
  }

  const extractedId = extractBaseLocationId(activity.id);
  if (extractedId) {
    const record = LOCATION_INDEX.get(extractedId);
    if (record) {
      return record;
    }
  }

  const matchByName = MOCK_LOCATIONS.find(
    (location) => location.name.toLowerCase() === activity.title.toLowerCase(),
  );
  if (matchByName) {
    return matchByName;
  }

  return null;
}


