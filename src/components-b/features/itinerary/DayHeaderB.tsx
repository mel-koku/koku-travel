"use client";

import { useMemo } from "react";
import type { ItineraryDay } from "@/types/itinerary";
import { REGIONS } from "@/data/regions";
import { DayStartTimePickerB } from "./DayStartTimePickerB";

function formatCityName(cityId: string): string {
  for (const region of REGIONS) {
    const city = region.cities.find((c) => c.id === cityId);
    if (city) return city.name;
  }
  return cityId.charAt(0).toUpperCase() + cityId.slice(1);
}

type DayHeaderBProps = {
  day: ItineraryDay;
  dayIndex: number;
  tripStartDate?: string;
  onDayStartTimeChange?: (startTime: string) => void;
  /** Slot for the refinement button */
  refinementSlot?: React.ReactNode;
  /** Slot for the accommodation picker */
  accommodationSlot?: React.ReactNode;
  /** Slot for the tips popover pill */
  tipsSlot?: React.ReactNode;
  /** Slot for the suggestions popover pill */
  suggestionsSlot?: React.ReactNode;
  /** Slot for day intro text */
  dayIntroSlot?: React.ReactNode;
};

export function DayHeaderB({ day, dayIndex, tripStartDate, onDayStartTimeChange, refinementSlot, accommodationSlot, tipsSlot, suggestionsSlot, dayIntroSlot }: DayHeaderBProps) {
  const dayDate = useMemo(() => {
    if (tripStartDate) {
      try {
        const [year, month, d] = tripStartDate.split("-").map(Number);
        if (
          year &&
          month &&
          d &&
          !Number.isNaN(year) &&
          !Number.isNaN(month) &&
          !Number.isNaN(d)
        ) {
          const startDate = new Date(year, month - 1, d);
          const result = new Date(startDate);
          result.setDate(startDate.getDate() + dayIndex);
          return result;
        }
        const startDate = new Date(tripStartDate);
        if (!Number.isNaN(startDate.getTime())) {
          const result = new Date(startDate);
          result.setDate(startDate.getDate() + dayIndex);
          return result;
        }
      } catch {
        // Invalid date
      }
    }
    return undefined;
  }, [tripStartDate, dayIndex]);

  const dateLabel = useMemo(() => {
    if (dayDate) {
      const month = dayDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
      const weekday = dayDate.toLocaleDateString("en-US", { weekday: "short" });
      return `${month}, ${weekday}`;
    }
    return null;
  }, [dayDate]);

  const cityLabel = day.cityId ? formatCityName(day.cityId) : null;

  // Use the date as primary heading when available, fall back to "Day N"
  const primaryLabel = dateLabel ?? `Day ${dayIndex + 1}`;

  const currentStartTime = day.bounds?.startTime ?? "09:00";

  return (
    <div className="pb-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <h2
          className="text-xs font-medium uppercase tracking-[0.15em]"
          style={{ color: "var(--muted-foreground)" }}
        >
          {primaryLabel}
          {cityLabel && (
            <span className="ml-1"> · {cityLabel}</span>
          )}
          {day.paceLabel && (
            <span
              className="ml-1"
              style={{
                color:
                  day.paceLabel === "light"
                    ? "var(--success)"
                    : day.paceLabel === "packed"
                      ? "var(--error)"
                      : "var(--warning)",
              }}
            >
              {" · "}
              {day.paceLabel === "light"
                ? "Light day"
                : day.paceLabel === "packed"
                  ? "Packed day"
                  : "Moderate"}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1.5">
          {tipsSlot}
          {suggestionsSlot}
          {refinementSlot}
          {onDayStartTimeChange && (
            <DayStartTimePickerB
              currentTime={currentStartTime}
              onChange={onDayStartTimeChange}
            />
          )}
        </div>
      </div>
      {accommodationSlot}
      {dayIntroSlot}
    </div>
  );
}
