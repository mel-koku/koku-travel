/**
 * Parse a "YYYY-MM-DD" date string into numeric parts.
 * Uses local-date constructor to avoid UTC midnight timezone bugs.
 *
 * @returns A Date object in the local timezone, or null if the input is invalid.
 */
export function parseLocalDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-").map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/**
 * Parse a "YYYY-MM-DD" date string and add a day offset.
 * Useful for computing the date of day N in a trip.
 */
export function parseLocalDateWithOffset(dateStr: string | undefined | null, dayOffset: number): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-").map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d + dayOffset);
}

/**
 * Format a Date as "YYYY-MM-DD" using local-timezone components.
 *
 * Use this instead of `.toISOString().split("T")[0]`, which converts to
 * UTC first and shifts the date by one for callers east of GMT — every
 * JST user gets yesterday's date for today's `new Date()`.
 */
export function formatLocalDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
