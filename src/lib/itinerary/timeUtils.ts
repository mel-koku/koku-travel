import { parseTimeToMinutes } from "@/lib/utils/timeUtils";

// Re-export so existing imports from this module continue to work
export { parseTimeToMinutes };

/**
 * Check if a given day index is "today" relative to the trip start date.
 * Uses local-date constructor to avoid UTC midnight timezone bugs.
 */
export function isToday(tripStartDate: string | undefined, dayIndex: number): boolean {
  if (!tripStartDate) return false;
  const [sy = 0, sm = 1, sd = 1] = tripStartDate.split("-").map(Number);
  if (!sy || !sm || !sd) return false;

  const dayDate = new Date(sy, sm - 1, sd + dayIndex);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return dayDate.getTime() === today.getTime();
}

/**
 * Format minutes until an event as a human-readable relative time string.
 */
export function formatRelativeTime(minutesUntil: number): string {
  if (minutesUntil < 0) {
    const abs = Math.abs(minutesUntil);
    if (abs < 60) return `${abs} min ago`;
    const hours = Math.floor(abs / 60);
    return `${hours}h ago`;
  }
  if (minutesUntil === 0) return "now";
  if (minutesUntil < 60) return `in ${minutesUntil} min`;
  const hours = Math.floor(minutesUntil / 60);
  const mins = minutesUntil % 60;
  if (mins === 0) return `in ${hours}h`;
  return `in ${hours}h ${mins}m`;
}

/**
 * Get current minutes since midnight in local time.
 */
export function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
