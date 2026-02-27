import type { ItineraryActivity } from "@/types/itinerary";
import type { EntryPoint } from "@/types/trip";
import { getActivityCoordinates } from "./itineraryCoordinates";
import { calculateDistanceMeters } from "@/lib/utils/geoUtils";

/**
 * Calculate total route distance including start→first and last→end legs.
 */
function totalRouteDistance(
  order: string[],
  activityCoords: Map<string, { lat: number; lng: number } | null>,
  startCoords: { lat: number; lng: number },
  endCoords?: { lat: number; lng: number },
): number {
  if (order.length === 0) return 0;

  let total = 0;
  let prev = startCoords;

  for (const id of order) {
    const coords = activityCoords.get(id);
    if (!coords) continue;
    total += calculateDistanceMeters(prev, coords);
    prev = coords;
  }

  if (endCoords) {
    total += calculateDistanceMeters(prev, endCoords);
  }

  return total;
}

/**
 * 2-opt local search: iteratively reverse sub-segments to uncross the path.
 * Handles both circular routes (start=end, same hotel) and open routes (start≠end).
 * Max 5 iterations, O(n²) per pass — negligible for typical 3-8 activities.
 */
function twoOptImprove(
  order: string[],
  activityCoords: Map<string, { lat: number; lng: number } | null>,
  startCoords: { lat: number; lng: number },
  endCoords?: { lat: number; lng: number },
): string[] {
  if (order.length <= 2) return order;

  let best = [...order];
  let bestDist = totalRouteDistance(best, activityCoords, startCoords, endCoords);

  for (let iteration = 0; iteration < 5; iteration++) {
    let improved = false;

    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [...best];
        // Reverse the segment between i and j
        const reversed = best.slice(i, j + 1).reverse();
        candidate.splice(i, j - i + 1, ...reversed);

        const candidateDist = totalRouteDistance(candidate, activityCoords, startCoords, endCoords);
        if (candidateDist < bestDist) {
          best = candidate;
          bestDist = candidateDist;
          improved = true;
        }
      }
    }

    if (!improved) break;
  }

  return best;
}

export type OptimizeRouteResult = {
  /** Activity IDs in optimized order */
  order: string[];
  /** Number of activities that were optimized (had coordinates) */
  optimizedCount: number;
  /** Number of activities skipped due to missing coordinates */
  skippedCount: number;
  /** Whether the order changed from the original */
  orderChanged: boolean;
};

/**
 * Optimize the route order of activities using nearest neighbor algorithm
 * with start and end point constraints.
 *
 * @param activities - Array of activities to optimize
 * @param startPoint - Optional start point (must be provided)
 * @param endPoint - Optional end point
 * @returns Optimization result with order and statistics
 */
export function optimizeRouteOrder(
  activities: ItineraryActivity[],
  startPoint?: EntryPoint,
  endPoint?: EntryPoint,
): OptimizeRouteResult {
  const originalOrder = activities.map((a) => a.id);
  if (!startPoint) {
    // If no start point, return original order
    return {
      order: originalOrder,
      optimizedCount: 0,
      skippedCount: 0,
      orderChanged: false,
    };
  }

  // Separate place activities from notes
  const placeActivities = activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place",
  );
  if (placeActivities.length === 0) {
    // No place activities to optimize, return original order
    return {
      order: originalOrder,
      optimizedCount: 0,
      skippedCount: 0,
      orderChanged: false,
    };
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
    return {
      order: originalOrder,
      optimizedCount: 0,
      skippedCount: placeActivities.length,
      orderChanged: false,
    };
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

      const distance = calculateDistanceMeters(currentCoords, coords);
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

  // Apply 2-opt local search to uncross paths and handle circular routes (start=end)
  if (optimized.length > 2) {
    const improved = twoOptImprove(optimized, activityCoords, startCoords, endCoords);
    optimized.length = 0;
    optimized.push(...improved);
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

  // Check if order actually changed
  const orderChanged = !originalOrder.every((id, i) => finalOrder[i] === id);
  const skippedCount = placeActivities.filter((a) => activityCoords.get(a.id) === null).length;

  return {
    order: finalOrder,
    optimizedCount: activitiesWithCoords.length,
    skippedCount,
    orderChanged,
  };
}

