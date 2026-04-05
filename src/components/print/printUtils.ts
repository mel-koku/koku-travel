import { parseLocalDate } from "@/lib/utils/dateUtils";

const FULL_DATE = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const MONTH_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

/**
 * Format a YYYY-MM-DD date string as "April 5, 2026".
 * Uses parseLocalDate to avoid UTC midnight timezone bugs.
 */
export function formatLongDate(iso?: string): string | null {
  if (!iso) return null;
  const d = parseLocalDate(iso);
  return d ? FULL_DATE.format(d) : null;
}

/**
 * Format a date range with consistent month abbreviation on both sides.
 *   Same year:  "Apr 6 – Apr 18, 2026"
 *   Cross year: "Dec 28, 2026 – Jan 3, 2027"
 */
export function formatDateRange(start?: string, end?: string): string | null {
  if (!start || !end) return formatLongDate(start ?? end);
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  if (!s || !e) return null;

  const sameYear = s.getFullYear() === e.getFullYear();
  if (sameYear) {
    return `${SHORT_DATE.format(s)} \u2013 ${SHORT_DATE.format(e)}, ${e.getFullYear()}`;
  }
  return `${SHORT_DATE.format(s)}, ${s.getFullYear()} \u2013 ${SHORT_DATE.format(e)}, ${e.getFullYear()}`;
}

/**
 * Format a month + year, e.g. "April 2026". Used on the colophon.
 */
export function formatMonthYear(iso?: string): string | null {
  if (!iso) return null;
  const d = parseLocalDate(iso);
  return d ? MONTH_YEAR.format(d) : null;
}

/**
 * Format a travel duration in minutes as "1h 45m" or "35m".
 */
export function formatDuration(minutes?: number): string | null {
  if (minutes == null || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format a HH:MM time string as "9:00 AM". Accepts "09:00" or "9:00".
 */
export function formatClock(hhmm?: string): string | null {
  if (!hhmm) return null;
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr ?? "", 10);
  const m = parseInt(mStr ?? "", 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const mm = m.toString().padStart(2, "0");
  return `${h12}:${mm} ${period}`;
}
