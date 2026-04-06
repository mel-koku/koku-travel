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

