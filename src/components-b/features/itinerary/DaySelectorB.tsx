"use client";

import { useMemo, useEffect, useRef, useCallback, useState } from "react";
import { motion } from "framer-motion";
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

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

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
      const baseLabel = labels[index] ?? `Day ${index + 1}`;

      // If no label was provided, construct "Day N" ourselves
      const displayLabel = labels[index] ? baseLabel : `Day ${index + 1}`;

      return {
        index,
        label: displayLabel,
        isToday: index === todayIndex,
      };
    });
  }, [labels, totalDays, todayIndex]);

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

  const updateScrollInfo = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflowWidth = scrollWidth - clientWidth;
    if (overflowWidth <= 0) {
      setScrollInfo({ ratio: 0, thumbRatio: 1 });
    } else {
      setScrollInfo({
        ratio: scrollLeft / overflowWidth,
        thumbRatio: clientWidth / scrollWidth,
      });
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
      <div
        ref={scrollContainerRef}
        data-lenis-prevent
        className="flex gap-2 overflow-x-auto overscroll-contain snap-x snap-mandatory scrollbar-hide py-1 px-1"
        role="tablist"
        aria-label="Day selector"
      >
        {days.map(({ index, label, isToday }) => {
          const isActive = index === selected;
          return (
            <motion.button
              key={index}
              ref={(el) => setPillRef(index, el)}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`${label}${isToday ? " (Today)" : ""}`}
              onClick={() => onChange(index)}
              className={cn(
                "relative flex-shrink-0 snap-start rounded-lg px-3 text-xs font-medium whitespace-nowrap transition-colors",
                "min-h-[34px] flex items-center justify-center",
                "active:scale-[0.98]",
                isActive
                  ? "bg-[var(--primary)] text-white shadow-[var(--shadow-sm)]"
                  : "bg-white text-[var(--foreground)] hover:bg-[var(--surface)]"
              )}
              animate={
                isActive
                  ? { scale: 1 }
                  : { scale: 1 }
              }
              whileTap={{ scale: 0.98 }}
              transition={
                isActive
                  ? { type: "spring", stiffness: 400, damping: 30 }
                  : { duration: 0.2, ease: bEase }
              }
            >
              <span className="flex items-center gap-1.5">
                {label}
                {isToday && (
                  <span
                    className={cn(
                      "text-[10px] font-semibold",
                      isActive
                        ? "text-white/80"
                        : "text-[var(--primary)]"
                    )}
                  >
                    (Today)
                  </span>
                )}
              </span>

            </motion.button>
          );
        })}
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
