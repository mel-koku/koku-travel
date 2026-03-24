"use client";

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

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
  /** Visual variant (kept for backward compat, unused) */
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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const todayIndex = useMemo(
    () => getTodayIndex(tripStartDate, totalDays),
    [tripStartDate, totalDays]
  );

  const days = useMemo(() => {
    const monthDayFormatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    });

    return Array.from({ length: totalDays }).map((_, index) => {
      let dateStr = `Day ${index + 1}`;

      if (tripStartDate) {
        try {
          const [year, month, day] = tripStartDate.split("-").map(Number);
          if (year && month && day) {
            const date = new Date(year, month - 1, day);
            date.setDate(date.getDate() + index);
            dateStr = monthDayFormatter.format(date);
          }
        } catch {
          // Fall back to Day X format
        }
      }

      // Extract city from label format "... (City)"
      const cityMatch = labels[index]?.match(/\(([^)]+)\)/);
      const city = cityMatch ? cityMatch[1] : null;

      return {
        index,
        label: city ? `${dateStr} (${city})` : dateStr,
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
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll selected item into view when dropdown opens
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open && listRef.current) {
      const activeEl = listRef.current.querySelector("[data-active='true']");
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [open]);

  const handleSelect = useCallback(
    (idx: number) => {
      onChange(idx);
      setOpen(false);
    },
    [onChange]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(selected + 1, days.length - 1);
        onChange(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(selected - 1, 0);
        onChange(prev);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(false);
      }
    },
    [open, selected, days.length, onChange]
  );

  if (days.length === 0) {
    return (
      <p className="text-sm text-stone">
        No days in this itinerary.
      </p>
    );
  }

  const selectedDay = days[selected];
  const selectedHealthLevel = dayHealthLevels?.[selected];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className="flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface active:scale-[0.98]"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select day"
      >
        <span className="whitespace-nowrap">
          {selectedDay?.label}
          {selectedDay?.isToday && (
            <span className="ml-1 text-[10px] font-semibold text-sage">(Today)</span>
          )}
        </span>
        {selectedHealthLevel && selectedHealthLevel !== "good" && (
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              selectedHealthLevel === "fair" ? "bg-warning" : "bg-error"
            )}
          />
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 text-stone transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label="Day selector"
          className="absolute left-0 top-full z-30 mt-1 max-h-64 w-56 overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface py-1 shadow-[var(--shadow-elevated)]"
          onKeyDown={handleKeyDown}
        >
          {days.map(({ index, label, isToday }) => {
            const isActive = index === selected;
            const healthLevel = dayHealthLevels?.[index];
            return (
              <button
                key={index}
                type="button"
                role="option"
                aria-selected={isActive}
                data-active={isActive}
                onClick={() => handleSelect(index)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                  isActive
                    ? "bg-brand-primary/10 font-medium text-brand-primary"
                    : "text-foreground hover:bg-background"
                )}
              >
                <span className="min-w-0 flex-1">
                  {label}
                  {isToday && (
                    <span className={cn("ml-1 text-[10px] font-semibold", isActive ? "text-brand-primary/70" : "text-sage")}>
                      (Today)
                    </span>
                  )}
                </span>
                {healthLevel && healthLevel !== "good" && (
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      healthLevel === "fair" ? "bg-warning" : "bg-error"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
