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
