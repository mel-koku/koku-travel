"use client";

import { useState } from "react";
import type { ItineraryDay } from "@/types/itinerary";
import { DayConflictSummary } from "./ConflictBadge";
import { AccommodationPicker } from "./AccommodationPicker";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";
import type { EntryPoint } from "@/types/trip";

type DayHeaderProps = {
  day: ItineraryDay;
  // Start/end location
  startLocation?: EntryPoint;
  endLocation?: EntryPoint;
  onStartLocationChange?: (location: EntryPoint | undefined) => void;
  onEndLocationChange?: (location: EntryPoint | undefined) => void;
  onCityAccommodationChange?: (location: EntryPoint | undefined) => void;
  // Conflicts for this day
  conflicts?: ItineraryConflict[];
};

export function DayHeader({
  day,
  conflicts,
  startLocation,
  endLocation,
  onStartLocationChange,
  onEndLocationChange,
  onCityAccommodationChange,
}: DayHeaderProps) {
  const hasConflicts = conflicts && conflicts.length > 0;
  const canEditAccommodation = Boolean(onStartLocationChange);
  const hasAccommodationSet = Boolean(startLocation || endLocation);
  const [accommodationExpanded, setAccommodationExpanded] = useState(hasAccommodationSet);

  if (!hasConflicts && !canEditAccommodation && !hasAccommodationSet) return null;

  return (
    <div className="mb-2 space-y-2">
      {hasConflicts && (
        <DayConflictSummary dayConflicts={conflicts} />
      )}
      {canEditAccommodation && !hasAccommodationSet && !accommodationExpanded ? (
        <button
          type="button"
          onClick={() => setAccommodationExpanded(true)}
          className="flex items-center gap-1.5 text-xs text-stone transition-colors hover:text-foreground"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add your accommodation to route from
        </button>
      ) : (hasAccommodationSet || accommodationExpanded) ? (
        <AccommodationPicker
          startLocation={startLocation}
          endLocation={endLocation}
          cityId={day.cityId}
          onStartChange={onStartLocationChange ?? (() => {})}
          onEndChange={onEndLocationChange ?? (() => {})}
          onSetCityAccommodation={onCityAccommodationChange}
          isReadOnly={!onStartLocationChange}
        />
      ) : null}
    </div>
  );
}
