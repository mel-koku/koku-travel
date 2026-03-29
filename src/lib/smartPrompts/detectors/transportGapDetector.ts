/**
 * Transport gap detection - identifies long walks that could use transit.
 */

import type { ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { DetectedGap } from "./types";

/**
 * Detect transport gaps (long walks or missing connections).
 */
export function detectTransportGaps(day: ItineraryDay, dayIndex: number): DetectedGap[] {
  const gaps: DetectedGap[] = [];
  const activities = day.activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place"
  );

  for (let i = 0; i < activities.length - 1; i++) {
    const current = activities[i];
    const next = activities[i + 1];

    if (!current || !next) continue;

    // Check for long walking segments
    const travelSegment = current.travelToNext ?? next.travelFromPrevious;
    if (travelSegment && travelSegment.mode === "walk" && (travelSegment.durationMinutes ?? 0) > 20) {
      gaps.push({
        id: `transport-${current.id}-${next.id}`,
        type: "transport",
        dayIndex,
        dayId: day.id,
        title: "Consider transit",
        description: `${Math.round(travelSegment.durationMinutes ?? 0)} min walk between stops - take the train?`,
        icon: "Train",
        action: {
          type: "add_transport",
          fromActivityId: current.id,
          toActivityId: next.id,
        },
      });
    }
  }

  return gaps;
}
