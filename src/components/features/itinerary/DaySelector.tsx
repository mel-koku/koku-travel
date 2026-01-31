"use client";

import { KeyboardEvent, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/cn";

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
    // Parse trip start date
    const [year, month, day] = tripStartDate.split("-").map(Number);
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
      return -1;
    }

    const startDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate difference in days
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Check if today is within trip range
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
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hasAutoScrolled = useRef(false);

  // Calculate today's index
  const todayIndex = useMemo(
    () => getTodayIndex(tripStartDate, totalDays),
    [tripStartDate, totalDays]
  );

  const days = useMemo(() => {
    return Array.from({ length: totalDays }).map((_, index) => ({
      index,
      label: labels[index] || `Day ${index + 1}`,
      isToday: index === todayIndex,
      isPast: todayIndex >= 0 && index < todayIndex,
      isFuture: todayIndex >= 0 && index > todayIndex,
    }));
  }, [labels, totalDays, todayIndex]);

  // Auto-scroll to today on mount
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

  const focusButton = (targetIndex: number) => {
    const button = buttonRefs.current[targetIndex];
    button?.focus();
  };

  const selectDay = (index: number) => {
    onChange(index);
    focusButton(index);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const nextIndex = (index + 1) % days.length;
      selectDay(nextIndex);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prevIndex = (index - 1 + days.length) % days.length;
      selectDay(prevIndex);
    }
  };

  if (days.length === 0) {
    return (
      <p className="text-sm text-stone">
        No days available yet for this itinerary.
      </p>
    );
  }

  return (
    <nav aria-label="Day selector">
      <div
        role="tablist"
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap"
      >
        {days.map(({ index, label, isToday, isPast }) => {
          const isSelected = index === selected;
          return (
            <button
              key={index}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              role="tab"
              type="button"
              className={cn(
                "relative whitespace-nowrap rounded-full border px-4 py-2 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
                isSelected
                  ? "border-brand-primary bg-brand-primary text-white shadow-sm"
                  : isPast
                    ? "border-border bg-surface/50 text-stone hover:border-sage/30 hover:text-sage"
                    : "border-border bg-background text-warm-gray hover:border-sage/30 hover:text-sage",
                isToday && !isSelected && "border-sage ring-2 ring-sage/30"
              )}
              aria-selected={isSelected}
              aria-current={isToday ? "date" : undefined}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => selectDay(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <span className="flex items-center gap-1.5">
                {isToday && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-sage"></span>
                  </span>
                )}
                {isToday ? "Today" : label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};


