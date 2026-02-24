"use client";

import { useMemo } from "react";
import type { ItineraryDay } from "@/types/itinerary";
import { REGIONS } from "@/data/regions";

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
};

export function DayHeaderB({ day, dayIndex, tripStartDate }: DayHeaderBProps) {
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
      return new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(dayDate);
    }
    return null;
  }, [dayDate]);

  const cityLabel = day.cityId ? formatCityName(day.cityId) : null;

  return (
    <div className="flex flex-col gap-1 pb-2">
      <h2
        className="text-lg font-bold tracking-tight sm:text-xl"
        style={{ color: "var(--foreground)" }}
      >
        Day {dayIndex + 1}
        {cityLabel && (
          <span
            className="ml-1.5 font-normal"
            style={{ color: "var(--muted-foreground)" }}
          >
            &mdash; {cityLabel}
          </span>
        )}
      </h2>
      {dateLabel && (
        <p
          className="text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          {dateLabel}
        </p>
      )}
    </div>
  );
}
