"use client";

import { useMemo } from "react";
import type { ItineraryDay } from "@/types/itinerary";
import { REGIONS } from "@/data/regions";
import { parseLocalDateWithOffset } from "@/lib/utils/dateUtils";
import { DayStartTimePickerC } from "./DayStartTimePickerC";

function formatCityName(cityId: string): string {
  for (const region of REGIONS) {
    const city = region.cities.find((c) => c.id === cityId);
    if (city) return city.name;
  }
  return cityId.charAt(0).toUpperCase() + cityId.slice(1);
}

type DayHeaderCProps = {
  day: ItineraryDay;
  dayIndex: number;
  tripStartDate?: string;
  onDayStartTimeChange?: (startTime: string) => void;
  accommodationSlot?: React.ReactNode;
  dayIntroSlot?: React.ReactNode;
};

export function DayHeaderC({
  day,
  dayIndex,
  tripStartDate,
  onDayStartTimeChange,
  accommodationSlot,
  dayIntroSlot,
}: DayHeaderCProps) {
  const dayDate = useMemo(() => {
    if (tripStartDate) {
      return parseLocalDateWithOffset(tripStartDate, dayIndex) ?? undefined;
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
  const primaryLabel = dateLabel ?? `Day ${dayIndex + 1}`;
  const currentStartTime = day.bounds?.startTime ?? "09:00";

  return (
    <div
      className="border-b pb-4 space-y-2"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <span
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--muted-foreground)" }}
          >
            Day {dayIndex + 1}
          </span>
          <h2
            className="text-lg font-bold tracking-[-0.03em]"
            style={{
              color: "var(--foreground)",
              fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
            }}
          >
            {primaryLabel}
            {cityLabel && (
              <span
                className="ml-2 text-sm font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                {cityLabel}
              </span>
            )}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {day.paceLabel && (
            <span
              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] border"
              style={{
                color:
                  day.paceLabel === "light"
                    ? "var(--success)"
                    : day.paceLabel === "packed"
                      ? "var(--error)"
                      : "var(--warning)",
                borderColor:
                  day.paceLabel === "light"
                    ? "var(--success)"
                    : day.paceLabel === "packed"
                      ? "var(--error)"
                      : "var(--warning)",
              }}
            >
              {day.paceLabel === "light"
                ? "Light"
                : day.paceLabel === "packed"
                  ? "Packed"
                  : "Moderate"}
            </span>
          )}
          {onDayStartTimeChange && (
            <DayStartTimePickerC
              currentTime={currentStartTime}
              onChange={onDayStartTimeChange}
            />
          )}
        </div>
      </div>
      {dayIntroSlot}
      {accommodationSlot && <div className="mt-2">{accommodationSlot}</div>}
    </div>
  );
}
