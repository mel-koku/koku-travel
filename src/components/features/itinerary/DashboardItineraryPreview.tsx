"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { ChangeEvent } from "react";

import type { StoredTrip } from "@/state/AppState";
import type { ItineraryActivity } from "@/types/itinerary";
import { DaySelector } from "./DaySelector";

type DashboardItineraryPreviewProps = {
  trip: StoredTrip;
  availableTrips?: StoredTrip[];
  selectedTripId?: string | null;
  onSelectTrip?: (tripId: string) => void;
  onDeleteTrip?: (tripId: string) => void;
};

type SectionKey = ItineraryActivity["timeOfDay"];

const SECTION_ORDER: SectionKey[] = ["morning", "afternoon", "evening"];

const SECTION_META: Record<SectionKey, { title: string; description: string }> = {
  morning: {
    title: "Morning",
    description: "Ease into the day with energizing plans.",
  },
  afternoon: {
    title: "Afternoon",
    description: "Keep the momentum going with midday highlights.",
  },
  evening: {
    title: "Evening",
    description: "Wind down with memorable night activities.",
  },
};

const buildSectionMap = (activities: ItineraryActivity[] | undefined) => {
  const initial: Record<SectionKey, ItineraryActivity[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };

  (activities ?? []).forEach((activity) => {
    initial[activity.timeOfDay]?.push(activity);
  });

  return initial;
};

const formatDate = (iso?: string) => {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
};

const ActivityPreviewCard = ({ activity }: { activity: ItineraryActivity }) => {
  const isNote = activity.kind === "note";
  const place = activity.kind === "place" ? activity : null;

  return (
    <li className="rounded-xl border border-border bg-background p-4 shadow-sm transition hover:border-brand-primary/20 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">{activity.title}</p>
          {place?.neighborhood ? (
            <p className="text-xs text-stone">{place.neighborhood}</p>
          ) : null}
          {isNote && activity.notes ? (
            <p className="text-xs text-foreground-secondary">{activity.notes}</p>
          ) : null}
        </div>
        {place?.durationMin ? (
          <span className="rounded-full bg-brand-primary/10 px-2 py-1 text-xs font-medium text-brand-primary">
            ~{place.durationMin >= 60 ? `${Math.round((place.durationMin / 60) * 10) / 10}h` : `${place.durationMin}m`}
          </span>
        ) : null}
      </div>
      {place?.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {place.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-foreground-secondary"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {isNote && activity.startTime && activity.endTime ? (
        <p className="mt-3 text-xs font-medium text-stone">
          {activity.startTime}–{activity.endTime}
        </p>
      ) : null}
    </li>
  );
};

export const DashboardItineraryPreview = ({
  trip,
  availableTrips = [],
  selectedTripId,
  onSelectTrip,
  onDeleteTrip,
}: DashboardItineraryPreviewProps) => {
  const [selectedDay, setSelectedDay] = useState(0);
  const days = trip.itinerary.days ?? [];
  const safeSelectedDay = days.length > selectedDay ? selectedDay : 0;
  const currentDay = days[safeSelectedDay];
  const sections = useMemo(
    () => buildSectionMap(currentDay?.activities),
    [currentDay?.activities],
  );

  const createdLabel = formatDate(trip.createdAt);
  const updatedLabel =
    trip.updatedAt !== trip.createdAt ? formatDate(trip.updatedAt) : null;

  const handleDelete = useCallback(() => {
    if (!onDeleteTrip) {
      return;
    }
    const confirmed = window.confirm(
      `Delete the itinerary "${trip.name}"? This action cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }
    onDeleteTrip(trip.id);
  }, [onDeleteTrip, trip.id, trip.name]);

  const showTripSelector = availableTrips.length > 0 && !!onSelectTrip;

  const handleTripChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      onSelectTrip?.(event.target.value);
    },
    [onSelectTrip],
  );

  return (
    <section className="mt-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">
            Active Itinerary
          </p>
          <h2 className="text-xl font-semibold text-foreground">{trip.name}</h2>
          {createdLabel ? (
            <p className="text-xs text-stone">
              Saved {createdLabel}
              {updatedLabel ? ` · Updated ${updatedLabel}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-end sm:gap-4 lg:w-auto">
          {showTripSelector ? (
            <div className="flex w-full flex-col items-center gap-1 sm:w-auto sm:self-end sm:items-center">
              <label
                htmlFor="dashboard-trip-selector"
                className="text-xs font-medium uppercase tracking-wide text-stone text-center"
              >
                Select itinerary
              </label>
              <div className="relative w-full sm:w-auto">
                <select
                  id="dashboard-trip-selector"
                  className="w-full appearance-none rounded-full border border-border bg-background py-2 pl-4 pr-10 text-sm font-medium text-foreground shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary sm:min-w-[220px]"
                  value={selectedTripId ?? trip.id}
                  onChange={handleTripChange}
                >
                  {availableTrips.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center justify-center rounded-full bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive shadow-sm transition hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!onDeleteTrip}
            >
              Delete itinerary
            </button>
            <Link
              href={`/itinerary?trip=${trip.id}`}
              className="inline-flex items-center justify-center rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            >
              View full plan
            </Link>
          </div>
        </div>
      </header>

      <div className="mt-4 rounded-2xl border border-border bg-background p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          <DaySelector
            totalDays={days.length}
            selected={safeSelectedDay}
            onChange={setSelectedDay}
            labels={days.map((day, index) => day.dateLabel || `Day ${index + 1}`)}
          />

          {currentDay ? (
            <div className="grid gap-6 md:grid-cols-3">
              {SECTION_ORDER.map((section) => {
                const meta = SECTION_META[section];
                const activities = sections[section];
                const previewItems = activities.slice(0, 3);
                const remainingCount = activities.length - previewItems.length;

                return (
                  <section
                    key={section}
                    className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4"
                  >
                    <header className="space-y-1">
                      <h3 className="text-base font-semibold text-foreground">
                        {meta.title}
                      </h3>
                      <p className="text-sm text-stone">{meta.description}</p>
                    </header>

                    {previewItems.length > 0 ? (
                      <ul className="flex flex-col gap-3">
                        {previewItems.map((activity) => (
                          <ActivityPreviewCard key={activity.id} activity={activity} />
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-lg border border-dashed border-stone/30 bg-background p-4 text-sm text-stone">
                        No activities yet. Add plans in the itinerary builder.
                      </p>
                    )}

                    {remainingCount > 0 ? (
                      <p className="text-xs font-medium text-brand-primary">
                        +{remainingCount} more planned
                      </p>
                    ) : null}
                  </section>
                );
              })}
            </div>
          ) : (
            <p className="rounded-lg bg-surface p-6 text-sm text-foreground-secondary">
              No activities planned for the selected day yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};


