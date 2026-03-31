"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { DayTripSuggestion } from "@/types/dayTrips";
import type { ItineraryDay } from "@/types/itinerary";
import type { Location } from "@/types/location";
import { bEase } from "@/lib/variant-b-motion";

const PlaceDetailPanelB = dynamic(
  () =>
    import("@b/features/places/PlaceDetailPanelB").then((m) => ({
      default: m.PlaceDetailPanelB,
    })),
  { ssr: false },
);


function formatTravelTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function categoryLabel(category: string): string {
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Dashboard section showing day trip suggestions in B variant.
 * Renders inside TripConfidenceDashboardB between "Days" and "Accessibility".
 */
export function DayTripSectionB({
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
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(
    null,
  );
  const [loadingLocationId, setLoadingLocationId] = useState<string | null>(
    null,
  );

  const handleViewDetails = useCallback(
    async (suggestion: DayTripSuggestion) => {
      setLoadingLocationId(suggestion.targetLocationId);
      try {
        const res = await fetch(
          `/api/locations/${suggestion.targetLocationId}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        setExpandedLocation(data.location ?? data);
      } catch {
        // silently fail
      } finally {
        setLoadingLocationId(null);
      }
    },
    [],
  );

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
    const eligible = eligibleDaysByCity.get(suggestion.baseCityId) || [];
    setSelectedDayIndex(
      eligible.length > 0 ? eligible[eligible.length - 1]!.index : null,
    );
  }

  return (
    <div className="space-y-2">
      <h3
        className="text-xs font-semibold uppercase tracking-[0.15em]"
        style={{ color: "var(--muted-foreground)" }}
      >
        Day Trip Ideas
      </h3>
      <div className="space-y-2">
        {suggestions.map((s) => {
          const eligible = eligibleDaysByCity.get(s.baseCityId) || [];

          return (
            <div key={s.id}>
              <div
                className="group overflow-hidden rounded-2xl transition-shadow duration-200"
                style={{
                  backgroundColor: "var(--card)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div className="flex gap-3 p-3">
                  {/* Thumbnail */}
                  {s.image && (
                    <button
                      type="button"
                      onClick={() => handleViewDetails(s)}
                      className="h-14 w-14 shrink-0 overflow-hidden rounded-xl"
                      style={{ backgroundColor: "var(--surface)" }}
                    >
                      <Image
                        src={s.image}
                        alt={s.targetLocationName}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
                      />
                    </button>
                  )}

                  <div className="min-w-0 flex-1">
                    {/* Name + badges */}
                    <div className="flex items-start gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleViewDetails(s)}
                        className="truncate text-left text-sm font-medium transition-colors duration-200"
                        style={{ color: "var(--foreground)" }}
                      >
                        {loadingLocationId === s.targetLocationId
                          ? "Loading..."
                          : s.targetLocationName}
                      </button>
                      {s.isUnescoSite && (
                        <span
                          className="shrink-0 rounded-lg px-1 py-px text-[10px] font-medium"
                          style={{
                            backgroundColor:
                              "color-mix(in srgb, var(--primary) 10%, transparent)",
                            color: "var(--primary)",
                          }}
                        >
                          UNESCO
                        </span>
                      )}
                      {s.isHiddenGem && (
                        <span
                          className="shrink-0 rounded-lg px-1 py-px text-[10px] font-medium"
                          style={{
                            backgroundColor:
                              "color-mix(in srgb, var(--success) 10%, transparent)",
                            color: "var(--success)",
                          }}
                        >
                          Hidden Gem
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    <p
                      className="mt-0.5 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <span className="capitalize">
                        {categoryLabel(s.category)}
                      </span>
                      {" in "}
                      {s.targetCity}
                      {s.rating && (
                        <span className="ml-1.5">
                          {"  "}
                          <span style={{ color: "var(--foreground)" }}>
                            {s.rating.toFixed(1)}
                          </span>
                        </span>
                      )}
                    </p>

                    {/* Travel time */}
                    <p
                      className="mt-1 flex items-center gap-1 text-xs"
                      style={{ color: "var(--foreground)" }}
                    >
                      <Clock className="inline h-3 w-3" />
                      {formatTravelTime(s.travelMinutes)} from {s.baseCityName}
                      {s.nearbyCount > 0 && (
                        <span
                          className="ml-1.5"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          + {s.nearbyCount} nearby{" "}
                          {s.nearbyCount === 1 ? "spot" : "spots"}
                        </span>
                      )}
                    </p>

                    {/* Action */}
                    <div className="mt-2">
                      {confirmingId !== s.id && eligible.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleStartConfirm(s)}
                          className="rounded-xl px-2.5 py-1 text-xs font-medium transition-colors duration-200 hover:opacity-80 active:scale-[0.98]"
                          style={{
                            backgroundColor:
                              "color-mix(in srgb, var(--success) 10%, transparent)",
                            color: "var(--success)",
                          }}
                        >
                          Swap a day for this trip
                        </button>
                      ) : confirmingId !== s.id && eligible.length === 0 ? (
                        <p
                          className="text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          No available days in {s.baseCityName}
                        </p>
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
                    transition={{ duration: 0.25, ease: bEase }}
                    className="overflow-hidden"
                  >
                    <div
                      className="mt-1 rounded-2xl p-3"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--success) 5%, transparent)",
                        border:
                          "1px solid color-mix(in srgb, var(--success) 15%, transparent)",
                      }}
                    >
                      <p
                        className="text-sm"
                        style={{ color: "var(--foreground)" }}
                      >
                        Replace a day in {s.baseCityName} with a day trip to{" "}
                        {s.targetLocationName}?
                      </p>

                      {eligible.length > 1 && (
                        <div className="mt-2 flex items-center gap-2">
                          <label
                            htmlFor={`day-picker-${s.id}`}
                            className="text-xs"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            Which day:
                          </label>
                          <select
                            id={`day-picker-${s.id}`}
                            value={selectedDayIndex ?? ""}
                            onChange={(e) =>
                              setSelectedDayIndex(Number(e.target.value))
                            }
                            className="rounded-xl border px-2 py-1 text-xs"
                            style={{
                              borderColor: "var(--border)",
                              backgroundColor: "var(--card)",
                              color: "var(--foreground)",
                            }}
                          >
                            {eligible.map((d) => (
                              <option key={d.index} value={d.index}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <p
                        className="mt-1 text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {formatTravelTime(s.travelMinutes)} each way by train.
                        Undo with Cmd+Z to restore the original day.
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
                          className="rounded-xl px-3 py-1 text-xs font-medium text-white transition-colors duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                          style={{ backgroundColor: "var(--success)" }}
                        >
                          {isAccepting
                            ? "Planning..."
                            : `Swap ${eligible.length === 1 ? eligible[0]!.label : `Day ${(selectedDayIndex ?? 0) + 1}`}`}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="rounded-xl px-3 py-1 text-xs font-medium transition-colors duration-200"
                          style={{ color: "var(--muted-foreground)" }}
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

      {/* Location detail panel */}
      <AnimatePresence>
        {expandedLocation && (
          <PlaceDetailPanelB
            location={expandedLocation}
            onClose={() => setExpandedLocation(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
