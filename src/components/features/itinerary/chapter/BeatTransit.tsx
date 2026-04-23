"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type BeatTransitStep = {
  type: "walk" | "transit";
  walkMinutes?: number;
  walkInstruction?: string;
  lineName?: string;
  lineNameRomaji?: string;
  lineShortName?: string;
  lineColor?: string;
  trainType?: string;
  departureStop?: string;
  arrivalStop?: string;
  headsign?: string;
  numStops?: number;
  durationMinutes?: number;
  departureGateway?: string;
  arrivalGateway?: string;
  fareYen?: number;
  carPosition?: string;
};

export type BeatTransitSummary = {
  departureStop?: string;
  arrivalStop?: string;
  lineName?: string;
  lineShortName?: string;
  lineColor?: string;
};

export type BeatTransitProps = {
  minutes: number;
  mode: "walk" | "train" | "car" | "bus" | "transit";
  line?: string;
  steps?: BeatTransitStep[];
  totalFareYen?: number;
  summary?: BeatTransitSummary;
  /** Origin location for Google Maps escape hatch */
  origin?: { lat: number; lng: number; name?: string };
  /** Destination location for Google Maps escape hatch */
  destination?: { lat: number; lng: number; name?: string };
  /** True when the travel time is a heuristic estimate, not from a real routing API */
  isEstimated?: boolean;
};

const labelForMode: Record<BeatTransitProps["mode"], string> = {
  walk: "walk",
  train: "train",
  car: "drive",
  bus: "bus",
  transit: "transit",
};

function LineDot({ color }: { color?: string }) {
  if (!color) return null;
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

function CollapsedLine({
  minutes,
  mode,
  line,
  summary,
  hasDetails,
  expanded,
  isEstimated,
  onToggle,
}: {
  minutes: number;
  mode: BeatTransitProps["mode"];
  line?: string;
  summary?: BeatTransitSummary;
  hasDetails: boolean;
  expanded: boolean;
  isEstimated?: boolean;
  onToggle: () => void;
}) {
  const showStations = summary?.departureStop && summary?.arrivalStop;
  const displayLine = summary?.lineShortName ?? summary?.lineName ?? line;

  let content: React.ReactNode;

  if (showStations) {
    content = (
      <span className="inline-flex items-center gap-1 flex-wrap">
        <span>↓ {minutes} min</span>
        <span aria-hidden="true">·</span>
        <span>
          {summary!.departureStop} → {summary!.arrivalStop}
        </span>
        {displayLine && (
          <>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <LineDot color={summary?.lineColor} />
              {displayLine}
            </span>
          </>
        )}
      </span>
    );
  } else if (displayLine) {
    content = (
      <span className="inline-flex items-center gap-1 flex-wrap">
        <span>↓ {minutes} min</span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <LineDot color={summary?.lineColor} />
          {displayLine}
        </span>
      </span>
    );
  } else {
    content = (
      <span>
        ↓ {minutes} min {labelForMode[mode]}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={hasDetails ? (e) => { e.stopPropagation(); onToggle(); } : undefined}
      aria-expanded={hasDetails ? expanded : undefined}
      className={cn(
        "flex-1 text-[10px] text-foreground-secondary tracking-wide uppercase text-left",
        hasDetails && "hover:text-foreground transition-colors",
      )}
    >
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {content}
        {isEstimated && (
          <span className="text-[9px] opacity-60 italic normal-case tracking-normal">(est.)</span>
        )}
        {hasDetails && (
          <span className="text-[9px] opacity-60 normal-case tracking-normal">
            {expanded ? "Details ↑" : "Details ↓"}
          </span>
        )}
      </span>
    </button>
  );
}

function WalkStep({ step }: { step: BeatTransitStep }) {
  return (
    <div className="text-xs text-foreground-secondary">
      <span className="text-foreground-secondary/60 mr-1">↳</span>
      Walk {step.walkMinutes} min
      {step.walkInstruction && (
        <span className="text-foreground-secondary/80"> — {step.walkInstruction}</span>
      )}
    </div>
  );
}

function TransitStep({ step }: { step: BeatTransitStep }) {
  const displayLine = step.lineShortName ?? step.lineName;
  const boardingMeta = [step.departureGateway, step.carPosition ? `${step.carPosition} car` : undefined]
    .filter(Boolean)
    .join(" · ");
  const lineMeta = [
    step.trainType,
    step.numStops != null ? `${step.numStops} stop${step.numStops !== 1 ? "s" : ""}` : undefined,
    step.durationMinutes != null ? `${step.durationMinutes} min` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-0.5">
      {step.departureStop && step.arrivalStop && (
        <div className="text-sm font-medium text-foreground">
          {step.departureStop} → {step.arrivalStop}
        </div>
      )}
      {displayLine && (
        <div className="inline-flex items-center gap-1.5 text-xs text-foreground-secondary flex-wrap">
          <LineDot color={step.lineColor} />
          <span>{displayLine}</span>
          {step.lineNameRomaji && (
            <span className="text-[10px] text-foreground-secondary/60">{step.lineNameRomaji}</span>
          )}
          {lineMeta && (
            <>
              <span aria-hidden="true">·</span>
              <span>{lineMeta}</span>
            </>
          )}
        </div>
      )}
      {boardingMeta && (
        <div className="text-xs text-foreground-secondary/70">
          Board at {boardingMeta}
        </div>
      )}
      {step.fareYen != null && step.fareYen > 0 && (
        <div className="text-xs text-foreground-secondary">¥{step.fareYen}</div>
      )}
    </div>
  );
}

function ExpandedDetails({
  steps,
  totalFareYen,
}: {
  steps: BeatTransitStep[];
  totalFareYen?: number;
}) {
  return (
    <div className="mb-4 space-y-2">
      {steps.map((step, i) => (
        <div
          key={i}
          className="border-l border-border pl-3 ml-3"
        >
          {step.type === "walk" ? (
            <WalkStep step={step} />
          ) : (
            <TransitStep step={step} />
          )}
        </div>
      ))}
      {totalFareYen != null && totalFareYen > 0 && (
        <div className="pl-3 text-xs font-medium text-foreground">
          Total ¥{totalFareYen}
        </div>
      )}
    </div>
  );
}

const TRAVEL_MODE_MAP: Record<BeatTransitProps["mode"], string> = {
  walk: "walking",
  car: "driving",
  bus: "transit",
  train: "transit",
  transit: "transit",
};

export function BeatTransit({
  minutes,
  mode,
  line,
  steps,
  totalFareYen,
  summary,
  origin,
  destination,
  isEstimated,
}: BeatTransitProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(steps && steps.length > 1) || totalFareYen != null;
  const hasMapsLink = Boolean(origin && destination);

  function openInGoogleMaps() {
    if (!origin || !destination) return;

    const params = new URLSearchParams({ api: "1" });
    params.append("origin", origin.name ?? `${origin.lat},${origin.lng}`);
    params.append("destination", destination.name ?? `${destination.lat},${destination.lng}`);
    params.append("travelmode", TRAVEL_MODE_MAP[mode] ?? "transit");

    window.open(
      `https://www.google.com/maps/dir/?${params.toString()}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="relative z-10">
      <div className="flex items-baseline gap-3 mt-2 mb-6">
        <CollapsedLine
          minutes={minutes}
          mode={mode}
          line={line}
          summary={summary}
          hasDetails={hasDetails}
          expanded={expanded}
          isEstimated={isEstimated}
          onToggle={() => setExpanded((v) => !v)}
        />
        {hasMapsLink && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openInGoogleMaps();
            }}
            className="shrink-0 text-[10px] text-accent uppercase tracking-wide underline underline-offset-2"
          >
            Open in Maps ↗
          </button>
        )}
      </div>
      {expanded && steps && steps.length > 0 && (
        <ExpandedDetails steps={steps} totalFareYen={totalFareYen} />
      )}
    </div>
  );
}
