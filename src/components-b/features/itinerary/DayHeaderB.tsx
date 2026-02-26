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
      const month = dayDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
      const weekday = dayDate.toLocaleDateString("en-US", { weekday: "short" });
      return `${month}, ${weekday}`;
    }
    return null;
  }, [dayDate]);

  const cityLabel = day.cityId ? formatCityName(day.cityId) : null;

  // Use the date as primary heading when available, fall back to "Day N"
  const primaryLabel = dateLabel ?? `Day ${dayIndex + 1}`;

  return (
    <div className="pb-2">
      <h2
        className="text-xs font-medium uppercase tracking-[0.15em]"
        style={{ color: "var(--muted-foreground)" }}
      >
        {primaryLabel}
        {cityLabel && (
          <span className="ml-1"> · {cityLabel}</span>
        )}
      </h2>
    </div>
  );
}
