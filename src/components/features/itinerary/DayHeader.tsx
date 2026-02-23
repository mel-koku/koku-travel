"use client";

import { useMemo } from "react";
import type { Itinerary, ItineraryDay } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import { useActivityLocations } from "@/hooks/useActivityLocations";
import { getCategoryDefaultDuration } from "@/lib/durationExtractor";
import { logger } from "@/lib/logger";
import { DayRefinementButtons } from "./DayRefinementButtons";
import { DaySuggestions } from "./DaySuggestions";
import { DayTips } from "./DayTips";
import { DayConflictSummary } from "./ConflictBadge";
import { DayStartTimePicker } from "./DayStartTimePicker";
import { RunningLatePopover } from "./RunningLatePopover";
import { AccommodationPicker } from "./AccommodationPicker";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";
import type { PreviewState, RefinementFilters } from "@/hooks/useSmartPromptActions";
import type { EntryPoint } from "@/types/trip";

type DayHeaderProps = {
  day: ItineraryDay;
  dayIndex: number;
  tripStartDate?: string; // ISO date string (yyyy-mm-dd)
  tripId?: string;
  builderData?: TripBuilderData;
  itinerary?: Itinerary;
  onRefineDay?: (refinedDay: ItineraryDay) => void;
  // Start/end location
  startLocation?: EntryPoint;
  endLocation?: EntryPoint;
  onStartLocationChange?: (location: EntryPoint | undefined) => void;
  onEndLocationChange?: (location: EntryPoint | undefined) => void;
  onCityAccommodationChange?: (location: EntryPoint | undefined) => void;
  // Smart suggestions for this day
  suggestions?: DetectedGap[];
  onAcceptSuggestion?: (gap: DetectedGap) => void;
  onSkipSuggestion?: (gap: DetectedGap) => void;
  loadingSuggestionId?: string | null;
  // Conflicts for this day
  conflicts?: ItineraryConflict[];
  // Day start time callback
  onDayStartTimeChange?: (startTime: string) => void;
  // Running late delay callback
  onDelayRemaining?: (delayMinutes: number) => void;
  // Preview props
  previewState?: PreviewState | null;
  onConfirmPreview?: () => void;
  onShowAnother?: () => Promise<void>;
  onCancelPreview?: () => void;
  onFilterChange?: (filter: Partial<RefinementFilters>) => void;
  isPreviewLoading?: boolean;
};

export function DayHeader({
  day,
  dayIndex,
  tripStartDate,
  tripId,
  builderData,
  itinerary,
  onRefineDay,
  suggestions,
  onAcceptSuggestion,
  onSkipSuggestion,
  loadingSuggestionId,
  conflicts,
  onDayStartTimeChange,
  onDelayRemaining,
  previewState,
  onConfirmPreview,
  onShowAnother,
  onCancelPreview,
  onFilterChange,
  isPreviewLoading,
  startLocation,
  endLocation,
  onStartLocationChange,
  onEndLocationChange,
  onCityAccommodationChange,
}: DayHeaderProps) {
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

  // Calculate total duration (time at locations only, excluding travel)
  // Uses durationMin (displayed as "Plan for X hours")
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
      }
    }

    // Debug logging (travel times tracked but not added to total)
    for (const activity of placeActivities) {
      if (activity.travelFromPrevious?.durationMinutes) {
        travelTimes += activity.travelFromPrevious.durationMinutes;
      }
    }

    logger.debug("[DayHeader] Duration calculation", {
      placeActivitiesCount: placeActivities.length,
      visitDurations,
      travelTimes, // Logged but not included in total
      cityTransition: day.cityTransition?.durationMinutes ?? 0,
      activities: placeActivities.map((a) => ({
        title: a.title,
        durationMin: a.durationMin,
        hasSchedule: Boolean(a.schedule?.arrivalTime && a.schedule?.departureTime),
        travelTime: a.travelFromPrevious?.durationMinutes ?? 0,
      })),
    });

    // Return only visit durations (travel time excluded - varies by transport mode)
    return visitDurations;
  }, [placeActivities, locationsMap]);

  // Format duration
  const durationLabel = useMemo(() => {
    if (totalDuration === 0) {
      return "Your day is wide open";
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

  // Budget breakdown — rough daily cost estimate from priceLevel
  const PRICE_RANGES: Record<number, { min: number; max: number }> = {
    0: { min: 0, max: 0 },
    1: { min: 500, max: 1500 },
    2: { min: 1500, max: 3000 },
    3: { min: 3000, max: 8000 },
    4: { min: 8000, max: 15000 },
  };

  const costEstimate = useMemo(() => {
    let totalMin = 0;
    let totalMax = 0;
    let priceDataCount = 0;

    for (const activity of placeActivities) {
      const location = locationsMap.get(activity.id);
      const level = location?.priceLevel;
      if (level !== undefined && level !== null) {
        const range = PRICE_RANGES[level];
        if (range) {
          totalMin += range.min;
          totalMax += range.max;
          priceDataCount++;
        }
      }
    }

    if (priceDataCount < 2) return null;

    const fmtYen = (v: number) => (v >= 10000 ? `¥${Math.round(v / 1000)}k` : `¥${v.toLocaleString()}`);
    return `~${fmtYen(totalMin)}–${fmtYen(totalMax)}`;
  }, [placeActivities, locationsMap]);

  const hasScheduledActivities = useMemo(
    () => placeActivities.some((a) => a.schedule?.arrivalTime || a.manualStartTime),
    [placeActivities],
  );

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif italic text-xl text-foreground tracking-[-0.02em] sm:text-2xl">
            {dateLabel.dayName ? (
              <>
                {dateLabel.date}
                <span className="ml-2 text-base font-normal text-foreground-secondary sm:text-lg">
                  {dateLabel.dayName}
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-foreground-secondary">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-sage"
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
            <span className="font-mono font-semibold text-sage">{durationLabel}</span>
            {totalDuration > 0 && (
              <span className="text-foreground-secondary">· at locations</span>
            )}
          </div>
          {costEstimate && (
            <>
              <span className="text-stone">|</span>
              <span
                className="font-mono text-xs text-stone"
                title="Rough estimate based on typical prices"
              >
                {costEstimate}
              </span>
            </>
          )}
          {onDayStartTimeChange && (
            <>
              <span className="text-stone">|</span>
              <DayStartTimePicker
                currentTime={day.bounds?.startTime ?? "09:00"}
                onChange={onDayStartTimeChange}
              />
            </>
          )}
          {onDelayRemaining && hasScheduledActivities && (
            <>
              <span className="text-stone">|</span>
              <RunningLatePopover onApplyDelay={onDelayRemaining} />
            </>
          )}
        </div>
        {/* Start/End Location Picker — own row */}
        {(onStartLocationChange || startLocation || endLocation) && (
          <AccommodationPicker
            startLocation={startLocation}
            endLocation={endLocation}
            cityId={day.cityId}
            onStartChange={onStartLocationChange ?? (() => {})}
            onEndChange={onEndLocationChange ?? (() => {})}
            onSetCityAccommodation={onCityAccommodationChange}
            isReadOnly={!onStartLocationChange}
          />
        )}
        {/* Conflict Summary */}
        {conflicts && conflicts.length > 0 && (
          <DayConflictSummary dayConflicts={conflicts} className="mt-3" />
        )}
      </div>
      {tripId && (
        <div className="mt-4 space-y-4">
          {/* Smart suggestions for this day */}
          {suggestions && suggestions.length > 0 && onAcceptSuggestion && onSkipSuggestion && (
            <DaySuggestions
              gaps={suggestions}
              onAccept={onAcceptSuggestion}
              onSkip={onSkipSuggestion}
              loadingGapId={loadingSuggestionId}
              previewState={previewState}
              onConfirmPreview={onConfirmPreview}
              onShowAnother={onShowAnother}
              onCancelPreview={onCancelPreview}
              onFilterChange={onFilterChange}
              isPreviewLoading={isPreviewLoading}
            />
          )}
          {/* Day-level travel tips */}
          <DayTips
            day={day}
            tripStartDate={tripStartDate}
            dayIndex={dayIndex}
          />
          {onRefineDay && (
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-sm font-medium text-foreground-secondary">Adjust this day</p>
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

