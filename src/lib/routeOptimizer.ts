import type { ItineraryActivity } from "@/types/itinerary";
import type { EntryPoint } from "@/types/trip";
import { getActivityCoordinates } from "./itineraryCoordinates";

/**
 * Calculate the straight-line distance between two coordinates in meters
 */
function haversineDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number },
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.lat * Math.PI) / 180;
  const φ2 = (coord2.lat * Math.PI) / 180;
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Optimize the route order of activities using nearest neighbor algorithm
 * with start and end point constraints.
 * 
 * @param activities - Array of activities to optimize
 * @param startPoint - Optional start point (must be provided)
 * @param endPoint - Optional end point
 * @returns Array of activity IDs in optimized order
 */
export function optimizeRouteOrder(
  activities: ItineraryActivity[],
  startPoint?: EntryPoint,
  endPoint?: EntryPoint,
): string[] {
  if (!startPoint) {
    // If no start point, return original order
    return activities.map((a) => a.id);
  }

  // Separate place activities from notes
  const placeActivities = activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place",
  );
  const noteActivities = activities.filter((a) => a.kind === "note");
  void noteActivities; // Intentionally unused - kept for future use

  if (placeActivities.length === 0) {
    // No place activities to optimize, return original order
    return activities.map((a) => a.id);
  }

  // Get coordinates for all place activities
  const activityCoords = new Map<string, { lat: number; lng: number } | null>();
  for (const activity of placeActivities) {
    const coords = getActivityCoordinates(activity);
    activityCoords.set(activity.id, coords);
  }

  // Filter out activities without coordinates
  const activitiesWithCoords = placeActivities.filter((a) => activityCoords.get(a.id) !== null);

  if (activitiesWithCoords.length === 0) {
    // No activities with coordinates, return original order
    return activities.map((a) => a.id);
  }

  const startCoords = startPoint.coordinates;
  const endCoords = endPoint?.coordinates;

  // Build optimized order using nearest neighbor algorithm
  const optimized: string[] = [];
  const remaining = new Set(activitiesWithCoords.map((a) => a.id));
  let currentCoords = startCoords;

  // Find the first activity (nearest to start point)
  while (remaining.size > 0) {
    let nearestId: string | null = null;
    let nearestDistance = Infinity;

    for (const activityId of remaining) {
      const coords = activityCoords.get(activityId);
      if (!coords) continue;

      const distance = haversineDistance(currentCoords, coords);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestId = activityId;
      }
    }

    if (nearestId) {
      optimized.push(nearestId);
      remaining.delete(nearestId);
      const coords = activityCoords.get(nearestId);
      if (coords) {
        currentCoords = coords;
      }
    } else {
      // Should not happen, but break to avoid infinite loop
      break;
    }
  }

  // If end point is specified and different from start, ensure the last activity
  // is the one nearest to the end point (if it's not already)
  if (endCoords && endCoords.lat !== startCoords.lat && endCoords.lng !== startCoords.lng) {
    if (optimized.length > 1) {
      // Find the activity nearest to the end point
      let nearestToEndId: string | null = null;
      let nearestToEndDistance = Infinity;

      for (const activityId of optimized) {
        const coords = activityCoords.get(activityId);
        if (!coords) continue;

        const distance = haversineDistance(endCoords, coords);
        if (distance < nearestToEndDistance) {
          nearestToEndDistance = distance;
          nearestToEndId = activityId;
        }
      }

      // If the nearest to end is not already last, move it to the end
      if (nearestToEndId && optimized[optimized.length - 1] !== nearestToEndId) {
        const index = optimized.indexOf(nearestToEndId);
        if (index !== -1) {
          optimized.splice(index, 1);
          optimized.push(nearestToEndId);
        }
      }
    }
  }

  // Build a map of original positions for preserving relative order
  const originalPositions = new Map<string, number>();
  activities.forEach((a, index) => {
    originalPositions.set(a.id, index);
  });

  // Separate activities with and without coordinates
  const activitiesWithoutCoords = placeActivities.filter((a) => activityCoords.get(a.id) === null);
  const withoutCoordsIds = activitiesWithoutCoords
    .map((a) => a.id)
    .sort((a, b) => {
      const posA = originalPositions.get(a) ?? Infinity;
      const posB = originalPositions.get(b) ?? Infinity;
      return posA - posB;
    });

  // Combine optimized place activities with activities without coordinates
  const allPlaceActivities = [...optimized, ...withoutCoordsIds];

  // Create a set for quick lookup
  const placeActivitySet = new Set(allPlaceActivities);

  // Build final order: replace place activities with optimized order, keep notes in place
  const finalOrder: string[] = [];
  const placeActivityIterator = allPlaceActivities[Symbol.iterator]();
  let nextPlaceActivity = placeActivityIterator.next();

  for (const activity of activities) {
    if (placeActivitySet.has(activity.id)) {
      // Replace place activity with next from optimized order
      if (!nextPlaceActivity.done && nextPlaceActivity.value) {
        finalOrder.push(nextPlaceActivity.value);
        nextPlaceActivity = placeActivityIterator.next();
      }
    } else {
      // Keep note activities in their original position
      finalOrder.push(activity.id);
    }
  }

  // Add any remaining place activities (shouldn't happen, but safety check)
  while (!nextPlaceActivity.done && nextPlaceActivity.value) {
    finalOrder.push(nextPlaceActivity.value);
    nextPlaceActivity = placeActivityIterator.next();
  }

  return finalOrder;
}

