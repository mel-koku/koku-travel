"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { ItineraryTravelSegment, TransitStep } from "@/types/itinerary";
import type { Coordinate } from "@/lib/routing/types";
import { TravelModeSelectorB } from "./TravelModeSelectorB";

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

function TransitStepIcon({ step }: { step: TransitStep }) {
  if (step.type === "walk") {
    return <span className="text-xs">{"\uD83D\uDEB6"}</span>;
  }
  const icon = step.vehicleType
    ? VEHICLE_ICON[step.vehicleType.toUpperCase()] ?? "\uD83D\uDE83"
    : "\uD83D\uDE83";
  return <span className="text-xs">{icon}</span>;
}

function TransitStepRow({ step }: { step: TransitStep }) {
  if (step.type === "walk") {
    const label = step.walkInstruction ?? `Walk ${step.walkMinutes ?? ""}min`;
    return (
      <div className="flex items-center gap-2.5 py-1">
        <TransitStepIcon step={step} />
        <span
          className="text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          {label}
        </span>
      </div>
    );
  }

  // Transit step
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
    routeParts.push(
      `${step.numStops} stop${step.numStops > 1 ? "s" : ""}`,
    );
  }
  if (step.durationMinutes) {
    routeParts.push(`${step.durationMinutes} min`);
  }

  return (
    <div className="flex items-start gap-2.5 py-1">
      <TransitStepIcon step={step} />
      <div className="min-w-0 flex-1">
        {lineParts.length > 0 && (
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {lineParts.join(" ")}
          </span>
        )}
        {step.headsign && (
          <span
            className="ml-1 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            toward {step.headsign}
          </span>
        )}
        {routeParts.length > 0 && (
          <div
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {routeParts.join(" \u00B7 ")}
          </div>
        )}
      </div>
    </div>
  );
}

export function TravelSegmentB({
  segment,
  origin,
  destination,
  originName,
  destinationName,
  timezone,
  onModeChange,
  isRecalculating = false,
  gapMinutes,
}: TravelSegmentBProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const distance = formatDistance(segment.distanceMeters);
  const hasTransitSteps =
    segment.transitSteps && segment.transitSteps.length > 0;

  return (
    <div className="py-2 px-2">
      {/* Collapsed pill row */}
      <div className="flex items-center gap-3">
        <div
          className="h-px flex-1 border-t border-dashed"
          style={{ borderColor: "var(--border)" }}
        />

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
              <TravelModeSelectorB
                currentMode={segment.mode}
                durationMinutes={segment.durationMinutes}
                departureTime={segment.departureTime}
                origin={origin}
                destination={destination}
                timezone={timezone}
                onModeChange={onModeChange}
              />
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
                <span
                  className="text-[10px]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {distance}
                </span>
              )}
              {hasTransitSteps && (
                <button
                  type="button"
                  className="flex items-center gap-0.5 text-xs font-medium text-[var(--primary)] transition-colors duration-200 hover:underline hover:text-[var(--foreground)]"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title="Show step-by-step transit directions"
                >
                  Steps
                  <ChevronDown
                    className="h-3 w-3 transition-transform duration-200"
                    style={{
                      transform: isExpanded ? "rotate(180deg)" : undefined,
                    }}
                  />
                </button>
              )}
              <button
                type="button"
                className="text-xs font-medium text-[var(--primary)] transition-colors duration-200 hover:underline hover:text-[var(--foreground)]"
                onClick={openGoogleMapsDirections}
                title={`Directions from ${originName || "origin"} to ${destinationName || "destination"}`}
              >
                Directions
              </button>
            </>
          )}
        </div>

        <div
          className="h-px flex-1 border-t border-dashed"
          style={{ borderColor: "var(--border)" }}
        />
      </div>

      {/* Expanded transit steps */}
      <AnimatePresence initial={false}>
        {isExpanded && hasTransitSteps && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div
              className="mx-auto mt-2 max-w-md rounded-xl border px-4 py-2"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--card)",
              }}
            >
              {/* Vertical step list with connecting line */}
              <div className="relative space-y-0">
                {/* Vertical connector line */}
                <div
                  className="absolute left-[8px] top-3 bottom-3 w-px"
                  style={{
                    backgroundColor: "var(--border)",
                  }}
                />
                {segment.transitSteps!.map((step, i) => (
                  <div key={i} className="relative pl-6">
                    {/* Step dot */}
                    <div
                      className="absolute left-[5px] top-2.5 h-[7px] w-[7px] rounded-full"
                      style={{
                        backgroundColor:
                          step.type === "transit"
                            ? "var(--primary)"
                            : "var(--muted-foreground)",
                      }}
                    />
                    <TransitStepRow step={step} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
