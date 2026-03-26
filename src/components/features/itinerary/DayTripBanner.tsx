"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { DayTripSuggestion } from "@/types/dayTrips";

/**
 * Dismissible banner that proactively surfaces day trip suggestions.
 * Shown at the top of the itinerary timeline, after SeasonalBanner.
 * Dismiss state persists in localStorage per trip.
 */
export function DayTripBanner({
  suggestions,
  tripId,
  onViewDashboard,
}: {
  suggestions: DayTripSuggestion[];
  tripId: string;
  onViewDashboard: () => void;
}) {
  const storageKey = `daytrip-banner-dismissed-${tripId}`;
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) === "1";
  });

  // Group by base city
  const citySummary = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const s of suggestions) {
      const entry = map.get(s.baseCityId) || { name: s.baseCityName, count: 0 };
      entry.count++;
      map.set(s.baseCityId, entry);
    }
    return [...map.entries()].map(([id, { name, count }]) => ({ id, name, count }));
  }, [suggestions]);

  if (suggestions.length === 0 || dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    try { localStorage.setItem(storageKey, "1"); } catch { /* noop */ }
  }

  // Pick a highlight name for the subtitle
  const highlight = suggestions[0]!;
  const moreCount = suggestions.length - 1;
  const subtitle = moreCount > 0
    ? `${highlight.targetLocationName} and ${moreCount} more within day-trip range.`
    : `${highlight.targetLocationName} is within day-trip range.`;

  return (
    <motion.div
      data-day-trip-banner
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mx-4 mt-3 overflow-hidden rounded-lg border border-sage/20 bg-sage/5 px-4 py-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {/* MapPin icon */}
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-foreground">
              {suggestions.length} day trip {suggestions.length === 1 ? "idea" : "ideas"} near your route
            </p>
            <p className="mt-0.5 text-xs text-stone">
              {subtitle}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {citySummary.map(({ id, name, count }) => (
                <span
                  key={id}
                  className="rounded-md bg-sage/10 px-2 py-0.5 text-xs font-medium text-sage"
                >
                  From {name} ({count})
                </span>
              ))}
              <button
                type="button"
                onClick={onViewDashboard}
                className="ml-1 rounded-md bg-sage/20 px-2.5 py-0.5 text-xs font-medium text-sage transition hover:bg-sage/30"
              >
                View all
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1 text-stone transition hover:text-foreground"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
