"use client";

import { useMemo, useState, useCallback } from "react";
import type { Itinerary, ItineraryDay } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import { REGIONS } from "@/data/regions";
import { DayRefinementButtons } from "./DayRefinementButtons";
import { DaySuggestions } from "./DaySuggestions";
import { DayTips } from "./DayTips";
import { DayConflictSummary } from "./ConflictBadge";
import { DayStartTimePicker } from "./DayStartTimePicker";
import { AccommodationPicker } from "./AccommodationPicker";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";
import type { PreviewState, RefinementFilters } from "@/hooks/useSmartPromptActions";
import type { EntryPoint } from "@/types/trip";
import { parseLocalDateWithOffset } from "@/lib/utils/dateUtils";

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
      return parseLocalDateWithOffset(tripStartDate, dayIndex) ?? undefined;
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

  const cityName = useMemo(() => {
    if (!day.cityId) return null;
    for (const region of REGIONS) {
      const city = region.cities.find((c) => c.id === day.cityId);
      if (city) return city.name;
    }
    return day.cityId.charAt(0).toUpperCase() + day.cityId.slice(1);
  }, [day.cityId]);

  return (
    <div className="mb-2">
      <div className="flex flex-col gap-2">
        {/* Compact date/city/pace line */}
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-foreground-secondary">
            {dateLabel.date}
            {dateLabel.dayName && (
              <span>, {dateLabel.dayName}</span>
            )}
            {cityName && (
              <span> &middot; {cityName}</span>
            )}
            {(() => {
              const placeCount = (day.activities ?? []).filter(a => a.kind === "place").length;
              return placeCount > 0 ? (
                <span>
                  {" \u00B7 "}
                  {placeCount} {placeCount === 1 ? "stop" : "stops"}
                </span>
              ) : null;
            })()}
          </h2>
          <div className="flex items-center gap-2">
            {onDayStartTimeChange && (
              <DayStartTimePicker
                currentTime={day.bounds?.startTime ?? "09:00"}
                onChange={onDayStartTimeChange}
              />
            )}
          </div>
        </div>
        {/* Conflict Summary */}
        {conflicts && conflicts.length > 0 && (
          <DayConflictSummary dayConflicts={conflicts} className="mt-1" />
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
      {/* Accommodation */}
      {(onStartLocationChange || startLocation || endLocation) && (
        <div className="mt-2">
          <AccommodationPicker
            startLocation={startLocation}
            endLocation={endLocation}
            cityId={day.cityId}
            onStartChange={onStartLocationChange ?? (() => {})}
            onEndChange={onEndLocationChange ?? (() => {})}
            onSetCityAccommodation={onCityAccommodationChange}
            isReadOnly={!onStartLocationChange}
          />
        </div>
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
            className="flex flex-1 items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2.5"
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
        <div className="rounded-lg border border-border bg-background/50 px-3 py-3 space-y-3">
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

      {/* Count-only DayTips — fetches and reports count without rendering UI */}
      <DayTips
        day={day}
        tripStartDate={tripStartDate}
        dayIndex={dayIndex}
        embedded
        onTipCount={handleTipCount}
        nextDayActivities={itinerary?.days[dayIndex + 1]?.activities}
        isFirstTimeVisitor={builderData?.isFirstTimeVisitor}
        countOnly
      />
    </div>
  );
}

