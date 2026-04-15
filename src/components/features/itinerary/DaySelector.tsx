"use client";

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { buildDayLabel } from "@/lib/itinerary/dayLabel";

/** Track whether the scrollable list can scroll further down */
function useCanScrollDown(ref: React.RefObject<HTMLDivElement | null>, open: boolean) {
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!open || !el) {
      setCanScroll(false);
      return;
    }

    const check = () => {
      setCanScroll(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    };

    check();
    el.addEventListener("scroll", check, { passive: true });
    return () => el.removeEventListener("scroll", check);
  }, [ref, open]);

  return canScroll;
}

type DayHealthLevel = "good" | "fair" | "poor";

type DaySelectorProps = {
  totalDays: number;
  selected: number;
  onChange: (idx: number) => void;
  labels?: string[];
  /** City IDs per day for label generation */
  cityIds?: (string | undefined)[];
  /** Trip start date in ISO format (yyyy-mm-dd) */
  tripStartDate?: string;
  /** Auto-scroll to today on mount */
  autoScrollToToday?: boolean;
  /** Visual variant (kept for backward compat, unused) */
  variant?: "default" | "dark";
  /** Per-day health levels for indicator dots (optional) */
  dayHealthLevels?: DayHealthLevel[];
  /** Indices of days that are locked (paywalled) */
  lockedDayIndices?: Set<number>;
  /** Called when a locked day is clicked (overrides onChange for those indices) */
  onLockedClick?: (index: number) => void;
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
  cityIds,
  tripStartDate,
  autoScrollToToday = true,
  dayHealthLevels,
  lockedDayIndices,
  onLockedClick,
}: DaySelectorProps) => {
  const hasAutoScrolled = useRef(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const todayIndex = useMemo(
    () => getTodayIndex(tripStartDate, totalDays),
    [tripStartDate, totalDays]
  );

  const days = useMemo(() => {
    return Array.from({ length: totalDays }).map((_, index) => {
      // Use cityIds if provided, otherwise extract from legacy labels
      const cityId = cityIds?.[index]
        ?? (() => {
          const cityMatch = labels[index]?.match(/\(([^)]+)\)/);
          return cityMatch ? cityMatch[1]?.toLowerCase() : undefined;
        })();

      return {
        index,
        label: buildDayLabel(index, { tripStartDate, cityId }),
        isToday: index === todayIndex,
      };
    });
  }, [labels, cityIds, totalDays, todayIndex, tripStartDate]);

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
  const canScrollDown = useCanScrollDown(listRef, open);

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
      if (lockedDayIndices?.has(idx) && onLockedClick) {
        onLockedClick(idx);
        setOpen(false);
        return;
      }
      onChange(idx);
      setOpen(false);
    },
    [onChange, lockedDayIndices, onLockedClick]
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
        className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface active:scale-[0.98]"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Select day, currently day ${selected + 1} of ${days.length}`}
      >
        <span className="font-mono text-[10px] uppercase tracking-wide text-stone">
          Day {selected + 1}/{days.length}
        </span>
        <span className="h-3 w-px bg-border" aria-hidden />
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
        <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-lg border border-border bg-surface shadow-[var(--shadow-elevated)]">
          <div
            ref={listRef}
            role="listbox"
            aria-label="Day selector"
            data-lenis-prevent
            className="max-h-64 overflow-y-auto overscroll-contain py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                    {lockedDayIndices?.has(index) && (
                      <svg className="ml-1 inline h-3 w-3 text-foreground-secondary" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1a4 4 0 0 0-4 4v2H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1V5a4 4 0 0 0-4-4zm2 6H6V5a2 2 0 1 1 4 0v2z" />
                      </svg>
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

          {/* "More below" arrow indicator */}
          {canScrollDown && (
            <div
              className="flex justify-center border-t border-border/60 py-1 text-stone"
              aria-hidden
              onClick={() => listRef.current?.scrollBy({ top: 120, behavior: "smooth" })}
            >
              <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
