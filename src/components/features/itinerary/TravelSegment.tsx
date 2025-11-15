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

  return (
    <>
      <div className="flex items-center justify-center py-1">
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          {isRecalculating && (
            <span className="text-xs text-gray-500">Recalculating...</span>
          )}
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
          {segment.distanceMeters && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-sm text-gray-600">{formatDistance(segment.distanceMeters)}</span>
            </>
          )}
          <span className="text-gray-400">•</span>
          <button
            type="button"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            onClick={openGoogleMapsDirections}
            title={`View directions from ${originName || "origin"} to ${destinationName || "destination"} in Google Maps`}
          >
            View directions
          </button>
          {hasDirections && (
            <>
              <span className="text-gray-400">•</span>
              <button
                type="button"
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                onClick={() => setDirectionsOpen(true)}
              >
                Directions
              </button>
            </>
          )}
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
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                    {index + 1}
                  </span>
                  <span className="flex-1 pt-0.5 text-gray-700">{instruction}</span>
                </li>
              ))}
            </ol>
            <div className="pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setDirectionsOpen(false)}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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

