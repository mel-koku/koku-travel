"use client";

import { useMemo } from "react";
import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import type { Weekday } from "@/types/location";
import { useActivityLocations } from "@/hooks/useActivityLocations";
import {
  checkAvailabilityForSchedule,
  aggregateDayAvailabilityIssues,
  type DayAvailabilityIssues,
} from "@/lib/availability/availabilityService";

const WEEKDAYS: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function getWeekdayForDay(tripStartDate: string | undefined, dayIndex: number): Weekday | null {
  if (!tripStartDate) return null;
  const parts = tripStartDate.split("-").map(Number);
  const y = parts[0], m = parts[1], d = parts[2];
  if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const date = new Date(y, m - 1, d + dayIndex);
  if (isNaN(date.getTime())) return null;
  return WEEKDAYS[date.getDay()] ?? null;
}

/**
 * Checks availability for all place activities in a day against their operating hours.
 * Returns aggregated availability issues (closed venues, reservation requirements, etc.)
 */
export function useDayAvailability(
  day: ItineraryDay,
  dayIndex: number,
  tripStartDate?: string,
): DayAvailabilityIssues | null {
  const placeActivities = useMemo(
    () =>
      day.activities.filter(
        (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place",
      ),
    [day.activities],
  );

  const { getLocation, isLoading } = useActivityLocations(placeActivities);

  const weekday = useMemo(
    () => getWeekdayForDay(tripStartDate, dayIndex),
    [tripStartDate, dayIndex],
  );

  return useMemo(() => {
    if (isLoading || !weekday || placeActivities.length === 0) return null;

    const results = placeActivities
      .map((activity) => {
        const location = getLocation(activity.id);
        if (!location?.operatingHours?.periods?.length) return null;

        const result = checkAvailabilityForSchedule(
          location,
          weekday,
          activity.schedule?.arrivalTime,
          activity.schedule?.departureTime,
        );
        // Set the activityId (the service returns "" by default)
        return { ...result, activityId: activity.id };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (results.length === 0) return null;

    return aggregateDayAvailabilityIssues(day.id, dayIndex, results);
  }, [placeActivities, getLocation, isLoading, weekday, day.id, dayIndex]);
}
