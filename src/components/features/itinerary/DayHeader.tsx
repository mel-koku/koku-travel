"use client";

import { useMemo } from "react";
import type { Itinerary, ItineraryDay } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { EntryPoint } from "@/types/trip";
import { useActivityLocations } from "@/hooks/useActivityLocations";
import { getCategoryDefaultDuration } from "@/lib/durationExtractor";
import { logger } from "@/lib/logger";
import { DayEntryPointEditor } from "./DayEntryPointEditor";
import { DayRefinementButtons } from "./DayRefinementButtons";
import { useAppState } from "@/state/AppState";

type DayHeaderProps = {
  day: ItineraryDay;
  dayIndex: number;
  tripStartDate?: string; // ISO date string (yyyy-mm-dd)
  tripId?: string;
  builderData?: TripBuilderData;
  itinerary?: Itinerary;
  onRefineDay?: (refinedDay: ItineraryDay) => void;
};

export function DayHeader({ day, dayIndex, tripStartDate, tripId, builderData, itinerary, onRefineDay }: DayHeaderProps) {
  const { dayEntryPoints, setDayEntryPoint, reorderActivities } = useAppState();
  
  const entryPointKey = tripId && day.id ? `${tripId}-${day.id}` : undefined;
  const entryPoints = entryPointKey ? dayEntryPoints[entryPointKey] : undefined;

  const handleSetStartPoint = (entryPoint: EntryPoint | undefined) => {
    if (tripId && day.id) {
      setDayEntryPoint(tripId, day.id, "start", entryPoint);
    }
  };

  const handleSetEndPoint = (entryPoint: EntryPoint | undefined) => {
    if (tripId && day.id) {
      setDayEntryPoint(tripId, day.id, "end", entryPoint);
    }
  };

  const handleOptimizeRoute = (activityIds: string[]) => {
    if (tripId && day.id) {
      reorderActivities(tripId, day.id, activityIds);
    }
  };
  // Calculate the date for this day
  const dayDate = useMemo(() => {
    if (tripStartDate) {
      try {
        // Parse ISO date string (yyyy-mm-dd) as local date to avoid timezone issues
        const [year, month, day] = tripStartDate.split("-").map(Number);
        if (year && month && day && !Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
          const startDate = new Date(year, month - 1, day); // month is 0-indexed
          const dayDate = new Date(startDate);
          dayDate.setDate(startDate.getDate() + dayIndex);
          return dayDate;
        }
        // Fallback to Date constructor if format doesn't match
        const startDate = new Date(tripStartDate);
        if (!Number.isNaN(startDate.getTime())) {
          const dayDate = new Date(startDate);
          dayDate.setDate(startDate.getDate() + dayIndex);
          return dayDate;
        }
      } catch {
        // Invalid date, fall back to undefined
      }
    }
    return undefined;
  }, [tripStartDate, dayIndex]);

  // Format date and day name
  const dateLabel = useMemo(() => {
    if (dayDate) {
      const dateFormatter = new Intl.DateTimeFormat(undefined, {
        month: "long",
        day: "numeric",
      });
      const dayFormatter = new Intl.DateTimeFormat(undefined, {
        weekday: "long",
      });
      return {
        date: dateFormatter.format(dayDate),
        dayName: dayFormatter.format(dayDate),
      };
    }
    // Fallback to dateLabel if available, or just "Day X"
    const fallbackLabel = day.dateLabel || `Day ${dayIndex + 1}`;
    return {
      date: fallbackLabel,
      dayName: undefined,
    };
  }, [dayDate, day.dateLabel, dayIndex]);

  // Filter to place activities for location fetching
  const placeActivities = useMemo(
    () => (day.activities ?? []).filter((a): a is Extract<typeof a, { kind: "place" }> => a.kind === "place"),
    [day.activities],
  );

  // Fetch location data from database
  const { locationsMap } = useActivityLocations(placeActivities);

  // Calculate total duration
  // Uses durationMin (displayed as "Plan for X hours") + travel times
  // Falls back to calculating from schedule times if durationMin is not set
  const totalDuration = useMemo(() => {
    if (placeActivities.length === 0) {
      return 0;
    }

    // Helper to parse time string (HH:MM) to minutes since midnight
    const parseTimeToMinutes = (timeStr: string): number | null => {
      const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return null;
      const hours = Number.parseInt(match[1] || "0", 10);
      const minutes = Number.parseInt(match[2] || "0", 10);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
      return hours * 60 + minutes;
    };

    let totalMinutes = 0;
    let visitDurations = 0;
    let travelTimes = 0;

    // Sum all visit durations
    for (const activity of placeActivities) {
      let activityDuration: number | null = null;

      // Priority 1: Use durationMin if available (what's shown as "Plan for X hours")
      if (activity.durationMin) {
        activityDuration = activity.durationMin;
      }
      // Priority 2: Calculate from schedule times if available
      else if (activity.schedule?.arrivalTime && activity.schedule?.departureTime) {
        const arrival = parseTimeToMinutes(activity.schedule.arrivalTime);
        const departure = parseTimeToMinutes(activity.schedule.departureTime);
        if (arrival !== null && departure !== null) {
          const duration = departure >= arrival ? departure - arrival : (24 * 60) - arrival + departure;
          if (duration > 0) {
            activityDuration = duration;
          }
        }
      }
      // Priority 3: Get duration from location data
      else {
        const location = locationsMap.get(activity.id);
        if (location) {
          // Check location's recommended visit duration
          if (location.recommendedVisit?.typicalMinutes) {
            activityDuration = location.recommendedVisit.typicalMinutes;
          } else if (location.recommendedVisit?.minMinutes) {
            activityDuration = location.recommendedVisit.minMinutes;
          }
          // Fallback to category default
          else if (location.category) {
            activityDuration = getCategoryDefaultDuration(location.category);
          }
        }
      }

      if (activityDuration !== null && activityDuration > 0) {
        visitDurations += activityDuration;
        totalMinutes += activityDuration;
      }
    }

    // Sum all travel times between activities
    for (const activity of placeActivities) {
      if (activity.travelFromPrevious?.durationMinutes) {
        const travelTime = activity.travelFromPrevious.durationMinutes;
        travelTimes += travelTime;
        totalMinutes += travelTime;
      }
    }

    // Debug logging
    logger.debug("[DayHeader] Duration calculation", {
      placeActivitiesCount: placeActivities.length,
      visitDurations,
      travelTimes,
      cityTransition: day.cityTransition?.durationMinutes ?? 0,
      totalMinutes,
      activities: placeActivities.map((a) => ({
        title: a.title,
        durationMin: a.durationMin,
        hasSchedule: Boolean(a.schedule?.arrivalTime && a.schedule?.departureTime),
        travelTime: a.travelFromPrevious?.durationMinutes ?? 0,
      })),
    });

    // Add city transition time if present
    if (day.cityTransition?.durationMinutes) {
      totalMinutes += day.cityTransition.durationMinutes;
    }

    return totalMinutes;
  }, [placeActivities, locationsMap, day.cityTransition]);

  // Format duration
  const durationLabel = useMemo(() => {
    if (totalDuration === 0) {
      return "No activities planned";
    }

    const hours = Math.floor(totalDuration / 60);
    const minutes = totalDuration % 60;

    if (hours === 0) {
      return `${minutes} min`;
    } else if (minutes === 0) {
      return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    } else {
      return `${hours} ${hours === 1 ? "hour" : "hours"} ${minutes} min`;
    }
  }, [totalDuration]);

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-charcoal sm:text-2xl">
            {dateLabel.dayName ? (
              <>
                {dateLabel.dayName}
                <span className="ml-2 text-lg font-normal text-foreground-secondary sm:text-xl">
                  {dateLabel.date}
                </span>
              </>
            ) : (
              dateLabel.date
            )}
          </h2>
          {day.cityId && (
            <p className="text-sm font-medium text-foreground-secondary capitalize">
              {day.cityId}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-warm-gray sm:text-base">
            <svg
              className="h-5 w-5 text-sage"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">Expected duration:</span>
            <span className="font-semibold text-sage">{durationLabel}</span>
          </div>
          {totalDuration > 0 && (
            <p className="ml-7 text-xs text-foreground-secondary sm:text-sm">
              Based on average time at locations and travel between stops
            </p>
          )}
        </div>
      </div>
      {tripId && (
        <div className="mt-4 space-y-4">
          <DayEntryPointEditor
            tripId={tripId}
            dayId={day.id}
            startPoint={entryPoints?.startPoint}
            endPoint={entryPoints?.endPoint}
            activities={day.activities ?? []}
            onSetStartPoint={handleSetStartPoint}
            onSetEndPoint={handleSetEndPoint}
            onOptimizeRoute={handleOptimizeRoute}
          />
          {onRefineDay && (
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-sm font-medium text-warm-gray">Refine this day:</p>
              <DayRefinementButtons
                dayIndex={dayIndex}
                tripId={tripId}
                builderData={builderData}
                itinerary={itinerary}
                onRefine={onRefineDay}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

