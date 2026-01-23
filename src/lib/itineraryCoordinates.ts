import type { ItineraryActivity } from "@/types/itinerary";
import { getCoordinatesForLocationId, getCoordinatesForName } from "@/data/locationCoordinates";

/**
 * Extracts coordinates from an itinerary activity.
 * Returns null if the activity doesn't have coordinates or isn't a place activity.
 */
export function getActivityCoordinates(
  activity: ItineraryActivity,
): { lat: number; lng: number } | null {
  if (activity.kind !== "place") {
    return null;
  }

  // First check if activity has embedded coordinates (entry points, external places)
  if (activity.coordinates) {
    return activity.coordinates;
  }

  // Try to get coordinates from locationId
  if (activity.locationId) {
    const coords = getCoordinatesForLocationId(activity.locationId);
    if (coords) {
      return coords;
    }
  }

  // Fallback to name-based lookup
  if (activity.title) {
    const coords = getCoordinatesForName(activity.title);
    if (coords) {
      return coords;
    }
  }

  return null;
}

