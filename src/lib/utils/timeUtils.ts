/**
 * Shared time parsing and formatting utilities.
 * Single source of truth for "HH:MM" ↔ minutes-since-midnight conversions.
 */

/** Parse "HH:MM" or "H:MM" to minutes since midnight. Returns null on invalid input. */
export function parseTimeToMinutes(timeStr: string | undefined | null): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

/** Format minutes since midnight to "HH:MM". */
export function formatMinutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Format "HH:MM" 24-hour to "h:MM AM/PM" display. */
export function formatTime12h(time: string | undefined | null): string | null {
  const mins = parseTimeToMinutes(time);
  if (mins === null) return null;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}
