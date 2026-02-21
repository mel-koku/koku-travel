import type { LocationOperatingHours } from "@/types/location";

export type OpenStatus =
  | { state: "open"; closesAt: string }
  | { state: "closed"; opensAt?: string }
  | { state: "unknown" };

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/**
 * Client-safe utility to check if a location is currently open.
 * Uses pre-enriched operating hours from the database — no API call.
 */
export function getOpenStatus(
  operatingHours: LocationOperatingHours | undefined | null,
): OpenStatus {
  if (
    !operatingHours ||
    !operatingHours.periods ||
    operatingHours.periods.length === 0
  ) {
    return { state: "unknown" };
  }

  const now = new Date();
  const currentDay = WEEKDAYS[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Find period for current day
  const todayPeriod = operatingHours.periods.find((p) => p.day === currentDay);

  if (!todayPeriod) {
    // Check if an overnight period from yesterday covers now
    const yesterdayIdx = (now.getDay() + 6) % 7;
    const yesterdayPeriod = operatingHours.periods.find(
      (p) => p.day === WEEKDAYS[yesterdayIdx] && p.isOvernight,
    );
    if (yesterdayPeriod) {
      const closeMinutes = parseTime(yesterdayPeriod.close);
      if (closeMinutes !== null && currentMinutes <= closeMinutes) {
        return { state: "open", closesAt: yesterdayPeriod.close };
      }
    }

    // Find next opening
    const nextOpen = findNextOpening(operatingHours, now);
    return { state: "closed", opensAt: nextOpen };
  }

  const openMinutes = parseTime(todayPeriod.open);
  const closeMinutes = parseTime(todayPeriod.close);

  if (openMinutes === null || closeMinutes === null) {
    return { state: "unknown" };
  }

  const effectiveClose = todayPeriod.isOvernight
    ? closeMinutes + 24 * 60
    : closeMinutes;

  if (currentMinutes >= openMinutes && currentMinutes < effectiveClose) {
    return { state: "open", closesAt: todayPeriod.close };
  }

  if (currentMinutes < openMinutes) {
    return { state: "closed", opensAt: todayPeriod.open };
  }

  // Past closing — find next opening
  const nextOpen = findNextOpening(operatingHours, now);
  return { state: "closed", opensAt: nextOpen };
}

/**
 * Format open status into a short display label.
 * Returns null if status is unknown.
 */
export function formatOpenStatus(status: OpenStatus): string | null {
  if (status.state === "unknown") return null;
  if (status.state === "open") return `Open until ${status.closesAt}`;
  if (status.opensAt) return `Opens ${status.opensAt}`;
  return "Closed today";
}

// Re-export shared time parser under local alias for readability
import { parseTimeToMinutes as parseTime } from "@/lib/utils/timeUtils";

function findNextOpening(
  hours: LocationOperatingHours,
  now: Date,
): string | undefined {
  // Look ahead up to 7 days
  for (let offset = 1; offset <= 7; offset++) {
    const dayIdx = (now.getDay() + offset) % 7;
    const period = hours.periods.find((p) => p.day === WEEKDAYS[dayIdx]);
    if (period) return period.open;
  }
  return undefined;
}
