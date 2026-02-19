"use client";

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { durationFast, easeReveal } from "@/lib/motion";

type DayHealthLevel = "good" | "fair" | "poor";

type DaySelectorProps = {
  totalDays: number;
  selected: number;
  onChange: (idx: number) => void;
  labels?: string[];
  /** Trip start date in ISO format (yyyy-mm-dd) */
  tripStartDate?: string;
  /** Auto-scroll to today on mount */
  autoScrollToToday?: boolean;
  /** Visual variant — "default" for light bg, "dark" for charcoal banner */
  variant?: "default" | "dark";
  /** Per-day health levels for indicator dots (optional) */
  dayHealthLevels?: DayHealthLevel[];
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
  dayHealthLevels,
}: DaySelectorProps) => {
  const hasAutoScrolled = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const todayIndex = useMemo(
    () => getTodayIndex(tripStartDate, totalDays),
    [tripStartDate, totalDays]
  );

  const days = useMemo(() => {
    const monthDayFormatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    });
    const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
    });

    return Array.from({ length: totalDays }).map((_, index) => {
      let dateLabel = `Day ${index + 1}`;

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

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  // Scroll selected item into view when opening
  useEffect(() => {
    if (isOpen && listRef.current) {
      const selectedEl = listRef.current.querySelector("[data-selected]");
      selectedEl?.scrollIntoView({ block: "nearest" });
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (index: number) => {
      onChange(index);
      setIsOpen(false);
    },
    [onChange]
  );

  const selectedDay = days[selected];

  if (days.length === 0) {
    return (
      <p className="text-sm text-stone">
        No days available yet for this itinerary.
      </p>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-base font-medium text-foreground shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select day"
      >
        <span>
          {selectedDay?.label}
          {selectedDay?.isToday && (
            <span className="ml-2 text-xs text-sage">(Today)</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-stone transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: durationFast, ease: easeReveal }}
            role="listbox"
            data-lenis-prevent
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto overscroll-contain rounded-xl border border-border bg-popover shadow-lg"
          >
            {days.map(({ index, label, isToday }) => {
              const isSelected = index === selected;
              const healthLevel = dayHealthLevels?.[index];
              return (
                <button
                  key={index}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-selected={isSelected ? "" : undefined}
                  onClick={() => handleSelect(index)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                    isSelected
                      ? "bg-brand-primary/10 text-brand-primary font-medium"
                      : "text-popover-foreground hover:bg-surface"
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  <span className={!isSelected ? "pl-5.5" : ""}>
                    {label}
                    {isToday && (
                      <span className="ml-2 text-xs text-sage">(Today)</span>
                    )}
                  </span>
                  {healthLevel && healthLevel !== "good" && (
                    <span
                      className={cn(
                        "ml-auto h-2 w-2 shrink-0 rounded-full",
                        healthLevel === "fair" ? "bg-warning" : "bg-error"
                      )}
                    />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
