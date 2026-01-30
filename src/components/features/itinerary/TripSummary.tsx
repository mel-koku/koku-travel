"use client";

import { useMemo } from "react";

import { VIBES } from "@/data/vibes";
import { REGION_DESCRIPTIONS } from "@/data/regionDescriptions";
import { cn } from "@/lib/cn";
import type { TripBuilderData } from "@/types/trip";

export type TripSummaryProps = {
  tripData: TripBuilderData;
  className?: string;
};

export function TripSummary({ tripData, className }: TripSummaryProps) {
  const formattedDates = useMemo(() => {
    if (!tripData.dates?.start) return null;

    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const start = formatter.format(new Date(tripData.dates.start));
    if (!tripData.dates.end) return start;

    const end = formatter.format(new Date(tripData.dates.end));
    return `${start} - ${end}`;
  }, [tripData.dates?.start, tripData.dates?.end]);

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

    if (tripData.budget?.level) {
      parts.push(
        tripData.budget.level.charAt(0).toUpperCase() + tripData.budget.level.slice(1)
      );
    }

    if (tripData.budget?.total) {
      parts.push(`¥${tripData.budget.total.toLocaleString()} total`);
    }

    if (tripData.budget?.perDay) {
      parts.push(`¥${tripData.budget.perDay.toLocaleString()}/day`);
    }

    return parts.length > 0 ? parts.join(" · ") : null;
  }, [tripData.budget]);

  // Calculate how many items we have to display
  const hasVibes = (tripData.vibes?.length ?? 0) > 0;
  const hasRegions = (tripData.regions?.length ?? 0) > 0;

  return (
    <div className={cn("rounded-xl border border-border bg-background", className)}>
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-charcoal">Trip Summary</h3>
      </div>

      <div className="divide-y divide-border">
        {/* Duration & Dates */}
        <SummaryRow
          label="Duration"
          value={
            tripData.duration
              ? `${tripData.duration} day${tripData.duration === 1 ? "" : "s"}`
              : "Not set"
          }
          isEmpty={!tripData.duration}
        />

        <SummaryRow
          label="Dates"
          value={formattedDates ?? "Not set"}
          isEmpty={!formattedDates}
        />

        {/* Entry Point */}
        <SummaryRow
          label="Entry Point"
          value={tripData.entryPoint?.name ?? "Not set"}
          isEmpty={!tripData.entryPoint}
        />

        {/* Budget */}
        <SummaryRow
          label="Budget"
          value={budgetLabel ?? "Not set"}
          isEmpty={!budgetLabel}
        />

        {/* Vibes */}
        {hasVibes && (
          <div className="px-4 py-3">
            <div className="flex items-start justify-between">
              <span className="text-sm text-stone">Vibes</span>
              <div className="ml-4 flex-1 text-right">
                <div className="flex flex-wrap justify-end gap-1">
                  {tripData.vibes?.map((vibe) => (
                    <span
                      key={vibe}
                      className="inline-block rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary"
                    >
                      {vibeLabels.get(vibe) ?? vibe}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regions */}
        {hasRegions && (
          <div className="px-4 py-3">
            <div className="flex items-start justify-between">
              <span className="text-sm text-stone">Regions</span>
              <div className="ml-4 flex-1 text-right">
                <div className="flex flex-wrap justify-end gap-1">
                  {tripData.regions?.map((region) => (
                    <span
                      key={region}
                      className="inline-block rounded-full bg-sage/10 px-2 py-0.5 text-xs font-medium text-sage"
                    >
                      {regionLabels.get(region) ?? region}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type SummaryRowProps = {
  label: string;
  value: string;
  isEmpty?: boolean;
};

function SummaryRow({ label, value, isEmpty }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-stone">{label}</span>
      <span
        className={cn("text-sm font-medium", isEmpty ? "text-stone" : "text-charcoal")}
      >
        {value}
      </span>
    </div>
  );
}
