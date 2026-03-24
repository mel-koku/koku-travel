"use client";

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

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

  // Scroll active pill into view
  useEffect(() => {
    const pill = pillRefs.current.get(selected);
    if (pill) {
      pill.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selected]);

  const setPillRef = useCallback(
    (index: number, el: HTMLButtonElement | null) => {
      if (el) {
        pillRefs.current.set(index, el);
      } else {
        pillRefs.current.delete(index);
      }
    },
    []
  );

  // Scroll indicator state
  const [scrollInfo, setScrollInfo] = useState({ ratio: 0, thumbRatio: 1 });
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollInfo = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflowWidth = scrollWidth - clientWidth;
    if (overflowWidth <= 0) {
      setScrollInfo({ ratio: 0, thumbRatio: 1 });
      setCanScrollRight(false);
    } else {
      setScrollInfo({
        ratio: scrollLeft / overflowWidth,
        thumbRatio: clientWidth / scrollWidth,
      });
      setCanScrollRight(scrollLeft < overflowWidth - 2);
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    updateScrollInfo();
    el.addEventListener("scroll", updateScrollInfo, { passive: true });
    const ro = new ResizeObserver(updateScrollInfo);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollInfo);
      ro.disconnect();
    };
  }, [updateScrollInfo, days.length]);

  // Wheel to horizontal scroll
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const atStart = scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = scrollLeft >= scrollWidth - clientWidth - 1 && e.deltaY > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Drag-to-scroll
  const isDragging = useRef(false);
  const isPending = useRef(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0, pointerId: 0 });
  const DRAG_THRESHOLD = 5;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollContainerRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    isPending.current = true;
    isDragging.current = false;
    dragStart.current = { x: e.clientX, scrollLeft: el.scrollLeft, pointerId: e.pointerId };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const el = scrollContainerRef.current;
    if (!el) return;

    if (isPending.current && !isDragging.current) {
      const dx = Math.abs(e.clientX - dragStart.current.x);
      if (dx >= DRAG_THRESHOLD) {
        isDragging.current = true;
        isPending.current = false;
        el.setPointerCapture(dragStart.current.pointerId);
        el.style.cursor = "grabbing";
        el.style.userSelect = "none";
      }
    }

    if (isDragging.current) {
      const dx = e.clientX - dragStart.current.x;
      el.scrollLeft = dragStart.current.scrollLeft - dx;
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    isPending.current = false;
    if (!isDragging.current) return;
    isDragging.current = false;
    const el = scrollContainerRef.current;
    if (!el) return;
    el.releasePointerCapture(e.pointerId);
    el.style.cursor = "";
    el.style.userSelect = "";
  }, []);

  if (days.length === 0) {
    return (
      <p className="text-sm text-stone">
        No days in this itinerary.
      </p>
    );
  }

  const showScrollBar = scrollInfo.thumbRatio < 1;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <div
          ref={scrollContainerRef}
          data-lenis-prevent
          className="flex gap-1.5 overflow-x-auto overscroll-contain snap-x snap-mandatory scrollbar-hide py-0.5 px-1 cursor-grab"
          role="tablist"
          aria-label="Day selector"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {days.map(({ index, label, isToday }) => {
            const isActive = index === selected;
            const healthLevel = dayHealthLevels?.[index];
            return (
              <button
                key={index}
                ref={(el) => setPillRef(index, el)}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`${label}${isToday ? " (Today)" : ""}`}
                onClick={() => onChange(index)}
                className={cn(
                  "relative flex-shrink-0 snap-start rounded-lg px-2.5 text-xs font-medium whitespace-nowrap transition-colors duration-200",
                  "min-h-[36px] flex items-center justify-center",
                  "active:scale-[0.98]",
                  isActive
                    ? "bg-brand-primary text-white"
                    : "bg-surface/60 border border-border/50 text-foreground hover:bg-surface"
                )}
              >
                <span className="flex items-center gap-1.5">
                  {label}
                  {isToday && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold",
                        isActive ? "text-white/80" : "text-sage"
                      )}
                    >
                      (Today)
                    </span>
                  )}
                  {healthLevel && healthLevel !== "good" && (
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        healthLevel === "fair" ? "bg-warning" : "bg-error"
                      )}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right-edge scroll indicator */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute top-0 right-0 bottom-0 flex items-center"
              aria-hidden
            >
              <div
                className="flex h-full items-center pl-6 pr-1"
                style={{
                  background: "linear-gradient(to right, transparent, var(--background, #1a1714) 60%)",
                }}
              >
                <ChevronRight className="h-4 w-4 animate-pulse text-stone" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Horizontal scroll indicator bar */}
      {showScrollBar && (
        <div className="mx-1 h-1 rounded-full bg-border" aria-hidden>
          <motion.div
            className="h-full rounded-full bg-brand-primary/40"
            style={{
              width: `${scrollInfo.thumbRatio * 100}%`,
              marginLeft: `${scrollInfo.ratio * (1 - scrollInfo.thumbRatio) * 100}%`,
            }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </div>
      )}
    </div>
  );
};
