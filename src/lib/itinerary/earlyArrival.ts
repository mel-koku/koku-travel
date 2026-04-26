import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";

/**
 * Strips non-anchor activities from a pre-dawn arrival day and injects a
 * settle-in note at the start of Day 1.
 *
 * Trigger condition: effective arrival before 08:00 (see
 * `EARLY_ARRIVAL_THRESHOLD` in `airportBuffer.ts`). The traveler lands before
 * shrines, museums, and most shops open, so any activities scheduled in that
 * dead window would be useless.
 *
 * Mutates the day in place. Returns early if the day is already flagged as a
 * late arrival, so the two strip flows never compound.
 */
export function applyEarlyArrivalStrip(day: ItineraryDay): void {
  // Belt-and-suspenders gate: late and early can never co-fire.
  if (day.isLateArrival) return;

  day.activities = day.activities.filter(
    (a) => a.kind === "place" && a.isAnchor,
  );
  day.isEarlyArrival = true;

  // Inject a settle-in note at the start of Day 1 so the day isn't empty
  // and the traveler sees explicit guidance.
  const settleNote: ItineraryActivity = {
    kind: "note",
    id: `settle-in-early-${Date.now()}`,
    title: "Note",
    timeOfDay: "morning",
    notes:
      "Your flight lands before sunrise. Head straight to your hotel, sleep, and start the day at the first reasonable hour. Most shrines, museums, and shops open from 09:00.",
  };

  // Insert immediately after the arrival anchor (first activity), or at the
  // very front if no anchor exists. This keeps the airport pin first and the
  // settle-in note second.
  const firstIsAnchor =
    day.activities.length > 0 &&
    day.activities[0]!.kind === "place" &&
    day.activities[0]!.isAnchor === true;
  if (firstIsAnchor) {
    day.activities.splice(1, 0, settleNote);
  } else {
    day.activities.unshift(settleNote);
  }
}
