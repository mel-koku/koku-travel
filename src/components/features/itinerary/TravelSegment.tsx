"use client";

import { useState } from "react";
import type { ItineraryTravelSegment } from "@/types/itinerary";
import { TravelModeSelector } from "./TravelModeSelector";
import type { Coordinate } from "@/lib/routing/types";
import { Modal } from "@/components/ui/Modal";

type TravelSegmentProps = {
  segment: ItineraryTravelSegment;
  origin: Coordinate;
  destination: Coordinate;
  originName?: string;
  destinationName?: string;
  timezone?: string;
  onModeChange: (mode: ItineraryTravelSegment["mode"]) => void;
  isRecalculating?: boolean;
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
}: TravelSegmentProps) {
  const [directionsOpen, setDirectionsOpen] = useState(false);

  const formatDistance = (meters?: number) => {
    if (!meters) return null;
    if (meters < 1000) return `${Math.ceil(meters)} meters`;
    const km = (meters / 1000).toFixed(1);
    return `${km}km`;
  };

  const openGoogleMapsDirections = () => {
    // Build Google Maps directions URL
    // Format: https://www.google.com/maps/dir/?api=1&origin=...&destination=...
    const params = new URLSearchParams({
      api: "1",
    });

    // Use location names if available, otherwise use coordinates
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

    // Map travel mode to Google Maps travel mode
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

  const hasDirections = segment.instructions && segment.instructions.length > 0;

  const isLoading = isRecalculating || segment.durationMinutes === 0;
  const showEstimatedBadge = segment.isEstimated && !isLoading;

  return (
    <>
      <div className="flex gap-3">
        {/* Spacer to match time column width */}
        <div className="w-14 shrink-0 sm:w-16" />
        {/* Travel segment content */}
        <div className="flex flex-1 items-center justify-center py-2 px-3 rounded-lg bg-surface">
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
          {segment.distanceMeters && (
            <>
              <span className="text-stone">•</span>
              <span className="text-sm text-foreground-secondary">{formatDistance(segment.distanceMeters)}</span>
            </>
          )}
          <span className="text-stone">•</span>
          <button
            type="button"
            className="text-sm text-sage hover:text-sage/80 font-medium"
            onClick={openGoogleMapsDirections}
            title={`View directions from ${originName || "origin"} to ${destinationName || "destination"} in Google Maps`}
          >
            View directions
          </button>
          {hasDirections && (
            <>
              <span className="text-stone">•</span>
              <button
                type="button"
                className="text-sm text-sage hover:text-sage/80 font-medium"
                onClick={() => setDirectionsOpen(true)}
              >
                Directions
              </button>
            </>
          )}
          </div>
        </div>
      </div>
      {hasDirections && (
        <Modal
          isOpen={directionsOpen}
          onClose={() => setDirectionsOpen(false)}
          title="Turn-by-turn Directions"
          description={`Traveling by ${segment.mode} from origin to destination`}
        >
          <div className="space-y-3">
            <ol className="space-y-2">
              {segment.instructions?.map((instruction, index) => (
                <li key={index} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage/10 text-xs font-semibold text-sage">
                    {index + 1}
                  </span>
                  <span className="flex-1 pt-0.5 text-warm-gray">{instruction}</span>
                </li>
              ))}
            </ol>
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setDirectionsOpen(false)}
                className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

