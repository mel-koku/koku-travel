"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cEase } from "@c/ui/motionC";
import type { ItineraryTravelSegment, TransitStep } from "@/types/itinerary";
import type { Coordinate } from "@/lib/routing/types";
import { TravelModeSelectorC } from "./TravelModeSelectorC";

type TravelSegmentCProps = {
  segment: ItineraryTravelSegment;
  origin: Coordinate;
  destination: Coordinate;
  originName?: string;
  destinationName?: string;
  timezone?: string;
  onModeChange: (mode: ItineraryTravelSegment["mode"]) => void;
  isRecalculating?: boolean;
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
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {label}
        </span>
      </div>
    );
  }

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
    <div className="flex items-start gap-2.5 py-1">
      <TransitStepIcon step={step} />
      <div className="min-w-0 flex-1 space-y-0.5">
        {lineParts.length > 0 && (
          <p className="text-xs font-bold" style={{ color: "var(--foreground)" }}>
            {lineParts.join(" ")}
          </p>
        )}
        {routeParts.length > 0 && (
          <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            {routeParts.join(" \u00B7 ")}
          </p>
        )}
      </div>
    </div>
  );
}

export function TravelSegmentC({
  segment,
  origin,
  destination,
  originName: _originName,
  destinationName: _destinationName,
  timezone,
  onModeChange,
  isRecalculating,
  gapMinutes,
}: TravelSegmentCProps) {
  const [expanded, setExpanded] = useState(false);
  const hasTransitSteps = segment.transitSteps && segment.transitSteps.length > 0;

  return (
    <div className="relative py-2">
      {/* Hairline connector */}
      <div className="flex items-center gap-3">
        <div
          className="h-px flex-1"
          style={{ backgroundColor: "var(--border)" }}
        />

        {/* Travel info pill */}
        <div className="flex items-center gap-2">
          <TravelModeSelectorC
            currentMode={segment.mode}
            durationMinutes={segment.durationMinutes}
            departureTime={segment.departureTime}
            origin={origin}
            destination={destination}
            timezone={timezone}
            onModeChange={onModeChange}
          />

          {hasTransitSteps && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors hover:text-[var(--primary)] active:scale-[0.98]"
              style={{ color: "var(--muted-foreground)" }}
            >
              Details
              <ChevronDown
                className="h-3 w-3 transition-transform"
                style={{ transform: expanded ? "rotate(180deg)" : undefined }}
              />
            </button>
          )}

          {isRecalculating && (
            <svg
              className="h-3 w-3 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              style={{ color: "var(--primary)" }}
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
        </div>

        <div
          className="h-px flex-1"
          style={{ backgroundColor: "var(--border)" }}
        />
      </div>

      {/* Gap warning */}
      {gapMinutes != null && gapMinutes > 30 && (
        <div
          className="mt-1 text-center text-[10px] font-bold uppercase tracking-[0.1em]"
          style={{ color: "var(--warning)" }}
        >
          {gapMinutes} min gap
        </div>
      )}

      {/* Expanded transit steps */}
      <AnimatePresence>
        {expanded && hasTransitSteps && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: cEase }}
            className="overflow-hidden"
          >
            <div
              className="mx-auto mt-2 max-w-xs border-l-2 pl-3 py-1"
              style={{ borderColor: "var(--primary)" }}
            >
              {segment.transitSteps!.map((step, i) => (
                <TransitStepRow key={i} step={step} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
