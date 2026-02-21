/**
 * Itinerary Conflict Detection System
 *
 * Analyzes itinerary schedules and detects potential conflicts:
 * - Closed during scheduled time
 * - Insufficient travel time between activities
 * - Overlapping activities
 * - Missing reservations for recommended spots
 */

import type { Itinerary, ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import { parseTimeToMinutes } from "@/lib/utils/timeUtils";

/**
 * Conflict types
 */
export type ConflictType =
  | "closed_during_visit"
  | "insufficient_travel_time"
  | "overlapping_activities"
  | "reservation_recommended";

/**
 * Conflict severity
 */
export type ConflictSeverity = "error" | "warning" | "info";

/**
 * A single scheduling conflict
 */
export type ItineraryConflict = {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  activityId: string;
  activityTitle: string;
  dayId: string;
  dayIndex: number;
  title: string;
  message: string;
  icon: string;
  /**
   * Additional context for the conflict
   */
  details?: {
    scheduledTime?: string;
    closesAt?: string;
    opensAt?: string;
    travelTime?: number;
    gapMinutes?: number;
    requiredGap?: number;
    overlapMinutes?: number;
    relatedActivityId?: string;
    relatedActivityTitle?: string;
  };
};

/**
 * Result of conflict detection for the entire itinerary
 */
export type ItineraryConflictsResult = {
  conflicts: ItineraryConflict[];
  byDay: Map<string, ItineraryConflict[]>;
  summary: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
  };
};

// parseTimeToMinutes imported from @/lib/utils/timeUtils

/**
 * Format minutes since midnight to HH:MM string
 */
function formatMinutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(totalMinutes, 23 * 60 + 59));
  const h = Math.floor(clamped / 60);
  const m = Math.round(clamped % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}


/**
 * Check if a time is outside operating hours
 */
function isOutsideOperatingHours(
  arrivalMinutes: number,
  departureMinutes: number,
  opensMinutes: number,
  closesMinutes: number
): { isOutside: boolean; reason?: "before_open" | "after_close" } {
  // Handle overnight closings (e.g., opens 18:00, closes 02:00)
  const isOvernight = closesMinutes < opensMinutes;

  if (isOvernight) {
    // For overnight venues, we're inside hours if we're either:
    // - After opening time OR before closing time the next day
    const isInsideEarlyMorning = arrivalMinutes < closesMinutes;
    const isInsideEvening = arrivalMinutes >= opensMinutes;
    if (!isInsideEarlyMorning && !isInsideEvening) {
      return { isOutside: true, reason: arrivalMinutes < opensMinutes ? "before_open" : "after_close" };
    }
    return { isOutside: false };
  }

  // Normal hours
  if (arrivalMinutes < opensMinutes) {
    return { isOutside: true, reason: "before_open" };
  }
  if (departureMinutes > closesMinutes) {
    return { isOutside: true, reason: "after_close" };
  }
  return { isOutside: false };
}

/**
 * Detect conflicts for a single activity based on operating hours
 */
function detectClosedConflict(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
  dayIndex: number,
  dayId: string
): ItineraryConflict | null {
  // Check if we have schedule and operating window
  const schedule = activity.schedule;
  const operatingWindow = schedule?.operatingWindow ?? activity.operatingWindow;

  if (!schedule?.arrivalTime || !operatingWindow) {
    return null;
  }

  const arrivalMinutes = parseTimeToMinutes(schedule.arrivalTime);
  const departureMinutes = parseTimeToMinutes(schedule.departureTime);
  const opensMinutes = parseTimeToMinutes(operatingWindow.opensAt);
  const closesMinutes = parseTimeToMinutes(operatingWindow.closesAt);

  if (
    arrivalMinutes === null ||
    departureMinutes === null ||
    opensMinutes === null ||
    closesMinutes === null
  ) {
    return null;
  }

  const { isOutside, reason } = isOutsideOperatingHours(
    arrivalMinutes,
    departureMinutes,
    opensMinutes,
    closesMinutes
  );

  if (!isOutside) {
    return null;
  }

  const message =
    reason === "before_open"
      ? `Scheduled arrival at ${schedule.arrivalTime}, but opens at ${operatingWindow.opensAt}`
      : `Closes at ${operatingWindow.closesAt}, but scheduled until ${schedule.departureTime}`;

  return {
    id: `closed-${activity.id}`,
    type: "closed_during_visit",
    severity: "error",
    activityId: activity.id,
    activityTitle: activity.title,
    dayId,
    dayIndex,
    title: "Outside Operating Hours",
    message,
    icon: "⚠️",
    details: {
      scheduledTime: schedule.arrivalTime,
      opensAt: operatingWindow.opensAt,
      closesAt: operatingWindow.closesAt,
    },
  };
}

/**
 * Detect insufficient travel time between activities
 */
function detectTravelTimeConflicts(
  activities: Extract<ItineraryActivity, { kind: "place" }>[],
  dayIndex: number,
  dayId: string
): ItineraryConflict[] {
  const conflicts: ItineraryConflict[] = [];

  for (let i = 1; i < activities.length; i++) {
    const current = activities[i];
    const previous = activities[i - 1];

    if (!current || !previous) continue;

    // Check if we have travel info and schedules
    const travelTime = current.travelFromPrevious?.durationMinutes;
    if (!travelTime || travelTime === 0) continue;

    const prevDeparture = parseTimeToMinutes(previous.schedule?.departureTime);
    const currArrival = parseTimeToMinutes(current.schedule?.arrivalTime);

    if (prevDeparture === null || currArrival === null) continue;

    // Calculate gap between activities
    const gapMinutes = currArrival - prevDeparture;

    // If gap is less than travel time, we have a conflict
    if (gapMinutes < travelTime) {
      let message: string;
      if (gapMinutes < 0) {
        const suggestedArrival = formatMinutesToTime(prevDeparture + travelTime + 5);
        message = `Schedule overlaps by ${Math.abs(gapMinutes)} min. Remove one activity or shift arrival to ${suggestedArrival}.`;
      } else {
        const suggestedDeparture = formatMinutesToTime(prevDeparture - (travelTime - gapMinutes + 5));
        message = `Only ${gapMinutes} min gap but travel takes ~${travelTime} min. Leave by ${suggestedDeparture} or switch to a faster mode.`;
      }

      conflicts.push({
        id: `travel-${current.id}`,
        type: "insufficient_travel_time",
        severity: gapMinutes < 0 ? "error" : "warning",
        activityId: current.id,
        activityTitle: current.title,
        dayId,
        dayIndex,
        title: "Travel Time Issue",
        message,
        icon: "🚃",
        details: {
          travelTime,
          gapMinutes,
          requiredGap: travelTime,
          relatedActivityId: previous.id,
          relatedActivityTitle: previous.title,
        },
      });
    }
  }

  return conflicts;
}

/**
 * Detect overlapping activities (end time of one > start time of next)
 */
function detectOverlappingActivities(
  activities: Extract<ItineraryActivity, { kind: "place" }>[],
  dayIndex: number,
  dayId: string
): ItineraryConflict[] {
  const conflicts: ItineraryConflict[] = [];

  for (let i = 1; i < activities.length; i++) {
    const current = activities[i];
    const previous = activities[i - 1];

    if (!current || !previous) continue;

    const prevDeparture = parseTimeToMinutes(previous.schedule?.departureTime);
    const currArrival = parseTimeToMinutes(current.schedule?.arrivalTime);

    if (prevDeparture === null || currArrival === null) continue;

    // If departure is after arrival, activities overlap
    if (prevDeparture > currArrival) {
      const overlapMinutes = prevDeparture - currArrival;
      conflicts.push({
        id: `overlap-${current.id}`,
        type: "overlapping_activities",
        severity: "error",
        activityId: current.id,
        activityTitle: current.title,
        dayId,
        dayIndex,
        title: "Schedule Overlap",
        message: `Overlaps with ${previous.title} by ${overlapMinutes} min`,
        icon: "⚠️",
        details: {
          overlapMinutes,
          relatedActivityId: previous.id,
          relatedActivityTitle: previous.title,
        },
      });
    }
  }

  return conflicts;
}

/**
 * Detect activities that may need reservations
 * Based on category, rating, and other factors
 */
function detectReservationNeeded(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
  dayIndex: number,
  dayId: string
): ItineraryConflict | null {
  // Check if this is a restaurant activity
  const isRestaurant = activity.tags?.some(
    (tag) => tag.toLowerCase().includes("restaurant") || tag.toLowerCase().includes("dining")
  );

  // High-end dining typically needs reservations
  const tags = activity.tags?.map((t) => t.toLowerCase()) ?? [];
  const isFineDining = tags.some(
    (t) => t.includes("fine_dining") || t.includes("kaiseki") || t.includes("omakase")
  );

  // Check for availability status
  if (
    activity.availabilityStatus === "requires_reservation" ||
    isFineDining
  ) {
    return {
      id: `reservation-${activity.id}`,
      type: "reservation_recommended",
      severity: "info",
      activityId: activity.id,
      activityTitle: activity.title,
      dayId,
      dayIndex,
      title: "Reservation Recommended",
      message: isFineDining
        ? "Fine dining venue - advance reservation strongly recommended"
        : "This venue typically requires reservations",
      icon: "📞",
    };
  }

  // Popular restaurants for dinner
  if (isRestaurant && activity.mealType === "dinner") {
    return {
      id: `reservation-${activity.id}`,
      type: "reservation_recommended",
      severity: "info",
      activityId: activity.id,
      activityTitle: activity.title,
      dayId,
      dayIndex,
      title: "Consider Reserving",
      message: "Popular dinner spot - reservations may be helpful",
      icon: "📞",
    };
  }

  return null;
}

/**
 * Detect all conflicts for a single day
 */
function detectDayConflicts(
  day: ItineraryDay,
  dayIndex: number
): ItineraryConflict[] {
  const conflicts: ItineraryConflict[] = [];
  const dayId = day.id;

  // Filter to place activities only
  const placeActivities = day.activities.filter(
    (a): a is Extract<typeof a, { kind: "place" }> => a.kind === "place"
  );

  // Check each activity for closed/outside hours
  for (const activity of placeActivities) {
    const closedConflict = detectClosedConflict(activity, dayIndex, dayId);
    if (closedConflict) {
      conflicts.push(closedConflict);
    }

    const reservationConflict = detectReservationNeeded(activity, dayIndex, dayId);
    if (reservationConflict) {
      conflicts.push(reservationConflict);
    }
  }

  // Check travel time between activities
  const travelConflicts = detectTravelTimeConflicts(placeActivities, dayIndex, dayId);
  conflicts.push(...travelConflicts);

  // Check for overlapping activities
  const overlapConflicts = detectOverlappingActivities(placeActivities, dayIndex, dayId);
  conflicts.push(...overlapConflicts);

  return conflicts;
}

/**
 * Detect all conflicts in an itinerary
 */
export function detectItineraryConflicts(itinerary: Itinerary): ItineraryConflictsResult {
  const conflicts: ItineraryConflict[] = [];
  const byDay = new Map<string, ItineraryConflict[]>();

  for (let dayIndex = 0; dayIndex < itinerary.days.length; dayIndex++) {
    const day = itinerary.days[dayIndex];
    if (!day) continue;

    const dayConflicts = detectDayConflicts(day, dayIndex);
    conflicts.push(...dayConflicts);

    if (dayConflicts.length > 0) {
      byDay.set(day.id, dayConflicts);
    }
  }

  return {
    conflicts,
    byDay,
    summary: {
      total: conflicts.length,
      errors: conflicts.filter((c) => c.severity === "error").length,
      warnings: conflicts.filter((c) => c.severity === "warning").length,
      info: conflicts.filter((c) => c.severity === "info").length,
    },
  };
}

/**
 * Get conflicts for a specific day
 */
export function getDayConflicts(
  result: ItineraryConflictsResult,
  dayId: string
): ItineraryConflict[] {
  return result.byDay.get(dayId) ?? [];
}

/**
 * Get conflicts for a specific activity
 */
export function getActivityConflicts(
  result: ItineraryConflictsResult,
  activityId: string
): ItineraryConflict[] {
  return result.conflicts.filter((c) => c.activityId === activityId);
}

/**
 * Check if an activity has any conflicts
 */
export function hasActivityConflicts(
  result: ItineraryConflictsResult,
  activityId: string
): boolean {
  return result.conflicts.some((c) => c.activityId === activityId);
}

/**
 * Get conflict count summary for a day
 */
export function getDayConflictSummary(
  result: ItineraryConflictsResult,
  dayId: string
): { total: number; errors: number; warnings: number; info: number } {
  const dayConflicts = result.byDay.get(dayId) ?? [];
  return {
    total: dayConflicts.length,
    errors: dayConflicts.filter((c) => c.severity === "error").length,
    warnings: dayConflicts.filter((c) => c.severity === "warning").length,
    info: dayConflicts.filter((c) => c.severity === "info").length,
  };
}
