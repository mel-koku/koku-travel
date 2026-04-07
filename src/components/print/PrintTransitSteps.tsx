import type { TransitStep } from "@/types/itinerary";

type PrintTransitStepsProps = {
  steps: TransitStep[];
};

/**
 * Print-friendly static renderer for transit step sequences.
 * No emojis (unreliable in print), no interactivity.
 * Uses monospace for station names and durations.
 */
export function PrintTransitSteps({ steps }: PrintTransitStepsProps) {
  const totalFare = steps.reduce((sum, s) => sum + (s.fareYen ?? 0), 0);

  return (
    <div className="mt-1 mb-2 ml-[16mm] space-y-0.5">
      {steps.map((step, i) => (
        <PrintTransitStep key={i} step={step} />
      ))}
      {totalFare > 0 && (
        <p className="font-mono text-[7pt] text-foreground-secondary mt-1">
          {`\u00A5${totalFare.toLocaleString()}`}
        </p>
      )}
    </div>
  );
}

function PrintTransitStep({ step }: { step: TransitStep }) {
  if (step.type === "walk") {
    return (
      <div className="flex items-baseline gap-2 py-px">
        <span className="font-mono text-[7pt] uppercase tracking-[0.1em] text-foreground-secondary w-6 shrink-0">
          Walk
        </span>
        <span className="font-sans text-[8pt] text-foreground-secondary">
          {step.walkInstruction ?? `${step.walkMinutes ?? ""}min`}
        </span>
      </div>
    );
  }

  const lineName = step.lineName || step.lineShortName || "Transit";
  const hints: string[] = [];
  if (step.carPosition) hints.push(`Board: ${step.carPosition}`);
  if (step.departureGateway) hints.push(`Enter: ${step.departureGateway}`);
  if (step.arrivalGateway) hints.push(`Exit: ${step.arrivalGateway}`);

  return (
    <div className="print-avoid-break py-px">
      <div className="flex items-baseline gap-2">
        {step.lineColor && (
          <span
            className="inline-block h-[5pt] w-[5pt] rounded-full shrink-0 translate-y-[-1px]"
            style={{ backgroundColor: step.lineColor }}
          />
        )}
        <span className="font-sans text-[8pt] font-semibold text-foreground">
          {lineName}
        </span>
        {step.trainType && step.trainType !== "Local" && (
          <span className="font-mono text-[7pt] text-foreground-secondary">
            {step.trainType}
          </span>
        )}
        {step.fareYen && (
          <span className="font-mono text-[7pt] text-foreground-secondary">
            {`\u00A5${step.fareYen}`}
          </span>
        )}
      </div>
      {step.headsign && (
        <p className="font-sans text-[7.5pt] text-foreground-secondary ml-[7pt]">
          toward {step.headsign}
        </p>
      )}
      {step.departureStop && step.arrivalStop && (
        <p className="font-mono text-[7pt] text-foreground-secondary ml-[7pt]">
          {step.departureStop} {"\u2192"} {step.arrivalStop}
          {step.numStops ? ` \u00B7 ${step.numStops} stop${step.numStops > 1 ? "s" : ""}` : ""}
          {step.durationMinutes ? ` \u00B7 ${step.durationMinutes}min` : ""}
        </p>
      )}
      {hints.length > 0 && (
        <p className="font-mono text-[7pt] text-stone ml-[7pt]">
          {hints.join(" \u00B7 ")}
        </p>
      )}
    </div>
  );
}
