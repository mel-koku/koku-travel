"use client";

import { useMemo, useEffect, useRef, type ChangeEvent } from "react";

type DaySelectorProps = {
  totalDays: number;
  selected: number;
  onChange: (idx: number) => void;
  labels?: string[];
  /** Trip start date in ISO format (yyyy-mm-dd) */
  tripStartDate?: string;
  /** Auto-scroll to today on mount */
  autoScrollToToday?: boolean;
};

/**
 * Get today's index relative to trip start date.
 * Returns -1 if trip hasn't started or today is invalid.
 */
function getTodayIndex(tripStartDate: string | undefined, totalDays: number): number {
  if (!tripStartDate || totalDays === 0) return -1;

  try {
    const [year, month, day] = tripStartDate.split("-").map(Number);
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
      return -1;
    }

    const startDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || diffDays >= totalDays) {
      return -1;
    }

    return diffDays;
  } catch {
    return -1;
  }
}

export const DaySelector = ({
  totalDays,
  selected,
  onChange,
  labels = [],
  tripStartDate,
  autoScrollToToday = true,
}: DaySelectorProps) => {
  const hasAutoScrolled = useRef(false);

  const todayIndex = useMemo(
    () => getTodayIndex(tripStartDate, totalDays),
    [tripStartDate, totalDays]
  );

  const days = useMemo(() => {
    // Separate formatters for custom order: "Feb 11, Tue"
    const monthDayFormatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    });
    const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
    });

    return Array.from({ length: totalDays }).map((_, index) => {
      let dateLabel = `Day ${index + 1}`;

      // Calculate actual date from trip start date
      if (tripStartDate) {
        try {
          const [year, month, day] = tripStartDate.split("-").map(Number);
          if (year && month && day) {
            const date = new Date(year, month - 1, day);
            date.setDate(date.getDate() + index);
            const monthDay = monthDayFormatter.format(date);
            const weekday = weekdayFormatter.format(date);
            dateLabel = `${monthDay}, ${weekday}`;
          }
        } catch {
          // Fall back to Day X format
        }
      }

      // Extract city from label if available (format: "Day X (City)")
      const cityMatch = labels[index]?.match(/\(([^)]+)\)/);
      const city = cityMatch ? cityMatch[1] : null;

      return {
        index,
        label: city ? `${dateLabel} · ${city}` : dateLabel,
        isToday: index === todayIndex,
      };
    });
  }, [labels, totalDays, todayIndex, tripStartDate]);

  // Auto-select today on mount
  useEffect(() => {
    if (
      autoScrollToToday &&
      !hasAutoScrolled.current &&
      todayIndex >= 0 &&
      selected !== todayIndex
    ) {
      hasAutoScrolled.current = true;
      onChange(todayIndex);
    }
  }, [autoScrollToToday, todayIndex, selected, onChange]);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(Number(event.target.value));
  };

  if (days.length === 0) {
    return (
      <p className="text-sm text-stone">
        No days available yet for this itinerary.
      </p>
    );
  }

  const selectedDay = days[selected];

  return (
    <div className="relative">
      <select
        value={selected}
        onChange={handleChange}
        className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm font-medium text-charcoal shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        aria-label="Select day"
      >
        {days.map(({ index, label, isToday }) => (
          <option key={index} value={index}>
            {isToday ? `${label} (Today)` : label}
          </option>
        ))}
      </select>
      {/* Dropdown arrow */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <svg className="h-4 w-4 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {/* Today indicator */}
      {selectedDay?.isToday && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sage"></span>
          </span>
        </div>
      )}
    </div>
  );
};


