/**
 * Cluster-aware scoring bonus and transit-line sequencing for itinerary generation.
 *
 * - Cluster bonus: +5 to a candidate's score when it shares a `cluster` relationship
 *   with any location already scheduled on the same day. Reduces cross-city zigzag.
 *
 * - Transit-line sequencing: After a day's activities are picked, reorders them so
 *   locations sharing the same `transit_line` relationship are adjacent. Reduces
 *   unnecessary train transfers. Preserves time-of-day boundaries (morning activities
 *   stay in morning, etc.).
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { ItineraryActivity } from "@/types/itinerary";

/** Cluster bonus score value */
const CLUSTER_BONUS = 5;

/**
 * Pre-fetches cluster and transit-line relationships for a set of location IDs.
 * Returns a lookup structure for both scoring and sequencing.
 *
 * Called once per city-day group in the itinerary generator.
 */
export async function fetchRelationshipLookup(
  locationIds: string[],
): Promise<{
  clusterPairs: Set<string>;
  transitLineMap: Map<string, string[]>;
}> {
  if (locationIds.length === 0) {
    return { clusterPairs: new Set(), transitLineMap: new Map() };
  }

  try {
    const supabase = await createClient();

    // Fetch relationships where BOTH sides are in our candidate pool
    // This avoids fetching the full 22K relationship table
    const { data, error } = await supabase
      .from("location_relationships")
      .select("location_id, related_id, relationship_type, transit_line")
      .in("relationship_type", ["cluster", "transit_line"])
      .in("location_id", locationIds);

    if (error) {
      logger.error("Failed to fetch relationship lookup", error);
      return { clusterPairs: new Set(), transitLineMap: new Map() };
    }

    const idSet = new Set(locationIds);

    // Build cluster pair lookup (bidirectional: "a::b" and "b::a")
    const clusterPairs = new Set<string>();
    const transitLineMap = new Map<string, string[]>();

    for (const row of data || []) {
      // Only include pairs where both locations are in our pool
      if (!idSet.has(row.related_id)) continue;

      if (row.relationship_type === "cluster") {
        clusterPairs.add(`${row.location_id}::${row.related_id}`);
        clusterPairs.add(`${row.related_id}::${row.location_id}`);
      }

      if (row.relationship_type === "transit_line" && row.transit_line) {
        if (!transitLineMap.has(row.transit_line)) {
          transitLineMap.set(row.transit_line, []);
        }
        const arr = transitLineMap.get(row.transit_line)!;
        if (!arr.includes(row.location_id)) arr.push(row.location_id);
        if (!arr.includes(row.related_id)) arr.push(row.related_id);
      }
    }

    return { clusterPairs, transitLineMap };
  } catch (err) {
    logger.error("Relationship lookup failed", err instanceof Error ? err : new Error(String(err)));
    return { clusterPairs: new Set(), transitLineMap: new Map() };
  }
}

/**
 * Calculates a cluster bonus for a candidate location.
 * Returns CLUSTER_BONUS (+5) if the candidate shares a cluster relationship
 * with any location already scheduled on the same day.
 */
export function getClusterBonus(
  candidateId: string,
  scheduledIds: string[],
  clusterPairs: Set<string>,
): number {
  if (clusterPairs.size === 0 || scheduledIds.length === 0) return 0;

  for (const scheduledId of scheduledIds) {
    if (clusterPairs.has(`${candidateId}::${scheduledId}`)) {
      return CLUSTER_BONUS;
    }
  }
  return 0;
}

/**
 * Reorders activities within a day to group locations sharing the same transit line.
 * Preserves time-of-day boundaries: morning activities stay in morning, etc.
 *
 * Strategy: Within each time-slot group, if two or more activities share a transit line,
 * move them adjacent. Activities without transit-line connections stay in their original
 * relative order.
 */
export function reorderByTransitLine(
  activities: ItineraryActivity[],
  transitLineMap: Map<string, string[]>,
): ItineraryActivity[] {
  if (transitLineMap.size === 0 || activities.length <= 2) return activities;

  // Group activities by time slot
  const slots = new Map<string, ItineraryActivity[]>();
  const slotOrder: string[] = [];

  for (const activity of activities) {
    const slot = activity.timeOfDay ?? "unslotted";
    if (!slots.has(slot)) {
      slots.set(slot, []);
      slotOrder.push(slot);
    }
    slots.get(slot)!.push(activity);
  }

  // For each slot, reorder to group transit-line neighbors
  const result: ItineraryActivity[] = [];

  for (const slot of slotOrder) {
    const slotActivities = slots.get(slot)!;

    if (slotActivities.length <= 2) {
      result.push(...slotActivities);
      continue;
    }

    // Build location-to-transit-line map for this slot's activities
    const activityLineMap = new Map<string, string>();
    for (const activity of slotActivities) {
      if (activity.kind !== "place" || !activity.locationId) continue;
      for (const [line, locIds] of transitLineMap) {
        if (locIds.includes(activity.locationId)) {
          activityLineMap.set(activity.locationId, line);
          break;
        }
      }
    }

    // Group by transit line, preserving original order within groups
    const lineGroups = new Map<string, ItineraryActivity[]>();
    const ungrouped: ItineraryActivity[] = [];

    for (const activity of slotActivities) {
      if (activity.kind !== "place" || !activity.locationId) {
        ungrouped.push(activity);
        continue;
      }
      const line = activityLineMap.get(activity.locationId);
      if (line) {
        if (!lineGroups.has(line)) lineGroups.set(line, []);
        lineGroups.get(line)!.push(activity);
      } else {
        ungrouped.push(activity);
      }
    }

    // Only reorder if at least one group has 2+ activities on the same line
    const hasMultiActivityGroup = [...lineGroups.values()].some((g) => g.length >= 2);
    if (!hasMultiActivityGroup) {
      result.push(...slotActivities);
      continue;
    }

    // Emit groups first (they benefit from adjacency), then ungrouped
    for (const group of lineGroups.values()) {
      result.push(...group);
    }
    result.push(...ungrouped);
  }

  return result;
}
