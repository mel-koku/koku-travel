"use client";

import { useMemo, useState } from "react";
import { Star, Users } from "lucide-react";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { detectPlanningWarnings } from "@/lib/planning/tripWarnings";
import {
  formatFestivalDateRange,
  getFestivalById,
  getFestivalTripDays,
  type Festival,
} from "@/data/festivalCalendar";
import { formatCityName } from "@/lib/itinerary/dayLabel";

/**
 * Festival overlap auto-include CTA (KOK-32).
 *
 * When a festival overlaps the trip dates in a planned city, surface a
 * green opt-in card. Clicking "Weave it in" appends the festival ID to
 * data.mustIncludeFestivals so the next generation pins the festival's
 * suggested location (or drops a dated note) on the festival day.
 */
export function FestivalIncludeCard() {
  const { data, setData } = useTripBuilder();

  // Pull festival overlap warnings. detectPlanningWarnings already filters to
  // planned cities and dedups to ≤2.
  const overlapWarnings = useMemo(
    () => detectPlanningWarnings(data).filter(
      (w) => w.type === "festival" && w.action === "include_festival",
    ),
    // Closure over data, but only these fields drive the warning set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.cities, data.dates?.start, data.dates?.end],
  );

  const [dismissedIds, setDismissedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [confirmedFestivalId, setConfirmedFestivalId] = useState<string | null>(null);

  // When a festival was just included, render the confirmation panel for that
  // festival in place of its CTA. Confirmation persists until the user clicks
  // Undo or navigates away.
  const confirmedWarning = confirmedFestivalId
    ? overlapWarnings.find(
        (w) => (w.actionData?.festivalId as string | undefined) === confirmedFestivalId,
      )
    : undefined;
  const confirmedFestivalName =
    (confirmedWarning?.actionData?.festivalName as string | undefined) ??
    confirmedWarning?.title ??
    confirmedFestivalId ??
    "";

  const visible = overlapWarnings.filter((w) => {
    const fid = (w.actionData?.festivalId as string | undefined) ?? w.id;
    if (dismissedIds.has(fid)) return false;
    if (confirmedFestivalId === fid) return false;
    // If already in mustIncludeFestivals (e.g. after page reload mid-flow),
    // hide the CTA so we don't pretend it isn't already woven in.
    const fest = data.mustIncludeFestivals ?? [];
    if (fest.includes(fid)) return false;
    return true;
  });

  if (visible.length === 0 && !confirmedFestivalId) return null;

  return (
    <div className="space-y-3">
      {confirmedFestivalId && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-lg border border-sage/30 bg-sage/5 px-4 py-3"
        >
          <p className="text-sm text-foreground-secondary">
            We&apos;ll weave {confirmedFestivalName} into your trip on its festival day.
          </p>
          <button
            type="button"
            aria-label={`Undo including ${confirmedFestivalName}`}
            className="shrink-0 text-xs font-medium text-brand-primary hover:underline"
            onClick={() => {
              const fid = confirmedFestivalId;
              setData((prev) => {
                const existing = prev.mustIncludeFestivals ?? [];
                const next = existing.filter((id) => id !== fid);
                return {
                  ...prev,
                  mustIncludeFestivals: next.length > 0 ? next : undefined,
                };
              });
              setConfirmedFestivalId(null);
            }}
          >
            Undo
          </button>
        </div>
      )}

      {visible.map((w) => {
        const festivalId = (w.actionData?.festivalId as string | undefined) ?? w.id;
        const festivalName =
          (w.actionData?.festivalName as string | undefined) ?? w.title;
        const festival = getFestivalById(festivalId);

        return (
          <div
            key={w.id}
            className="rounded-lg border border-sage/30 bg-sage/5 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Star
                  className="h-4 w-4 shrink-0 fill-current text-foreground-secondary"
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {w.title}
                  </p>
                  {festival && (
                    <FestivalMetaLine
                      festival={festival}
                      tripStart={data.dates?.start}
                      tripEnd={data.dates?.end}
                    />
                  )}
                  <p className="mt-1.5 text-sm text-foreground-secondary">
                    {w.message}
                  </p>
                  {festival?.suggestedActivity && (
                    <p className="mt-1.5 text-sm text-foreground-secondary">
                      <span className="font-medium text-foreground">
                        We&apos;d add:
                      </span>{" "}
                      {festival.suggestedActivity}.
                    </p>
                  )}
                  {festival && festival.crowdImpact >= 4 && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-foreground-secondary">
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      Heavy crowds expected.
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label={`Dismiss ${festivalName} suggestion`}
                className="shrink-0 text-stone hover:text-foreground"
                onClick={() =>
                  setDismissedIds((prev) => {
                    const next = new Set(prev);
                    next.add(festivalId);
                    return next;
                  })
                }
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="mt-3">
              <button
                type="button"
                className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white shadow-[var(--shadow-sm)] hover:bg-brand-primary/90"
                onClick={() => {
                  setData((prev) => {
                    const existing = prev.mustIncludeFestivals ?? [];
                    if (existing.includes(festivalId)) return prev;
                    return {
                      ...prev,
                      mustIncludeFestivals: [...existing, festivalId],
                    };
                  });
                  setConfirmedFestivalId(festivalId);
                }}
              >
                Weave {festivalName} into the trip
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FestivalMetaLine({
  festival,
  tripStart,
  tripEnd,
}: {
  festival: Festival;
  tripStart: string | undefined;
  tripEnd: string | undefined;
}) {
  const dateLabel = formatFestivalDateRange(festival);
  const cityLabel = formatCityName(festival.city);
  const tripDays =
    tripStart && tripEnd
      ? getFestivalTripDays(festival, tripStart, tripEnd)
      : null;

  // For approximate festivals the canonical dates may not be the actual
  // festival days, so a "Day N" label could mislead. Skip it.
  const dayLabel =
    tripDays && !festival.isApproximate
      ? tripDays.firstDay === tripDays.lastDay
        ? `Day ${tripDays.firstDay}`
        : `Days ${tripDays.firstDay}–${tripDays.lastDay}`
      : null;

  const parts = [
    festival.isApproximate ? `Around ${dateLabel}` : dateLabel,
    cityLabel,
    dayLabel,
  ].filter(Boolean);

  return (
    <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-foreground-secondary">
      {parts.join(" · ")}
    </p>
  );
}
