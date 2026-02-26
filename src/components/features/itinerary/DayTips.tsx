"use client";

import { useState, useEffect, useMemo } from "react";
import type { ItineraryDay } from "@/types/itinerary";
import type { TravelGuidance } from "@/types/travelGuidance";
import { fetchDayGuidance, getCurrentSeason } from "@/lib/tips/guidanceService";
import { getRegionForCity } from "@/data/regions";

type DayTipsProps = {
  day: ItineraryDay;
  tripStartDate?: string;
  dayIndex: number;
  className?: string;
  /** When true, renders just the tip items without the accordion wrapper */
  embedded?: boolean;
  /** Callback fired when tip count changes (for parent badge) */
  onTipCount?: (count: number) => void;
};

/** Minimal shape used for rendering — shared by static pro tips and DB tips. */
type DisplayTip = {
  id: string;
  title: string;
  summary: string;
  icon: string;
};

// Icon mapping for guidance types
const GUIDANCE_TYPE_ICONS: Record<string, string> = {
  etiquette: "🙏",
  practical: "💡",
  environmental: "🌿",
  seasonal: "🌸",
  accessibility: "♿",
  photography: "📸",
  budget: "💰",
  nightlife: "🌙",
  family: "👨‍👩‍👧",
  solo: "🎒",
  food_culture: "🍜",
  cultural_context: "📖",
};

const TRANSIT_MODES = new Set(["train", "subway", "bus", "tram", "ferry", "transit"]);

function toDisplayTip(tip: TravelGuidance): DisplayTip {
  return {
    id: tip.id,
    title: tip.title,
    summary: tip.summary,
    icon: tip.icon ?? GUIDANCE_TYPE_ICONS[tip.guidanceType] ?? "💡",
  };
}

export function DayTips({ day, tripStartDate, dayIndex, className, embedded, onTipCount }: DayTipsProps) {
  const [dbTips, setDbTips] = useState<TravelGuidance[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Extract unique categories from the day's activities
  const dayCategories = useMemo(() => {
    const categories = new Set<string>();
    for (const activity of day.activities ?? []) {
      if (activity.kind === "place" && activity.tags) {
        for (const tag of activity.tags) {
          categories.add(tag.toLowerCase());
        }
      }
    }
    return Array.from(categories);
  }, [day.activities]);

  // Calculate the date for this day
  const dayDate = useMemo(() => {
    if (tripStartDate) {
      try {
        const [year, month, dayNum] = tripStartDate.split("-").map(Number);
        if (year && month && dayNum) {
          const startDate = new Date(year, month - 1, dayNum);
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + dayIndex);
          return date;
        }
      } catch {
        // Invalid date
      }
    }
    return new Date();
  }, [tripStartDate, dayIndex]);

  // Fetch day-level tips
  useEffect(() => {
    let cancelled = false;

    async function loadTips() {
      setIsLoading(true);
      try {
        const regionId = day.cityId ? getRegionForCity(day.cityId) : undefined;
        const guidance = await fetchDayGuidance({
          categories: dayCategories,
          city: day.cityId,
          region: regionId,
          season: getCurrentSeason(dayDate),
        });

        if (!cancelled) {
          // Limit to top 5 tips for the day
          setDbTips(guidance.slice(0, 5));
        }
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadTips();

    return () => {
      cancelled = true;
    };
  }, [dayCategories, day.cityId, dayDate]);

  // Static pro tips shown once (Day 1 only)
  const proTips = useMemo<DisplayTip[]>(() => {
    if (dayIndex !== 0) return [];

    const hasTransit = (day.activities ?? []).some(
      (a) =>
        a.kind === "place" &&
        a.travelFromPrevious &&
        TRANSIT_MODES.has(a.travelFromPrevious.mode),
    );

    if (!hasTransit) return [];

    return [
      {
        id: "pro-ic-card",
        title: "Get an IC Card",
        summary:
          "A Suica or PASMO card works on trains, buses, and convenience stores across Japan. Load it at any station.",
        icon: "🚃",
      },
    ];
  }, [dayIndex, day.activities]);

  // Combined display list
  const allTips = useMemo<DisplayTip[]>(
    () => [...proTips, ...dbTips.map(toDisplayTip)],
    [proTips, dbTips],
  );

  // Report tip count to parent
  useEffect(() => {
    onTipCount?.(allTips.length);
  }, [allTips.length, onTipCount]);

  // Don't render if no tips
  if (!isLoading && allTips.length === 0) {
    return null;
  }

  const renderTipItems = () => {
    if (isLoading) {
      return (
        <div className="py-2 text-center text-xs text-stone">
          Loading tips...
        </div>
      );
    }
    return allTips.map((tip) => (
      <div
        key={tip.id}
        className="flex items-start gap-2 rounded-xl bg-background/70 p-2"
      >
        <span className="shrink-0 text-base">
          {tip.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">
            {tip.title}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-foreground-secondary">
            {tip.summary}
          </p>
        </div>
      </div>
    ));
  };

  // Embedded mode: just render the items without wrapper
  if (embedded) {
    return <>{renderTipItems()}</>;
  }

  return (
    <div className={`rounded-xl border border-brand-primary/20 bg-brand-primary/5 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{"\uD83C\uDDEF\uD83C\uDDF5"}</span>
          <span className="text-sm font-semibold text-foreground">
            Travel Tips for Today
          </span>
          {!isLoading && (
            <span className="rounded-full bg-brand-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-brand-primary">
              {allTips.length}
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-brand-primary transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-brand-primary/10 px-3 pb-3">
          <div className="mt-2 space-y-2">
            {renderTipItems()}
          </div>
        </div>
      )}
    </div>
  );
}
