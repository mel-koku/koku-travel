"use client";

import { useMemo, useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

type DaySelectorBProps = {
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
 * Returns -1 if trip hasn't started or today is past the last day.
 */
function getTodayIndex(
  tripStartDate: string | undefined,
  totalDays: number
): number {
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

export const DaySelectorB = ({
  totalDays,
  selected,
  onChange,
  labels = [],
  tripStartDate,
  autoScrollToToday = true,
}: DaySelectorBProps) => {
  const hasAutoScrolled = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const todayIndex = useMemo(
    () => getTodayIndex(tripStartDate, totalDays),
    [tripStartDate, totalDays]
  );

  const days = useMemo(() => {
    return Array.from({ length: totalDays }).map((_, index) => {
      // Build a short date label (e.g. "Feb 27") when tripStartDate is available
      let dateStr: string | null = null;
      if (tripStartDate) {
        try {
          const [y, m, d] = tripStartDate.split("-").map(Number);
          if (y && m && d && !isNaN(y) && !isNaN(m) && !isNaN(d)) {
            const dt = new Date(y, m - 1, d);
            dt.setDate(dt.getDate() + index);
            dateStr = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }
        } catch { /* ignore */ }
      }

      // Extract city from label format "Day N (City)"
      const cityMatch = labels[index]?.match(/\(([^)]+)\)/);
      const city = cityMatch ? cityMatch[1] : null;

      const displayLabel = dateStr
        ? city ? `${dateStr} (${city})` : dateStr
        : labels[index] ?? `Day ${index + 1}`;

      return {
        index,
        label: displayLabel,
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

  // Wheel → horizontal scroll
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return; // already horizontal
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const atStart = scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = scrollLeft >= scrollWidth - clientWidth - 1 && e.deltaY > 0;
      if (atStart || atEnd) return; // let page scroll
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Drag-to-scroll
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollContainerRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, scrollLeft: el.scrollLeft };
    el.setPointerCapture(e.pointerId);
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const dx = e.clientX - dragStart.current.x;
    el.scrollLeft = dragStart.current.scrollLeft - dx;
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
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
      <p className="text-sm text-[var(--muted-foreground)]">
        No days available yet for this itinerary.
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
          className="flex gap-2 overflow-x-auto overscroll-contain snap-x snap-mandatory scrollbar-hide py-1 px-1 cursor-grab"
          role="tablist"
          aria-label="Day selector"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {days.map(({ index, label, isToday }) => {
            const isActive = index === selected;
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
                  "relative flex-shrink-0 snap-start rounded-lg px-3 text-xs font-medium whitespace-nowrap transition-colors duration-200",
                  "min-h-[44px] flex items-center justify-center",
                  "active:scale-[0.98]",
                  isActive
                    ? "bg-[var(--primary)] text-[var(--card)]"
                    : "bg-white text-[var(--foreground)] hover:bg-[var(--surface)]"
                )}
              >
                <span className="flex items-center gap-1.5">
                  {label}
                  {isToday && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold",
                        isActive
                          ? "text-[color-mix(in_srgb,var(--card)_80%,transparent)]"
                          : "text-[var(--primary)]"
                      )}
                    >
                      (Today)
                    </span>
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
                  background: "linear-gradient(to right, transparent, var(--background) 60%)",
                }}
              >
                <ChevronRight
                  className="h-4 w-4 animate-pulse"
                  style={{ color: "var(--muted-foreground)" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Horizontal scroll indicator bar */}
      {showScrollBar && (
        <div className="mx-1 h-1 rounded-full bg-[var(--border)]" aria-hidden>
          <motion.div
            className="h-full rounded-full"
            style={{
              width: `${scrollInfo.thumbRatio * 100}%`,
              marginLeft: `${scrollInfo.ratio * (1 - scrollInfo.thumbRatio) * 100}%`,
              backgroundColor: "color-mix(in srgb, var(--primary) 40%, transparent)",
            }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </div>
      )}
    </div>
  );
};
