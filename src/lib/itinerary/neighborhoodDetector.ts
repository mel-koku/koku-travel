import type { ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import { calculateDistance } from "@/lib/utils/geoUtils";

export type NeighborhoodCluster = {
  /** Neighborhood name (or "Walkable Area" for proximity-based clusters) */
  name: string;
  /** Indices of place activities in the day's activity list */
  activityIndices: number[];
  /** Activity titles for display */
  activityNames: string[];
  /** City where this cluster is located */
  cityId?: string;
};

/**
 * Detect walkable clusters of 3+ consecutive place activities in the same neighborhood.
 *
 * Strategy 1: Named neighborhood match (consecutive activities with same `neighborhood` field)
 * Strategy 2: Geographic proximity fallback (~1km radius when `neighborhood` is missing)
 */
export function detectNeighborhoodClusters(day: ItineraryDay): NeighborhoodCluster[] {
  const placeActivities = day.activities
    .map((a, i) => ({ activity: a, index: i }))
    .filter(
      (item): item is {
        activity: Extract<ItineraryActivity, { kind: "place" }>;
        index: number;
      } => item.activity.kind === "place",
    );

  if (placeActivities.length < 3) return [];

  const clusters: NeighborhoodCluster[] = [];

  // Strategy 1: Named neighborhood match
  let currentNeighborhood: string | null = null;
  let currentRun: typeof placeActivities = [];

  for (const item of placeActivities) {
    const neighborhood = item.activity.neighborhood;
    if (neighborhood && neighborhood === currentNeighborhood) {
      currentRun.push(item);
    } else {
      if (currentRun.length >= 3 && currentNeighborhood) {
        clusters.push({
          name: currentNeighborhood,
          activityIndices: currentRun.map((r) => r.index),
          activityNames: currentRun.map((r) => r.activity.title),
          cityId: day.cityId,
        });
      }
      currentNeighborhood = neighborhood ?? null;
      currentRun = neighborhood ? [item] : [];
    }
  }
  // Flush last run
  if (currentRun.length >= 3 && currentNeighborhood) {
    clusters.push({
      name: currentNeighborhood,
      activityIndices: currentRun.map((r) => r.index),
      activityNames: currentRun.map((r) => r.activity.title),
      cityId: day.cityId,
    });
  }

  // Strategy 2: Geographic proximity fallback for activities without neighborhoods
  // Only if Strategy 1 found nothing
  if (clusters.length === 0) {
    const PROXIMITY_KM = 1;
    let proximityRun: typeof placeActivities = [];

    for (const item of placeActivities) {
      const coords = item.activity.coordinates;
      if (!coords) {
        // Flush run
        if (proximityRun.length >= 3) {
          clusters.push({
            name: "Walkable Area",
            activityIndices: proximityRun.map((r) => r.index),
            activityNames: proximityRun.map((r) => r.activity.title),
            cityId: day.cityId,
          });
        }
        proximityRun = [];
        continue;
      }

      if (proximityRun.length === 0) {
        proximityRun.push(item);
        continue;
      }

      // Check distance to the previous activity in the run
      const prevItem = proximityRun[proximityRun.length - 1]!;
      const prevCoords = prevItem.activity.coordinates;
      if (prevCoords) {
        const dist = calculateDistance(prevCoords, coords);
        if (dist <= PROXIMITY_KM) {
          proximityRun.push(item);
          continue;
        }
      }

      // Distance exceeded — flush and start new run
      if (proximityRun.length >= 3) {
        clusters.push({
          name: "Walkable Area",
          activityIndices: proximityRun.map((r) => r.index),
          activityNames: proximityRun.map((r) => r.activity.title),
          cityId: day.cityId,
        });
      }
      proximityRun = [item];
    }

    // Flush last proximity run
    if (proximityRun.length >= 3) {
      clusters.push({
        name: "Walkable Area",
        activityIndices: proximityRun.map((r) => r.index),
        activityNames: proximityRun.map((r) => r.activity.title),
        cityId: day.cityId,
      });
    }
  }

  return clusters;
}
