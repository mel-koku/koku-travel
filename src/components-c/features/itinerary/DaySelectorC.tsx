"use client";

import { useMemo, useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";

type DaySelectorCProps = {
  totalDays: number;
  selected: number;
  onChange: (idx: number) => void;
  labels?: string[];
  tripStartDate?: string;
  autoScrollToToday?: boolean;
};

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

export const DaySelectorC = ({
  totalDays,
  selected,
  onChange,
  labels = [],
  tripStartDate,
  autoScrollToToday = true,
}: DaySelectorCProps) => {
  const hasAutoScrolled = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const todayIndex = useMemo(
    () => getTodayIndex(tripStartDate, totalDays),
    [tripStartDate, totalDays]
  );

  const days = useMemo(() => {
    return Array.from({ length: totalDays }).map((_, index) => {
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
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollInfo = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflowWidth = scrollWidth - clientWidth;
    setCanScrollRight(overflowWidth > 0 && scrollLeft < overflowWidth - 2);
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

  if (days.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        No days available yet for this itinerary.
      </p>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollContainerRef}
        data-lenis-prevent
        className="flex overflow-x-auto overscroll-contain snap-x snap-mandatory scrollbar-hide"
        role="tablist"
        aria-label="Day selector"
        style={{ borderBottom: "1px solid var(--border)" }}
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
              className="relative flex-shrink-0 snap-start px-4 text-[11px] font-bold uppercase tracking-[0.15em] whitespace-nowrap transition-colors duration-200 min-h-[44px] flex items-center justify-center active:scale-[0.98]"
              style={{
                color: isActive ? "var(--primary)" : "var(--muted-foreground)",
                backgroundColor: isActive
                  ? "color-mix(in srgb, var(--primary) 5%, transparent)"
                  : "transparent",
              }}
            >
              <span className="flex items-center gap-1.5">
                {label}
                {isToday && (
                  <span
                    className="text-[9px] font-bold"
                    style={{
                      color: isActive ? "var(--primary)" : "var(--muted-foreground)",
                    }}
                  >
                    (Today)
                  </span>
                )}
              </span>
              {/* Active indicator: vermillion bottom border */}
              {isActive && (
                <motion.div
                  layoutId="day-indicator-c"
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ backgroundColor: "var(--primary)" }}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                />
              )}
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
  );
};
