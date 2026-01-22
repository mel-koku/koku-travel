"use client";

import { useMemo } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { ItineraryPreview } from "./ItineraryPreview";
import { TripMap } from "./TripMap";
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
      (data.cities?.length ?? 0) > 0 ||
      (data.interests?.length ?? 0) > 0
    );
  }, [data.duration, data.dates.start, data.cities?.length, data.interests?.length]);

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

    if ((data.cities?.length ?? 0) > 0) {
      parts.push(`${data.cities?.length} ${data.cities?.length === 1 ? "city" : "cities"}`);
    }

    return parts.join(" · ");
  }, [data.duration, data.dates.start, data.cities?.length]);

  if (!hasData) {
    return (
      <div
        className={cn(
          "flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center",
          className
        )}
      >
        <div className="max-w-xs">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <h3 className="mt-4 text-sm font-medium text-gray-900">
            Your itinerary preview
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Start filling in your trip details to see a preview of your itinerary here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Summary Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Trip Preview</h3>
        {tripSummary && (
          <p className="mt-0.5 text-xs text-gray-500">{tripSummary}</p>
        )}
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          {/* Map Section */}
          {showMap && (data.cities?.length ?? 0) > 0 && (
            <div className="h-48 shrink-0 border-b border-gray-200">
              <TripMap />
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
