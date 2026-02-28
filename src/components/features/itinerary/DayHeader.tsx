"use client";

import { useMemo, useState, useCallback } from "react";
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
import { estimateDayCost, formatCostRange } from "@/lib/itinerary/costEstimator";

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
  }, [placeActivities, locationsMap, day.cityTransition?.durationMinutes]);

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

  const costEstimate = useMemo(() => {
    const range = estimateDayCost(day.activities, locationsMap);
    if (!range) return null;
    return formatCostRange(range);
  }, [day.activities, locationsMap]);

  const hasScheduledActivities = useMemo(
    () => placeActivities.some((a) => a.schedule?.arrivalTime || a.manualStartTime),
    [placeActivities],
  );

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3">
        <div>
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
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground-secondary">
            {day.cityId && (
              <span className="font-medium capitalize">{day.cityId}</span>
            )}
            {day.cityId && <span className="text-stone">·</span>}
            <span className="font-mono font-semibold text-sage">{durationLabel}</span>
            {day.paceLabel && (
              <>
                <span className="text-stone">·</span>
                <span
                  className={`text-xs font-medium ${
                    day.paceLabel === "light"
                      ? "text-success"
                      : day.paceLabel === "packed"
                        ? "text-error"
                        : "text-warning"
                  }`}
                >
                  {day.paceLabel === "light"
                    ? "Light day"
                    : day.paceLabel === "packed"
                      ? "Packed day"
                      : "Moderate"}
                </span>
              </>
            )}
            {costEstimate && (
              <>
                <span className="text-stone">·</span>
                <span
                  className="font-mono text-stone"
                  title="Rough estimate based on typical prices"
                >
                  {costEstimate}
                </span>
              </>
            )}
            {onDayStartTimeChange && (
              <>
                <span className="text-stone">·</span>
                <DayStartTimePicker
                  currentTime={day.bounds?.startTime ?? "09:00"}
                  onChange={onDayStartTimeChange}
                />
              </>
            )}
            {onDelayRemaining && hasScheduledActivities && (
              <>
                <span className="text-stone">·</span>
                <RunningLatePopover onApplyDelay={onDelayRemaining} />
              </>
            )}
          </div>
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
        <DayInsightsSection
          day={day}
          dayIndex={dayIndex}
          tripStartDate={tripStartDate}
          tripId={tripId}
          builderData={builderData}
          itinerary={itinerary}
          onRefineDay={onRefineDay}
          suggestions={suggestions}
          onAcceptSuggestion={onAcceptSuggestion}
          onSkipSuggestion={onSkipSuggestion}
          loadingSuggestionId={loadingSuggestionId}
          previewState={previewState}
          onConfirmPreview={onConfirmPreview}
          onShowAnother={onShowAnother}
          onCancelPreview={onCancelPreview}
          onFilterChange={onFilterChange}
          isPreviewLoading={isPreviewLoading}
        />
      )}
    </div>
  );
}

/** Unified insights section — merges suggestions + tips into one collapsible accordion */
function DayInsightsSection({
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
  previewState,
  onConfirmPreview,
  onShowAnother,
  onCancelPreview,
  onFilterChange,
  isPreviewLoading,
}: {
  day: ItineraryDay;
  dayIndex: number;
  tripStartDate?: string;
  tripId: string;
  builderData?: TripBuilderData;
  itinerary?: Itinerary;
  onRefineDay?: (refinedDay: ItineraryDay) => void;
  suggestions?: DetectedGap[];
  onAcceptSuggestion?: (gap: DetectedGap) => void;
  onSkipSuggestion?: (gap: DetectedGap) => void;
  loadingSuggestionId?: string | null;
  previewState?: PreviewState | null;
  onConfirmPreview?: () => void;
  onShowAnother?: () => Promise<void>;
  onCancelPreview?: () => void;
  onFilterChange?: (filter: Partial<RefinementFilters>) => void;
  isPreviewLoading?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tipCount, setTipCount] = useState(0);

  const handleTipCount = useCallback((count: number) => {
    setTipCount(count);
  }, []);

  const suggestionCount = suggestions?.length ?? 0;
  const hasSuggestions = suggestionCount > 0 && onAcceptSuggestion && onSkipSuggestion;
  const totalInsights = suggestionCount + tipCount;

  return (
    <div className="mt-3 space-y-2">
      {/* Row: toggle + adjust button */}
      <div className="flex items-center gap-2">
        {totalInsights > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex flex-1 items-center justify-between rounded-xl border border-border bg-background/50 px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-brand-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-xs font-medium text-foreground">
                {totalInsights} insight{totalInsights !== 1 ? "s" : ""} for today
              </span>
            </div>
            <svg
              className={`h-3.5 w-3.5 text-stone transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        {/* Refinement popover */}
        {onRefineDay && (
          <DayRefinementButtons
            dayIndex={dayIndex}
            tripId={tripId}
            builderData={builderData}
            itinerary={itinerary}
            onRefine={onRefineDay}
          />
        )}
      </div>

      {/* Expanded content (full width below the row) */}
      {isExpanded && totalInsights > 0 && (
        <div className="rounded-xl border border-border bg-background/50 px-3 py-3 space-y-3">
          {/* Suggestions */}
          {hasSuggestions && (
            <div className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-stone">
                Suggestions
              </p>
              <DaySuggestions
                gaps={suggestions!}
                onAccept={onAcceptSuggestion!}
                onSkip={onSkipSuggestion!}
                loadingGapId={loadingSuggestionId}
                embedded
                previewState={previewState}
                onConfirmPreview={onConfirmPreview}
                onShowAnother={onShowAnother}
                onCancelPreview={onCancelPreview}
                onFilterChange={onFilterChange}
                isPreviewLoading={isPreviewLoading}
              />
            </div>
          )}
          {/* Tips */}
          {tipCount > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-stone">
                Travel tips
              </p>
              <DayTips
                day={day}
                tripStartDate={tripStartDate}
                dayIndex={dayIndex}
                embedded
                onTipCount={handleTipCount}
                nextDayActivities={itinerary?.days[dayIndex + 1]?.activities}
                isFirstTimeVisitor={builderData?.isFirstTimeVisitor}
              />
            </div>
          )}
        </div>
      )}

      {/* Hidden DayTips to report count (always mounted for the badge) */}
      <div className="hidden">
        <DayTips
          day={day}
          tripStartDate={tripStartDate}
          dayIndex={dayIndex}
          embedded
          onTipCount={handleTipCount}
          nextDayActivities={itinerary?.days[dayIndex + 1]?.activities}
          isFirstTimeVisitor={builderData?.isFirstTimeVisitor}
        />
      </div>
    </div>
  );
}

