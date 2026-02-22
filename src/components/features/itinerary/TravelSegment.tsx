"use client";

import type { ItineraryTravelSegment } from "@/types/itinerary";
import { TravelModeSelector } from "./TravelModeSelector";
import type { Coordinate } from "@/lib/routing/types";

type TravelSegmentProps = {
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

export function TravelSegment({
  segment,
  origin,
  destination,
  originName,
  destinationName,
  timezone,
  onModeChange,
  isRecalculating = false,
  gapMinutes,
}: TravelSegmentProps) {
  const formatDistance = (meters?: number) => {
    if (!meters) return null;
    if (meters < 1000) return `${Math.ceil(meters)} meters`;
    const km = (meters / 1000).toFixed(1);
    return `${km}km`;
  };

  const openGoogleMapsDirections = () => {
    const params = new URLSearchParams({
      api: "1",
    });

    if (originName) {
      params.append("origin", originName);
    } else {
      params.append("origin", `${origin.lat},${origin.lng}`);
    }

    if (destinationName) {
      params.append("destination", destinationName);
    } else {
      params.append("destination", `${destination.lat},${destination.lng}`);
    }

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
    const googleTravelMode = travelModeMap[segment.mode] || "driving";
    params.append("travelmode", googleTravelMode);

    const url = `https://www.google.com/maps/dir/?${params.toString()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const isLoading = isRecalculating || segment.durationMinutes === 0;
  const showEstimatedBadge = segment.isEstimated && !isLoading;
  const isTight = !isLoading && gapMinutes !== undefined && gapMinutes < segment.durationMinutes + 5;

  return (
    <div className="flex items-center justify-center py-3.5 px-4 border border-sage/25 rounded-xl bg-sage/5 shadow-sm">
      <div className="flex items-center gap-1.5 text-sm text-foreground-secondary">
        {isLoading && (
          <span className="flex items-center gap-1 text-xs text-stone">
            <svg
              className="h-3 w-3 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
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
        )}
        {!isLoading && (
          <TravelModeSelector
            currentMode={segment.mode}
            durationMinutes={segment.durationMinutes}
            departureTime={segment.departureTime}
            arrivalTime={segment.arrivalTime}
            origin={origin}
            destination={destination}
            timezone={timezone}
            onModeChange={onModeChange}
          />
        )}
        {showEstimatedBadge && (
          <span
            className="text-xs text-warning"
            title="Estimated travel time (actual may vary)"
          >
            ~est
          </span>
        )}
        {isTight && (
          <span
            className="text-xs text-warning font-medium"
            title={`Only ${gapMinutes} min gap for ~${segment.durationMinutes} min travel`}
          >
            Tight
          </span>
        )}
        {segment.distanceMeters && (
          <>
            <span className="text-stone">•</span>
            <span className="font-mono text-sm text-foreground-secondary">{formatDistance(segment.distanceMeters)}</span>
          </>
        )}
        <span className="text-stone">•</span>
        <button
          type="button"
          className="text-sm text-sage hover:text-sage/80 font-medium"
          onClick={openGoogleMapsDirections}
          title={`Directions from ${originName || "origin"} to ${destinationName || "destination"}`}
        >
          Directions
        </button>
      </div>
    </div>
  );
}
