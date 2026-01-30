"use client";

import { useCallback, useEffect, useState } from "react";

import { EssentialsForm } from "./EssentialsForm";
import { VibeSelector } from "./VibeSelector";
import { useTripBuilder } from "@/context/TripBuilderContext";

export type PlanStepProps = {
  onValidityChange?: (isValid: boolean) => void;
};

export function PlanStep({ onValidityChange }: PlanStepProps) {
  const { data } = useTripBuilder();
  const [essentialsValid, setEssentialsValid] = useState(false);

  const handleEssentialsValidityChange = useCallback(
    (isValid: boolean) => {
      setEssentialsValid(isValid);
    },
    []
  );

  const hasSelectedVibes = (data.vibes?.length ?? 0) > 0;

  // Re-evaluate overall validity whenever essentials or vibes change
  useEffect(() => {
    onValidityChange?.(essentialsValid && hasSelectedVibes);
  }, [essentialsValid, hasSelectedVibes, onValidityChange]);

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Essentials Form */}
      <div className="rounded-xl border border-border bg-background p-5">
        <EssentialsForm onValidityChange={handleEssentialsValidityChange} />
      </div>

      {/* Vibe Selection */}
      <div className="rounded-xl border border-border bg-background p-5">
        <VibeSelector />
      </div>

      {/* Validation Message */}
      {!hasSelectedVibes && essentialsValid && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-sm text-warning">
            Select at least one vibe to continue to the next step.
          </p>
        </div>
      )}
    </div>
  );
}
