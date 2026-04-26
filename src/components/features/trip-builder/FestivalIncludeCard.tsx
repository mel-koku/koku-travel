"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { detectPlanningWarnings } from "@/lib/planning/tripWarnings";

/**
 * Festival overlap auto-include CTA (KOK-32).
 *
 * When a festival overlaps the trip dates in a planned city, surface a
 * green opt-in card. Clicking "Weave it in" appends the festival ID to
 * data.mustIncludeFestivals so the next generation pins the festival's
 * suggested location (or drops a dated note) on the festival day.
 *
 * Mirrors KOK-23's FestivalNearMissCard visual treatment: dismiss × in the
 * top-right and a sage-green confirmation state with Undo after the user
 * accepts. The two flows feel like a family.
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
            <span aria-hidden="true">✓ </span>
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

        return (
          <div
            key={w.id}
            className="rounded-lg border border-sage/30 bg-sage/5 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Sparkles
                  className="h-4 w-4 shrink-0 text-foreground-secondary"
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {w.title}
                  </p>
                  <p className="mt-1 text-sm text-foreground-secondary">
                    {w.message}
                  </p>
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
