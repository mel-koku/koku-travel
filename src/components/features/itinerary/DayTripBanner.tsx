"use client";

import { useState } from "react";
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
    // localStorage.getItem can throw in iOS Safari Private mode.
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  if (suggestions.length === 0 || dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    try { localStorage.setItem(storageKey, "1"); } catch { /* noop */ }
  }

  return (
    <motion.div
      data-day-trip-banner
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden rounded-md bg-surface px-3 py-1.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <svg className="h-3.5 w-3.5 shrink-0 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          <p className="truncate text-xs text-foreground-secondary">
            <span className="font-medium text-foreground">
              {suggestions.length} day trip {suggestions.length === 1 ? "idea" : "ideas"}
            </span>
            {" near your route"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onViewDashboard}
            className="rounded-md px-2 py-0.5 text-[11px] font-medium text-sage transition hover:bg-sage/10"
          >
            View
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 rounded p-0.5 text-stone transition hover:text-foreground"
            aria-label="Dismiss"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
