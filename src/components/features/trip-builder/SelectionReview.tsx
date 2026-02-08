"use client";

import { useMemo } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { VIBES } from "@/data/vibes";
import { REGION_DESCRIPTIONS } from "@/data/regionDescriptions";
import { cn } from "@/lib/cn";

export type SelectionReviewProps = {
  onEdit?: () => void;
};

export function SelectionReview({ onEdit }: SelectionReviewProps) {
  const { data } = useTripBuilder();

  const formattedDates = useMemo(() => {
    if (!data.dates.start) return null;

    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const start = formatter.format(new Date(data.dates.start));
    if (!data.dates.end) return start;

    const end = formatter.format(new Date(data.dates.end));
    return `${start} - ${end}`;
  }, [data.dates.start, data.dates.end]);

  const vibeLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const vibe of VIBES) {
      map.set(vibe.id, vibe.name);
    }
    return map;
  }, []);

  const regionLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const region of REGION_DESCRIPTIONS) {
      map.set(region.id, region.name);
    }
    return map;
  }, []);

  const budgetLabel = useMemo(() => {
    const parts: string[] = [];

    if (data.budget?.level) {
      parts.push(
        data.budget.level.charAt(0).toUpperCase() + data.budget.level.slice(1)
      );
    }

    if (data.budget?.total) {
      parts.push(`¥${data.budget.total.toLocaleString()} total`);
    }

    if (data.budget?.perDay) {
      parts.push(`¥${data.budget.perDay.toLocaleString()}/day`);
    }

    return parts.length > 0 ? parts.join(" · ") : null;
  }, [data.budget]);

  return (
    <div className="rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Your Trip Summary</h3>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-medium text-sage hover:text-sage/80"
          >
            Edit
          </button>
        )}
      </div>

      <div className="divide-y divide-border">
        {/* Duration & Dates */}
        <ReviewRow
          label="Duration"
          value={
            data.duration
              ? `${data.duration} day${data.duration === 1 ? "" : "s"}`
              : "Not set"
          }
          isEmpty={!data.duration}
        />

        <ReviewRow
          label="Dates"
          value={formattedDates ?? "Not set"}
          isEmpty={!formattedDates}
        />

        {/* Entry Point */}
        <ReviewRow
          label="Entry Point"
          value={data.entryPoint?.name ?? "Not set"}
          isEmpty={!data.entryPoint}
        />

        {/* Budget */}
        <ReviewRow
          label="Budget"
          value={budgetLabel ?? "Not set"}
          isEmpty={!budgetLabel}
        />

        {/* Vibes */}
        <div className="px-4 py-3">
          <div className="flex items-start justify-between">
            <span className="text-sm text-stone">Vibes</span>
            <div className="flex-1 ml-4 text-right">
              {data.vibes && data.vibes.length > 0 ? (
                <div className="flex flex-wrap justify-end gap-1">
                  {data.vibes.map((vibe) => (
                    <span
                      key={vibe}
                      className="inline-block rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary"
                    >
                      {vibeLabels.get(vibe) ?? vibe}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-stone">Not selected</span>
              )}
            </div>
          </div>
        </div>

        {/* Regions */}
        <div className="px-4 py-3">
          <div className="flex items-start justify-between">
            <span className="text-sm text-stone">Regions</span>
            <div className="flex-1 ml-4 text-right">
              {data.regions && data.regions.length > 0 ? (
                <div className="flex flex-wrap justify-end gap-1">
                  {data.regions.map((region) => (
                    <span
                      key={region}
                      className="inline-block rounded-full bg-sage/10 px-2 py-0.5 text-xs font-medium text-sage"
                    >
                      {regionLabels.get(region) ?? region}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-stone">Not selected</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type ReviewRowProps = {
  label: string;
  value: string;
  isEmpty?: boolean;
};

function ReviewRow({ label, value, isEmpty }: ReviewRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-stone">{label}</span>
      <span
        className={cn("text-sm font-medium", isEmpty ? "text-stone" : "text-foreground")}
      >
        {value}
      </span>
    </div>
  );
}
