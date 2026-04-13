import type {
  LocationOperatingHours,
  LocationOperatingPeriod,
  Weekday,
} from "@/types/location";

const WEEKDAY_BY_INDEX: readonly Weekday[] = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
] as const;

/**
 * Normalize a raw operating_hours value coming from the DB.
 *
 * Google Places v1 enrichment stores periods as
 *   { open: { day, hour, minute }, close: { day, hour, minute } }
 * while our older textual shape is
 *   { day: "monday", open: "09:00", close: "17:00", isOvernight }
 *
 * Every downstream consumer (getOpenStatus, getOperatingPeriodForDay,
 * isCurrentlyOpen in the nearby route) only understands the textual
 * shape. Normalize at every DB boundary so a v1-shape row does not
 * silently register as "closed".
 */
export function normalizeOperatingHours(raw: unknown): LocationOperatingHours | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as { timezone?: string; periods?: unknown; notes?: string };
  if (!Array.isArray(obj.periods)) return undefined;

  const periods: LocationOperatingPeriod[] = [];
  for (const entry of obj.periods) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;

    // Textual shape — pass through.
    if (typeof e.day === "string" && typeof e.open === "string" && typeof e.close === "string") {
      periods.push(e as unknown as LocationOperatingPeriod);
      continue;
    }

    // Google v1 shape — convert.
    const open = e.open as { day?: number; hour?: number; minute?: number } | undefined;
    const close = e.close as { day?: number; hour?: number; minute?: number } | undefined;
    if (!open || !close || typeof open.day !== "number" || typeof open.hour !== "number") continue;
    const weekday = WEEKDAY_BY_INDEX[open.day];
    if (!weekday) continue;
    const pad = (n: number) => String(n).padStart(2, "0");
    periods.push({
      day: weekday,
      open: `${pad(open.hour)}:${pad(open.minute ?? 0)}`,
      close: `${pad(close.hour ?? 23)}:${pad(close.minute ?? 59)}`,
      isOvernight: typeof close.day === "number" && close.day !== open.day,
    });
  }

  if (periods.length === 0) return undefined;
  return { timezone: obj.timezone ?? "Asia/Tokyo", periods, notes: obj.notes };
}
