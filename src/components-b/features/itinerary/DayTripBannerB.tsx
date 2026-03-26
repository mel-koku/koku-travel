"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import type { DayTripSuggestion } from "@/types/dayTrips";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

/**
 * Dismissible banner surfacing day trip suggestions on the B itinerary timeline.
 * Dismiss state persists in localStorage per trip.
 */
export function DayTripBannerB({
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
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* noop */
    }
  }

  const highlight = suggestions[0]!;
  const moreCount = suggestions.length - 1;
  const subtitle =
    moreCount > 0
      ? `${highlight.targetLocationName} and ${moreCount} more within day-trip range.`
      : `${highlight.targetLocationName} is within day-trip range.`;

  return (
    <motion.div
      data-day-trip-banner
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: bEase }}
      className="mb-3 overflow-hidden rounded-2xl"
      style={{
        backgroundColor: "color-mix(in srgb, var(--success) 6%, transparent)",
        border: "1px solid color-mix(in srgb, var(--success) 15%, transparent)",
      }}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <MapPin
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: "var(--success)" }}
          />
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {suggestions.length} day trip{" "}
              {suggestions.length === 1 ? "idea" : "ideas"} near your route
            </p>
            <p
              className="mt-0.5 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              {subtitle}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {citySummary.map(({ id, name, count }) => (
                <span
                  key={id}
                  className="rounded-lg px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--success) 10%, transparent)",
                    color: "var(--success)",
                  }}
                >
                  From {name} ({count})
                </span>
              ))}
              <button
                type="button"
                onClick={onViewDashboard}
                className="ml-1 rounded-lg px-2.5 py-0.5 text-xs font-medium transition-colors duration-200 hover:opacity-80 active:scale-[0.98]"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--success) 18%, transparent)",
                  color: "var(--success)",
                }}
              >
                View all
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-xl p-1 transition-colors duration-200 hover:bg-[var(--surface)]"
          style={{ color: "var(--muted-foreground)" }}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
