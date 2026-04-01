"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DayTripSuggestion } from "@/types/dayTrips";
import type { ItineraryDay } from "@/types/itinerary";
import type { Location } from "@/types/location";
import dynamic from "next/dynamic";

const LocationExpanded = dynamic(
  () => import("@/components/features/places/LocationExpanded").then((m) => ({ default: m.LocationExpanded })),
  { ssr: false },
);

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
  days,
  onAcceptDayTrip,
  isAccepting,
}: {
  suggestions: DayTripSuggestion[];
  days: ItineraryDay[];
  onAcceptDayTrip: (suggestion: DayTripSuggestion, dayIndex: number) => void;
  isAccepting: boolean;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(null);
  const [loadingLocationId, setLoadingLocationId] = useState<string | null>(null);

  const handleViewDetails = useCallback(async (suggestion: DayTripSuggestion) => {
    setLoadingLocationId(suggestion.targetLocationId);
    try {
      const res = await fetch(`/api/locations/${suggestion.targetLocationId}`);
      if (!res.ok) return;
      const data = await res.json();
      setExpandedLocation(data.location ?? data);
    } catch {
      // silently fail
    } finally {
      setLoadingLocationId(null);
    }
  }, []);

  // Build eligible days per base city (non-day-trip days in that city)
  const eligibleDaysByCity = useMemo(() => {
    const map = new Map<string, Array<{ index: number; label: string }>>();
    days.forEach((day, i) => {
      if (!day.cityId || day.isDayTrip) return;
      const list = map.get(day.cityId) || [];
      list.push({ index: i, label: `Day ${i + 1}` });
      map.set(day.cityId, list);
    });
    return map;
  }, [days]);

  if (suggestions.length === 0) return null;

  function handleStartConfirm(suggestion: DayTripSuggestion) {
    setConfirmingId(suggestion.id);
    // Default to last eligible day in the base city
    const eligible = eligibleDaysByCity.get(suggestion.baseCityId) || [];
    setSelectedDayIndex(eligible.length > 0 ? eligible[eligible.length - 1]!.index : null);
  }

  return (
    <div className="space-y-2">
      <h3 className="eyebrow-editorial">Day Trip Ideas</h3>
      <div className="space-y-2">
        {suggestions.map((s) => {
          const eligible = eligibleDaysByCity.get(s.baseCityId) || [];

          return (
            <div key={s.id}>
              <div className="group rounded-lg border border-border bg-surface/30 p-3 transition hover:shadow-[var(--shadow-card)]">
                <div className="flex gap-3">
                  {/* Thumbnail */}
                  {s.image && (
                    <button
                      type="button"
                      onClick={() => handleViewDetails(s)}
                      className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-canvas"
                    >
                      <img
                        src={s.image}
                        alt={s.targetLocationName}
                        className="h-full w-full object-cover transition group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    </button>
                  )}

                  <div className="min-w-0 flex-1">
                    {/* Name + badges */}
                    <div className="flex items-start gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleViewDetails(s)}
                        className="truncate text-sm font-medium text-foreground hover:text-brand-primary transition-colors text-left"
                      >
                        {loadingLocationId === s.targetLocationId ? "Loading..." : s.targetLocationName}
                      </button>
                      {s.isUnescoSite && (
                        <span className="shrink-0 rounded bg-accent/10 px-1 py-px text-[10px] font-medium text-accent">
                          UNESCO
                        </span>
                      )}
                      {s.isHiddenGem && (
                        <span className="shrink-0 rounded bg-sage/10 px-1 py-px text-[10px] font-medium text-sage">
                          Local Pick
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
                      {confirmingId !== s.id && eligible.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleStartConfirm(s)}
                          className="rounded-md bg-sage/10 px-2.5 py-1 text-xs font-medium text-sage transition hover:bg-sage/20 active:scale-[0.98]"
                        >
                          Swap a day for this trip
                        </button>
                      ) : confirmingId !== s.id && eligible.length === 0 ? (
                        <p className="text-xs text-stone">No available days in {s.baseCityName}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inline confirmation with day picker */}
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

                      {/* Day picker */}
                      {eligible.length > 1 && (
                        <div className="mt-2 flex items-center gap-2">
                          <label htmlFor={`day-picker-${s.id}`} className="text-xs text-stone">
                            Which day:
                          </label>
                          <select
                            id={`day-picker-${s.id}`}
                            value={selectedDayIndex ?? ""}
                            onChange={(e) => setSelectedDayIndex(Number(e.target.value))}
                            className="rounded-md border border-border bg-white px-2 py-1 text-xs text-foreground"
                          >
                            {eligible.map((d) => (
                              <option key={d.index} value={d.index}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <p className="mt-1 text-xs text-stone">
                        {formatTravelTime(s.travelMinutes)} each way by train. Undo with Cmd+Z to restore the original day.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedDayIndex != null) {
                              onAcceptDayTrip(s, selectedDayIndex);
                            }
                            setConfirmingId(null);
                          }}
                          disabled={isAccepting || selectedDayIndex == null}
                          className="rounded-md bg-sage px-3 py-1 text-xs font-medium text-white transition hover:bg-sage/90 active:scale-[0.98] disabled:opacity-50"
                        >
                          {isAccepting ? "Planning..." : `Swap ${eligible.length === 1 ? eligible[0]!.label : `Day ${(selectedDayIndex ?? 0) + 1}`}`}
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
          );
        })}
      </div>

      {/* Location detail slide-in */}
      <AnimatePresence>
        {expandedLocation && (
          <LocationExpanded
            location={expandedLocation}
            onClose={() => setExpandedLocation(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
