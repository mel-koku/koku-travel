"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import type { ChangeEvent } from "react";
import { motion } from "framer-motion";
import type { StoredTrip } from "@/state/AppState";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

type TripsSectionBProps = {
  trips: StoredTrip[];
  activeTrip: StoredTrip | null;
  selectedTripId: string | null;
  onSelectTrip: (id: string) => void;
  onDeleteTrip: (id: string) => void;
};

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function TripsSectionB({
  trips,
  activeTrip,
  selectedTripId,
  onSelectTrip,
  onDeleteTrip,
}: TripsSectionBProps) {
  const handleTripChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      onSelectTrip(event.target.value);
    },
    [onSelectTrip],
  );

  const handleDelete = useCallback(() => {
    if (!activeTrip) return;
    const confirmed = window.confirm(
      `Delete "${activeTrip.name}"? This can't be undone.`,
    );
    if (!confirmed) return;
    onDeleteTrip(activeTrip.id);
  }, [activeTrip, onDeleteTrip]);

  const daySummary = useMemo(() => {
    if (!activeTrip?.itinerary?.days?.length) return null;
    const days = activeTrip.itinerary.days;
    const dayCount = days.length;
    const cityIds = new Set(
      days.map((d) => d.cityId).filter(Boolean),
    );
    const cityCount = cityIds.size;
    return { dayCount, cityCount };
  }, [activeTrip]);

  const createdLabel = activeTrip ? formatDate(activeTrip.createdAt) : null;
  const updatedLabel =
    activeTrip && activeTrip.updatedAt !== activeTrip.createdAt
      ? formatDate(activeTrip.updatedAt)
      : null;

  const showTripSelector = trips.length > 1;

  return (
    <section id="trips" className="py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: bEase }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
            Recent
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-2xl">
            Your Trips
          </h2>
        </motion.div>

        <div className="mt-6">
          {activeTrip ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: 0.1, ease: bEase }}
              className="rounded-2xl bg-[var(--card)] p-6"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              {/* Trip header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]">
                    Active Itinerary
                  </p>
                  <h3 className="text-lg font-bold text-[var(--foreground)]">
                    {activeTrip.name}
                  </h3>
                  {createdLabel && (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Saved {createdLabel}
                      {updatedLabel ? ` · Updated ${updatedLabel}` : ""}
                    </p>
                  )}
                </div>

                {showTripSelector && (
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="b-trip-selector"
                      className="text-xs font-medium text-[var(--muted-foreground)]"
                    >
                      Switch trip
                    </label>
                    <div className="relative">
                      <select
                        id="b-trip-selector"
                        className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] py-2 pl-3 pr-9 text-sm font-medium text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 sm:min-w-[200px]"
                        value={selectedTripId ?? activeTrip.id}
                        onChange={handleTripChange}
                      >
                        {trips.map((trip) => (
                          <option key={trip.id} value={trip.id}>
                            {trip.name}
                          </option>
                        ))}
                      </select>
                      <svg
                        aria-hidden="true"
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Day summary */}
              {daySummary && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]">
                    <svg className="h-4 w-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    {daySummary.dayCount} day{daySummary.dayCount !== 1 ? "s" : ""}
                  </span>
                  {daySummary.cityCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]">
                      <svg className="h-4 w-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      {daySummary.cityCount} cit{daySummary.cityCount !== 1 ? "ies" : "y"}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href={`/b/itinerary?trip=${activeTrip.id}`}
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 active:scale-[0.98]"
                >
                  View full plan
                </Link>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--error)]/20 bg-[var(--error)]/5 px-4 py-2.5 text-sm font-medium text-[var(--error)] transition hover:bg-[var(--error)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--error)] focus-visible:ring-offset-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Delete
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: 0.1, ease: bEase }}
              className="rounded-2xl bg-[var(--card)] p-10 text-center"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              {/* Map icon */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface)]">
                <svg
                  className="h-7 w-7 text-[var(--muted-foreground)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
              </div>

              <h3 className="mt-5 text-lg font-bold text-[var(--foreground)]">
                No trips yet
              </h3>
              <p className="mt-2 mx-auto max-w-sm text-sm text-[var(--muted-foreground)]">
                Head to the trip builder to plan your first adventure. It will appear here once it is ready.
              </p>

              <Link
                href="/b/trip-builder"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                Start planning
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
