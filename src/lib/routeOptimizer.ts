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

const ARRIVAL_ANCHOR_PREFIX = "anchor-arrival";
const DEPARTURE_ANCHOR_PREFIX = "anchor-departure";

/**
 * Activities whose array position must NOT be moved by the optimizer.
 * - Anchors (arrival/departure airport): represent fixed flight events. Their
 *   day position is determined by flight time, not geography. Arrival belongs
 *   at the start of the day; departure at the end.
 * - Meal-tagged activities (mealType set): the meal-slot handler placed them
 *   at the chronologically-correct position (breakfast → start, lunch → after
 *   last morning stop, dinner → end). Geographic optimization must not undo
 *   that — a 09:00 breakfast can't render after a 15:40 sightseeing stop.
 */
function isPinnedActivity(activity: ItineraryActivity): boolean {
  if (activity.kind !== "place") return false;
  if (activity.isAnchor === true) return true;
  if (activity.mealType != null) return true;
  return false;
}

/**
 * Move arrival anchor to position 0 and departure anchor to the last position
 * (relative to other place activities). This runs before optimization so the
 * subsequent reassembly sees anchors at their canonical ends. Notes between
 * places are preserved relative to the place activities they sit between.
 */
function pinAnchorsToEnds(activities: ItineraryActivity[]): ItineraryActivity[] {
  const arrivalIdx = activities.findIndex(
    (a) =>
      a.kind === "place" &&
      a.isAnchor === true &&
      a.id.startsWith(ARRIVAL_ANCHOR_PREFIX),
  );
  const departureIdx = activities.findIndex(
    (a) =>
      a.kind === "place" &&
      a.isAnchor === true &&
      a.id.startsWith(DEPARTURE_ANCHOR_PREFIX),
  );
  if (arrivalIdx === -1 && departureIdx === -1) return activities;

  const arrival = arrivalIdx !== -1 ? activities[arrivalIdx] : null;
  const departure = departureIdx !== -1 ? activities[departureIdx] : null;
  const others = activities.filter(
    (_, i) => i !== arrivalIdx && i !== departureIdx,
  );

  const result: ItineraryActivity[] = [];
  if (arrival) result.push(arrival);
  result.push(...others);
  if (departure) result.push(departure);
  return result;
}

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
  inputActivities: ItineraryActivity[],
  startPoint?: EntryPoint,
  endPoint?: EntryPoint,
): OptimizeRouteResult {
  const originalOrder = inputActivities.map((a) => a.id);
  if (!startPoint) {
    // If no start point, return original order
    return {
      order: originalOrder,
      optimizedCount: 0,
      skippedCount: 0,
      orderChanged: false,
    };
  }

  // Pre-pass: pull arrival anchor to position 0 and departure anchor to the
  // last position. The reassembly below will respect those positions since
  // anchors are also classified as pinned.
  const activities = pinAnchorsToEnds(inputActivities);

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

  // Only optimize activities that aren't pinned. Pinned activities (anchors,
  // meal-tagged) keep their input position; nearest-neighbor decides the
  // order of the remaining stops between them.
  const movableWithCoords = activitiesWithCoords.filter(
    (a) => !isPinnedActivity(a),
  );

  // Build optimized order using nearest neighbor algorithm
  const optimized: string[] = [];
  const remaining = new Set(movableWithCoords.map((a) => a.id));
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

  // Separate movable activities without coordinates (still need to land
  // somewhere in the final order, but the nearest-neighbor pass skipped them).
  const movableWithoutCoords = placeActivities.filter(
    (a) => !isPinnedActivity(a) && activityCoords.get(a.id) === null,
  );
  const withoutCoordsIds = movableWithoutCoords
    .map((a) => a.id)
    .sort((a, b) => {
      const posA = originalPositions.get(a) ?? Infinity;
      const posB = originalPositions.get(b) ?? Infinity;
      return posA - posB;
    });

  // The movable IDs in their final optimized order.
  const movableOrder = [...optimized, ...withoutCoordsIds];
  const movableSet = new Set(movableOrder);

  // Build final order by walking the (anchor-pinned) input array. At each
  // position: pinned activities + notes keep their id; movable place
  // activities pull from `movableOrder` in sequence.
  const finalOrder: string[] = [];
  const movableIterator = movableOrder[Symbol.iterator]();
  let nextMovable = movableIterator.next();

  for (const activity of activities) {
    if (movableSet.has(activity.id)) {
      if (!nextMovable.done && nextMovable.value) {
        finalOrder.push(nextMovable.value);
        nextMovable = movableIterator.next();
      }
    } else {
      // Pinned place activities (anchors, mealType) and notes stay put.
      finalOrder.push(activity.id);
    }
  }

  // Drain any leftover movables (shouldn't happen, safety net).
  while (!nextMovable.done && nextMovable.value) {
    finalOrder.push(nextMovable.value);
    nextMovable = movableIterator.next();
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

