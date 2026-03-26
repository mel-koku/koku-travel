"use client";

import { useMemo } from "react";
import type { Itinerary, ItineraryDay } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import { REGIONS } from "@/data/regions";
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
  tripId: _tripId,
  builderData: _builderData,
  itinerary: _itinerary,
  onRefineDay: _onRefineDay,
  suggestions: _suggestions,
  onAcceptSuggestion: _onAcceptSuggestion,
  onSkipSuggestion: _onSkipSuggestion,
  loadingSuggestionId: _loadingSuggestionId,
  conflicts,
  onDayStartTimeChange,
  previewState: _previewState,
  onConfirmPreview: _onConfirmPreview,
  onShowAnother: _onShowAnother,
  onCancelPreview: _onCancelPreview,
  onFilterChange: _onFilterChange,
  isPreviewLoading: _isPreviewLoading,
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



