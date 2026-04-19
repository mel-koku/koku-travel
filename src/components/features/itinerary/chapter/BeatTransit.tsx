"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type BeatTransitStep = {
  type: "walk" | "transit";
  walkMinutes?: number;
  walkInstruction?: string;
  lineName?: string;
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
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
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
  onToggle,
}: {
  minutes: number;
  mode: BeatTransitProps["mode"];
  line?: string;
  summary?: BeatTransitSummary;
  hasDetails: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const showStations =
    summary?.departureStop && summary?.arrivalStop;
  const displayLine =
    summary?.lineShortName ?? summary?.lineName ?? line;

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
      onClick={hasDetails ? onToggle : undefined}
      aria-expanded={hasDetails ? expanded : undefined}
      className={cn(
        "block text-[10px] text-foreground-secondary tracking-wide uppercase -mt-4 mb-1 ml-[-24px] text-left",
        hasDetails && "hover:text-foreground transition-colors",
      )}
    >
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {content}
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
    <div className="mb-4 ml-[-24px] space-y-2">
      {steps.map((step, i) => (
        <div
          key={i}
          className="border-l border-border pl-3"
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

export function BeatTransit({
  minutes,
  mode,
  line,
  steps,
  totalFareYen,
  summary,
}: BeatTransitProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(steps && steps.length > 1) || totalFareYen != null;

  return (
    <div>
      <CollapsedLine
        minutes={minutes}
        mode={mode}
        line={line}
        summary={summary}
        hasDetails={hasDetails}
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
      />
      {expanded && steps && steps.length > 0 && (
        <ExpandedDetails steps={steps} totalFareYen={totalFareYen} />
      )}
    </div>
  );
}
