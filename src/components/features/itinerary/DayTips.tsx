"use client";

import { useState, useEffect, useMemo } from "react";
import type { ItineraryDay } from "@/types/itinerary";
import type { TravelGuidance } from "@/types/travelGuidance";
import { fetchDayGuidance, getCurrentSeason } from "@/lib/tips/guidanceService";

type DayTipsProps = {
  day: ItineraryDay;
  tripStartDate?: string;
  dayIndex: number;
  className?: string;
};

// Icon mapping for guidance types
const GUIDANCE_TYPE_ICONS: Record<string, string> = {
  etiquette: "🙏",
  practical: "💡",
  environmental: "🌿",
  seasonal: "🌸",
};

export function DayTips({ day, tripStartDate, dayIndex, className }: DayTipsProps) {
  const [tips, setTips] = useState<TravelGuidance[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
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
        const guidance = await fetchDayGuidance({
          categories: dayCategories,
          city: day.cityId,
          region: day.cityId, // Often same as city in our data
          season: getCurrentSeason(dayDate),
        });

        if (!cancelled) {
          // Limit to top 5 tips for the day
          setTips(guidance.slice(0, 5));
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

  // Don't render if no tips
  if (!isLoading && tips.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-xl border border-indigo-200 bg-indigo-50/50 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🇯🇵</span>
          <span className="text-sm font-semibold text-indigo-900">
            Travel Tips for Today
          </span>
          {!isLoading && (
            <span className="rounded-full bg-indigo-200/60 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
              {tips.length}
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-indigo-600 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-indigo-200/50 px-3 pb-3">
          {isLoading ? (
            <div className="py-2 text-center text-xs text-indigo-600">
              Loading tips...
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {tips.map((tip) => (
                <div
                  key={tip.id}
                  className="flex items-start gap-2 rounded-lg bg-white/70 p-2"
                >
                  <span className="shrink-0 text-base">
                    {tip.icon ?? GUIDANCE_TYPE_ICONS[tip.guidanceType] ?? "💡"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-indigo-900">
                      {tip.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-indigo-700/80">
                      {tip.summary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
