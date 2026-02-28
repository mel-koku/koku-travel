import type { ItineraryDay } from "@/types/itinerary";

/**
 * Compute a pace label for a day based on activity count, total scheduled
 * duration, and travel time.
 *
 * Thresholds:
 *  - light:    ≤3 activities OR ≤5 h total scheduled
 *  - packed:   ≥6 activities OR ≥9 h total scheduled
 *  - moderate: everything else
 */
export function computeDayPace(
  day: ItineraryDay,
): "light" | "moderate" | "packed" {
  const placeActivities = day.activities.filter((a) => a.kind === "place");
  const count = placeActivities.length;

  const totalMinutes = placeActivities.reduce(
    (sum, a) => sum + (a.durationMin ?? 60),
    0,
  );

  const travelMinutes = placeActivities.reduce(
    (sum, a) => sum + (a.travelFromPrevious?.durationMinutes ?? 0),
    0,
  );

  const totalScheduled = totalMinutes + travelMinutes;

  if (count <= 3 || totalScheduled <= 300) return "light";
  if (count >= 6 || totalScheduled >= 540) return "packed";
  return "moderate";
}
