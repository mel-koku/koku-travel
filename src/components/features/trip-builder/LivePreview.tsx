"use client";

import { useMemo } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { ItineraryPreview } from "./ItineraryPreview";
import { RegionMap } from "./RegionMap";
import { cn } from "@/lib/cn";

export type LivePreviewProps = {
  className?: string;
  showMap?: boolean;
};

export function LivePreview({ className, showMap = true }: LivePreviewProps) {
  const { data } = useTripBuilder();

  const hasData = useMemo(() => {
    return (
      data.duration ||
      data.dates.start ||
      (data.vibes?.length ?? 0) > 0 ||
      (data.regions?.length ?? 0) > 0
    );
  }, [data.duration, data.dates.start, data.vibes?.length, data.regions?.length]);

  const tripSummary = useMemo(() => {
    const parts: string[] = [];

    if (data.duration) {
      parts.push(`${data.duration} day${data.duration === 1 ? "" : "s"}`);
    }

    if (data.dates.start) {
      const startDate = new Date(data.dates.start);
      const formatter = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      });
      parts.push(formatter.format(startDate));
    }

    if ((data.regions?.length ?? 0) > 0) {
      parts.push(`${data.regions?.length} ${data.regions?.length === 1 ? "region" : "regions"}`);
    }

    return parts.join(" · ");
  }, [data.duration, data.dates.start, data.regions?.length]);

  if (!hasData) {
    return (
      <div
        className={cn(
          "flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface p-6 text-center",
          className
        )}
      >
        <div className="max-w-xs">
          <svg
            className="mx-auto h-12 w-12 text-stone"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-foreground">
            Itinerary preview
          </h3>
          <p className="mt-2 text-sm text-stone">
            Your preview will appear here as you go.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Summary Header */}
      <div className="border-b border-border bg-background px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Trip Preview</h3>
        {tripSummary && (
          <p className="mt-0.5 text-xs text-stone">{tripSummary}</p>
        )}
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          {/* Map Section */}
          {showMap && (data.regions?.length ?? 0) > 0 && (
            <div className="h-48 shrink-0 border-b border-border">
              <RegionMap />
            </div>
          )}

          {/* Itinerary Preview */}
          <div className="flex-1 overflow-y-auto">
            <ItineraryPreview />
          </div>
        </div>
      </div>
    </div>
  );
}
