import { MOCK_LOCATIONS } from "@/data/mockLocations";
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

export function findLocationForActivity(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
): Location | null {
  if (activity.locationId) {
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


