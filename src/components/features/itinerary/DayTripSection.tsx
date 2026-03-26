"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DayTripSuggestion } from "@/types/dayTrips";

function formatTravelTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function categoryLabel(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Dashboard section showing day trip suggestions.
 * Renders inside TripConfidenceDashboard between "Days" and "Accessibility".
 */
export function DayTripSection({
  suggestions,
  onAcceptDayTrip,
  isAccepting,
}: {
  suggestions: DayTripSuggestion[];
  onAcceptDayTrip: (suggestion: DayTripSuggestion) => void;
  isAccepting: boolean;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="eyebrow-editorial">Day Trip Ideas</h3>
      <div className="space-y-2">
        {suggestions.map((s) => (
          <div key={s.id}>
            <div className="group rounded-lg border border-border bg-surface/30 p-3 transition hover:shadow-[var(--shadow-card)]">
              <div className="flex gap-3">
                {/* Thumbnail */}
                {s.image && (
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-canvas">
                    <img
                      src={s.image}
                      alt={s.targetLocationName}
                      className="h-full w-full object-cover transition group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  {/* Name + badges */}
                  <div className="flex items-start gap-1.5">
                    <p className="truncate text-sm font-medium text-foreground">
                      {s.targetLocationName}
                    </p>
                    {s.isUnescoSite && (
                      <span className="shrink-0 rounded bg-accent/10 px-1 py-px text-[10px] font-medium text-accent">
                        UNESCO
                      </span>
                    )}
                    {s.isHiddenGem && (
                      <span className="shrink-0 rounded bg-sage/10 px-1 py-px text-[10px] font-medium text-sage">
                        Hidden Gem
                      </span>
                    )}
                  </div>

                  {/* Meta line */}
                  <p className="mt-0.5 text-xs text-stone">
                    <span className="capitalize">{categoryLabel(s.category)}</span>
                    {" in "}
                    {s.targetCity}
                    {s.rating && (
                      <span className="ml-1.5">
                        {"  "}
                        <span className="text-foreground-secondary">{s.rating.toFixed(1)}</span>
                      </span>
                    )}
                  </p>

                  {/* Travel time */}
                  <p className="mt-1 text-xs text-foreground-secondary">
                    <svg className="mr-1 inline h-3 w-3 -translate-y-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    {formatTravelTime(s.travelMinutes)} from {s.baseCityName}
                    {s.nearbyCount > 0 && (
                      <span className="ml-1.5 text-stone">
                        + {s.nearbyCount} nearby {s.nearbyCount === 1 ? "spot" : "spots"}
                      </span>
                    )}
                  </p>

                  {/* Action */}
                  <div className="mt-2">
                    {confirmingId !== s.id ? (
                      <button
                        type="button"
                        onClick={() => setConfirmingId(s.id)}
                        className="rounded-md bg-sage/10 px-2.5 py-1 text-xs font-medium text-sage transition hover:bg-sage/20 active:scale-[0.98]"
                      >
                        Swap a day for this trip
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Inline confirmation */}
            <AnimatePresence>
              {confirmingId === s.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1 rounded-lg border border-sage/20 bg-sage/5 p-3">
                    <p className="text-sm text-foreground">
                      Replace a day in {s.baseCityName} with a day trip to {s.targetLocationName}?
                    </p>
                    <p className="mt-1 text-xs text-stone">
                      {formatTravelTime(s.travelMinutes)} each way by train. Your original day can be restored with undo.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onAcceptDayTrip(s);
                          setConfirmingId(null);
                        }}
                        disabled={isAccepting}
                        className="rounded-md bg-sage px-3 py-1 text-xs font-medium text-white transition hover:bg-sage/90 active:scale-[0.98] disabled:opacity-50"
                      >
                        {isAccepting ? "Planning..." : "Swap Day"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="rounded-md px-3 py-1 text-xs font-medium text-stone transition hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
