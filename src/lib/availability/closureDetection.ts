import type { Location, Weekday } from "@/types/location";

export type ClosureReason = "weekly-closure" | "date-specific";
export type StopClosure = { stopId: string; reason: ClosureReason };

const WEEKDAYS_BY_JS_DAY: readonly Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * Returns one StopClosure per stop confidently closed on the given date.
 *
 * Rule (non-negotiable, from spec):
 *   - If `operatingHours` is undefined → silent (no entry). Hours unknown.
 *   - If `operatingHours.periods` is empty → silent. Hours unknown.
 *   - Otherwise, a stop is closed on the date when the periods array does NOT
 *     contain an entry for the weekday of the date.
 *
 * The absence of a period for a weekday is how "closed on that day" is expressed
 * in this codebase's normalized hours shape (periods[] with {day, open, close}).
 */
export function getClosuresForTripDate(
  stops: Array<Pick<Location, "id" | "operatingHours">>,
  date: Date,
): StopClosure[] {
  const weekday = WEEKDAYS_BY_JS_DAY[date.getDay()];
  const closures: StopClosure[] = [];
  for (const stop of stops) {
    const hours = stop.operatingHours;
    if (!hours) continue; // unknown → silent
    if (!Array.isArray(hours.periods) || hours.periods.length === 0) continue; // unknown → silent
    const hasWeekday = hours.periods.some((p) => p.day === weekday);
    if (!hasWeekday) {
      closures.push({ stopId: stop.id, reason: "weekly-closure" });
    }
  }
  return closures;
}
