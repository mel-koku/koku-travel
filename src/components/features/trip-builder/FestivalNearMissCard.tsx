"use client";

import { useMemo, useState } from "react";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { detectFestivalNearMissWarnings } from "@/lib/planning/tripWarnings";
import { parseLocalDate } from "@/lib/utils/dateUtils";

function formatFriendlyDate(iso: string): string {
  const date = parseLocalDate(iso);
  if (!date) return iso;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function FestivalNearMissCard() {
  const { data, setData } = useTripBuilder();

  const warning = useMemo(
    () => detectFestivalNearMissWarnings(data)[0],
    // data passed by closure, but only these fields actually affect the warning
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.cities, data.dates?.start, data.dates?.end],
  );

  const [dismissedFestivalId, setDismissedFestivalId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    festivalName: string;
    direction: "forward" | "backward";
    newPivotDate: string; // newEndDate for forward, newStartDate for backward
    days: number;
    previousStartDate: string;
    previousEndDate: string;
    previousDuration: number | undefined;
  } | null>(null);

  if (confirmed) {
    const isForward = confirmed.direction === "forward";
    return (
      <div
        role="status"
        className="flex items-start justify-between gap-3 rounded-lg border border-sage/30 bg-sage/5 px-4 py-3"
      >
        <p className="text-sm text-foreground-secondary">
          <span aria-hidden="true">✓ </span>
          {isForward
            ? `Trip extended through ${formatFriendlyDate(confirmed.newPivotDate)}.`
            : `Trip now starts ${formatFriendlyDate(confirmed.newPivotDate)}.`}{" "}
          We&apos;ll plan {confirmed.days === 1 ? "1 extra day" : `${confirmed.days} extra days`} around {confirmed.festivalName}.
        </p>
        <button
          type="button"
          aria-label="Undo trip extension"
          className="shrink-0 text-xs font-medium text-brand-primary hover:underline"
          onClick={() => {
            setData((prev) => ({
              ...prev,
              dates: {
                ...prev.dates,
                start: confirmed.previousStartDate,
                end: confirmed.previousEndDate,
              },
              duration: confirmed.previousDuration,
            }));
            setConfirmed(null);
          }}
        >
          Undo
        </button>
      </div>
    );
  }

  if (!warning) return null;

  // Dismissal is keyed to festival id, so changing cities to surface a different
  // near-miss correctly re-shows the card.
  const festivalId = (warning.actionData?.festivalId as string | undefined) ?? warning.id;
  if (dismissedFestivalId === festivalId) return null;

  const isActionable = warning.action === "extend_trip" && !!warning.actionData;
  const extendDays = (warning.actionData?.extendDays as number | undefined) ?? 0;
  const direction =
    (warning.actionData?.direction as "forward" | "backward" | undefined) ?? "forward";
  const newEndDate = warning.actionData?.newEndDate as string | undefined;
  const newStartDate = warning.actionData?.newStartDate as string | undefined;
  const festivalName =
    (warning.actionData?.festivalName as string | undefined) ?? warning.title;

  return (
    <div className="rounded-lg border border-sage/30 bg-sage/5 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <warning.icon className="h-4 w-4 shrink-0 text-foreground-secondary" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-foreground">{warning.title}</p>
            <p className="mt-1 text-sm text-foreground-secondary">{warning.message}</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss festival suggestion"
          className="shrink-0 text-stone hover:text-foreground"
          onClick={() => setDismissedFestivalId(festivalId)}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      {isActionable && direction === "forward" && newEndDate && (
        <div className="mt-3">
          <button
            type="button"
            className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white shadow-[var(--shadow-sm)] hover:bg-brand-primary/90"
            onClick={() => {
              const previousStartDate = data.dates.start;
              const previousEndDate = data.dates.end;
              if (!previousStartDate || !previousEndDate) return; // invariant: extend renders only when both dates are set
              const previousDuration = data.duration;
              setData((prev) => ({
                ...prev,
                dates: { ...prev.dates, end: newEndDate },
                duration: (prev.duration ?? 0) + extendDays,
              }));
              setConfirmed({
                festivalName,
                direction: "forward",
                newPivotDate: newEndDate,
                days: extendDays,
                previousStartDate,
                previousEndDate,
                previousDuration,
              });
            }}
          >
            Extend trip by {extendDays === 1 ? "1 day" : `${extendDays} days`}
          </button>
        </div>
      )}

      {isActionable && direction === "backward" && newStartDate && (
        <div className="mt-3">
          <button
            type="button"
            className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white shadow-[var(--shadow-sm)] hover:bg-brand-primary/90"
            onClick={() => {
              const previousStartDate = data.dates.start;
              const previousEndDate = data.dates.end;
              if (!previousStartDate || !previousEndDate) return; // invariant: extend renders only when both dates are set
              const previousDuration = data.duration;
              setData((prev) => ({
                ...prev,
                dates: { ...prev.dates, start: newStartDate },
                duration: (prev.duration ?? 0) + extendDays,
              }));
              setConfirmed({
                festivalName,
                direction: "backward",
                newPivotDate: newStartDate,
                days: extendDays,
                previousStartDate,
                previousEndDate,
                previousDuration,
              });
            }}
          >
            Start trip {extendDays === 1 ? "1 day" : `${extendDays} days`} earlier
          </button>
        </div>
      )}
    </div>
  );
}
