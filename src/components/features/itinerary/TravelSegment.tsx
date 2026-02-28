"use client";

import { useState } from "react";
import type { ItineraryTravelSegment, TransitStep } from "@/types/itinerary";
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

const VEHICLE_ICON: Record<string, string> = {
  HEAVY_RAIL: "\uD83D\uDE83",
  RAIL: "\uD83D\uDE83",
  SUBWAY: "\uD83D\uDE87",
  METRO_RAIL: "\uD83D\uDE87",
  TRAM: "\uD83D\uDE8B",
  LIGHT_RAIL: "\uD83D\uDE8B",
  BUS: "\uD83D\uDE8C",
  FERRY: "\u26F4\uFE0F",
};

function TransitStepRow({ step }: { step: TransitStep }) {
  if (step.type === "walk") {
    const label = step.walkInstruction ?? `Walk ${step.walkMinutes ?? ""}min`;
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-xs">{"\uD83D\uDEB6"}</span>
        <span className="text-xs text-foreground-secondary">{label}</span>
      </div>
    );
  }

  const icon = step.vehicleType
    ? VEHICLE_ICON[step.vehicleType.toUpperCase()] ?? "\uD83D\uDE83"
    : "\uD83D\uDE83";

  const lineParts: string[] = [];
  if (step.lineName) lineParts.push(step.lineName);
  else if (step.lineShortName) lineParts.push(step.lineShortName);

  const routeParts: string[] = [];
  if (step.departureStop && step.arrivalStop) {
    routeParts.push(`${step.departureStop} \u2192 ${step.arrivalStop}`);
  } else if (step.arrivalStop) {
    routeParts.push(`\u2192 ${step.arrivalStop}`);
  }
  if (step.numStops) {
    routeParts.push(`${step.numStops} stop${step.numStops > 1 ? "s" : ""}`);
  }
  if (step.durationMinutes) {
    routeParts.push(`${step.durationMinutes} min`);
  }

  return (
    <div className="flex items-start gap-2 py-1">
      <span className="text-xs">{icon}</span>
      <div className="min-w-0 flex-1">
        {lineParts.length > 0 && (
          <span className="text-xs font-semibold text-foreground">
            {lineParts.join(" ")}
          </span>
        )}
        {step.headsign && (
          <span className="ml-1 text-xs text-foreground-secondary">
            toward {step.headsign}
          </span>
        )}
        {routeParts.length > 0 && (
          <div className="text-xs text-foreground-secondary">
            {routeParts.join(" \u00B7 ")}
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [isExpanded, setIsExpanded] = useState(false);

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
  const hasTransitSteps =
    segment.transitSteps && segment.transitSteps.length > 0;

  return (
    <div>
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
          {segment.lastTrainWarning && (
            <span
              className="text-xs text-error font-medium"
              title="This departure may be after the last train"
            >
              Last train
            </span>
          )}
          {segment.rushHourWarning && !segment.lastTrainWarning && (
            <span
              className="text-xs text-warning font-medium"
              title="Expect crowded trains during rush hour"
            >
              Rush hour
            </span>
          )}
          {segment.distanceMeters && (
            <>
              <span className="text-stone">&middot;</span>
              <span className="font-mono text-sm text-foreground-secondary">{formatDistance(segment.distanceMeters)}</span>
            </>
          )}
          {hasTransitSteps && (
            <>
              <span className="text-stone">&middot;</span>
              <button
                type="button"
                className="text-sm text-sage hover:text-sage/80 font-medium"
                onClick={() => setIsExpanded(!isExpanded)}
                title="Show step-by-step transit directions"
              >
                Steps {isExpanded ? "\u25B4" : "\u25BE"}
              </button>
            </>
          )}
          <span className="text-stone">&middot;</span>
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

      {/* Expanded transit steps */}
      {isExpanded && hasTransitSteps && (
        <div className="mt-2 mx-4 rounded-xl border border-sage/20 bg-background/70 px-4 py-2">
          <div className="relative space-y-0">
            {/* Vertical connector line */}
            <div className="absolute left-[8px] top-3 bottom-3 w-px bg-sage/30" />
            {segment.transitSteps!.map((step, i) => (
              <div key={i} className="relative pl-6">
                <div
                  className={`absolute left-[5px] top-2.5 h-[7px] w-[7px] rounded-full ${
                    step.type === "transit" ? "bg-sage" : "bg-stone"
                  }`}
                />
                <TransitStepRow step={step} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
