"use client";

import {
  Footprints,
  TrainFront,
  Bus,
  Car,
  Bike,
  Navigation,
  type LucideIcon,
} from "lucide-react";
import type { ItineraryTravelSegment } from "@/types/itinerary";
import type { Coordinate } from "@/lib/routing/types";

type TravelSegmentBProps = {
  segment: ItineraryTravelSegment;
  origin: Coordinate;
  destination: Coordinate;
  originName?: string;
  destinationName?: string;
  timezone?: string;
  onModeChange: (mode: ItineraryTravelSegment["mode"]) => void;
  isRecalculating?: boolean;
  /** Gap in minutes between previous departure and current arrival */
  gapMinutes?: number;
};

const MODE_ICONS: Record<string, LucideIcon> = {
  walk: Footprints,
  train: TrainFront,
  subway: TrainFront,
  transit: TrainFront,
  bus: Bus,
  car: Car,
  taxi: Car,
  rideshare: Car,
  bicycle: Bike,
};

export function TravelSegmentB({
  segment,
  origin,
  destination,
  originName,
  destinationName,
  isRecalculating = false,
  gapMinutes,
}: TravelSegmentBProps) {
  const formatDistance = (meters?: number) => {
    if (!meters) return null;
    if (meters < 1000) return `${Math.ceil(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const openGoogleMapsDirections = () => {
    const params = new URLSearchParams({ api: "1" });
    params.append("origin", originName || `${origin.lat},${origin.lng}`);
    params.append("destination", destinationName || `${destination.lat},${destination.lng}`);

    const travelModeMap: Record<string, string> = {
      walk: "walking",
      car: "driving",
      taxi: "driving",
      bus: "transit",
      train: "transit",
      subway: "transit",
      transit: "transit",
      bicycle: "bicycling",
    };
    params.append("travelmode", travelModeMap[segment.mode] || "driving");
    window.open(`https://www.google.com/maps/dir/?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const isLoading = isRecalculating || segment.durationMinutes === 0;
  const isTight =
    !isLoading && gapMinutes !== undefined && gapMinutes < segment.durationMinutes + 5;

  const ModeIcon = MODE_ICONS[segment.mode] ?? Navigation;
  const distance = formatDistance(segment.distanceMeters);

  return (
    <div className="flex items-center gap-3 py-2 px-2">
      {/* Left dotted line */}
      <div
        className="h-px flex-1 border-t border-dashed"
        style={{ borderColor: "var(--border)" }}
      />

      {/* Center content */}
      <div
        className="flex items-center gap-2 rounded-full px-3 py-1.5"
        style={{ backgroundColor: "var(--surface)" }}
      >
        {isLoading ? (
          <span
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            <svg
              className="h-3.5 w-3.5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Calculating...
          </span>
        ) : (
          <>
            <ModeIcon
              className="h-3.5 w-3.5"
              style={{ color: "var(--muted-foreground)" }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {segment.durationMinutes} min
            </span>
            {segment.isEstimated && (
              <span
                className="text-[10px]"
                style={{ color: "var(--warning)" }}
                title="Estimated travel time (actual may vary)"
              >
                ~est
              </span>
            )}
            {isTight && (
              <span
                className="text-[10px] font-medium"
                style={{ color: "var(--warning)" }}
                title={`Only ${gapMinutes} min gap for ~${segment.durationMinutes} min travel`}
              >
                Tight
              </span>
            )}
            {distance && (
              <>
                <span
                  className="text-[10px]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {distance}
                </span>
              </>
            )}
            <button
              type="button"
              className="text-xs font-medium transition-colors duration-200 hover:underline"
              style={{ color: "var(--primary)" }}
              onClick={openGoogleMapsDirections}
              title={`Directions from ${originName || "origin"} to ${destinationName || "destination"}`}
            >
              Directions
            </button>
          </>
        )}
      </div>

      {/* Right dotted line */}
      <div
        className="h-px flex-1 border-t border-dashed"
        style={{ borderColor: "var(--border)" }}
      />
    </div>
  );
}
