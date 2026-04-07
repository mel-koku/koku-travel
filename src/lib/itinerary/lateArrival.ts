import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";

/**
 * Strips non-anchor activities from a late-arrival day and injects a settle-in
 * note when the day would otherwise be empty (e.g. 1-day trips).
 *
 * Mutates the day in place.
 */
export function applyLateArrivalStrip(day: ItineraryDay): void {
  day.activities = day.activities.filter(
    (a) => a.kind === "place" && a.isAnchor,
  );
  day.isLateArrival = true;

  // If no non-anchor activities remain, inject a settle-in note so the day
  // isn't completely empty (common for 1-day trips with late flights).
  const hasNonAnchor = day.activities.some(
    (a) => !(a.kind === "place" && a.isAnchor),
  );
  if (!hasNonAnchor) {
    const settleNote: ItineraryActivity = {
      kind: "note",
      id: `settle-in-${Date.now()}`,
      title: "Note",
      timeOfDay: "evening",
      notes: "Check in and settle at your accommodation. Rest up for tomorrow. Consider a late dinner at a nearby izakaya.",
    };
    const anchorCount = day.activities.length;
    // Insert before the last anchor (departure) if one exists, otherwise append
    if (anchorCount >= 2) {
      day.activities.splice(anchorCount - 1, 0, settleNote);
    } else {
      day.activities.push(settleNote);
    }
  }
}
