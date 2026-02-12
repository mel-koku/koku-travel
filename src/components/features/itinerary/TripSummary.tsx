"use client";

import { useMemo, useState } from "react";

import { VIBES } from "@/data/vibes";
import { REGION_DESCRIPTIONS } from "@/data/regionDescriptions";
import { cn } from "@/lib/cn";
import type { TripBuilderData } from "@/types/trip";

export type TripSummaryProps = {
  tripData: TripBuilderData;
  className?: string;
  /** Start collapsed */
  defaultCollapsed?: boolean;
  /** Visual variant — "default" for standard bg, "dark" for elevated surface */
  variant?: "default" | "dark";
};

export function TripSummary({ tripData, className, defaultCollapsed = true, variant = "default" }: TripSummaryProps) {
  const isDark = variant === "dark";
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  const formattedDates = useMemo(() => {
    if (!tripData.dates?.start) return null;

    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    });

    const start = formatter.format(new Date(tripData.dates.start));
    if (!tripData.dates.end) return start;

    const end = formatter.format(new Date(tripData.dates.end));
    return `${start} - ${end}`;
  }, [tripData.dates]);

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
    if (tripData.budget?.level) {
      return tripData.budget.level.charAt(0).toUpperCase() + tripData.budget.level.slice(1);
    }
    return null;
  }, [tripData.budget]);

  const hasVibes = (tripData.vibes?.length ?? 0) > 0;
  const hasRegions = (tripData.regions?.length ?? 0) > 0;

  return (
    <div className={cn(
      "rounded-lg border border-border backdrop-blur-sm",
      isDark ? "bg-surface/50" : "bg-background/80",
      className,
    )}>
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex w-full items-center justify-between px-3 py-2 text-left transition",
          isDark ? "hover:bg-surface" : "hover:bg-surface/50",
        )}
      >
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-sm font-medium text-foreground">Trip Summary</span>
        </div>
        <svg
          className={cn("h-4 w-4 text-stone transition-transform", isExpanded && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="border-t border-border px-3 py-2 space-y-2">
          {/* Duration & Dates */}
          {(tripData.duration || formattedDates) && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone">When</span>
              <span className="font-mono font-medium text-foreground">
                {tripData.duration ? `${tripData.duration} days` : ""}{tripData.duration && formattedDates ? " · " : ""}{formattedDates ?? ""}
              </span>
            </div>
          )}

          {/* Entry Point */}
          {tripData.entryPoint && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone">Entry</span>
              <span className="font-medium truncate ml-2 max-w-[180px] text-foreground">
                {tripData.entryPoint.name}
              </span>
            </div>
          )}

          {/* Budget */}
          {budgetLabel && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone">Budget</span>
              <span className="font-medium text-foreground">{budgetLabel}</span>
            </div>
          )}

          {/* Vibes */}
          {hasVibes && (
            <div className="flex items-start justify-between text-xs">
              <span className="pt-0.5 text-stone">Vibes</span>
              <div className="flex flex-wrap justify-end gap-1 ml-2">
                {tripData.vibes?.slice(0, 3).map((vibe) => (
                  <span
                    key={vibe}
                    className="inline-block rounded-xl bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-primary"
                  >
                    {vibeLabels.get(vibe) ?? vibe}
                  </span>
                ))}
                {(tripData.vibes?.length ?? 0) > 3 && (
                  <span className="text-[10px] text-stone">+{(tripData.vibes?.length ?? 0) - 3}</span>
                )}
              </div>
            </div>
          )}

          {/* Regions */}
          {hasRegions && (
            <div className="flex items-start justify-between text-xs">
              <span className="pt-0.5 text-stone">Regions</span>
              <div className="flex flex-wrap justify-end gap-1 ml-2">
                {tripData.regions?.slice(0, 2).map((region) => (
                  <span
                    key={region}
                    className="inline-block rounded-xl bg-sage/10 px-1.5 py-0.5 text-[10px] font-medium text-sage"
                  >
                    {regionLabels.get(region) ?? region}
                  </span>
                ))}
                {(tripData.regions?.length ?? 0) > 2 && (
                  <span className="text-[10px] text-stone">+{(tripData.regions?.length ?? 0) - 2}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
