"use client";

import { useCallback, useEffect, useState } from "react";

import { EssentialsForm } from "./EssentialsForm";
import { InterestChips } from "./InterestChips";
import { CityList } from "./CityList";
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

  const hasSelectedCities = (data.cities?.length ?? 0) > 0;

  // Re-evaluate overall validity whenever essentials or cities change
  useEffect(() => {
    onValidityChange?.(essentialsValid && hasSelectedCities);
  }, [essentialsValid, hasSelectedCities, onValidityChange]);
  const hasSelectedInterests = (data.interests?.length ?? 0) > 0;

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Essentials Form */}
      <div className="rounded-xl border border-border bg-background p-5">
        <EssentialsForm onValidityChange={handleEssentialsValidityChange} />
      </div>

      {/* Interests + City Selection */}
      <div className="flex flex-1 flex-col gap-4">
        {/* Interest Chips */}
        <div className="rounded-xl border border-border bg-background p-4">
          <InterestChips />
        </div>

        {/* City Selection Header */}
        <div>
          <h3 className="text-lg font-semibold text-charcoal">
            Select Cities
          </h3>
          <p className="text-sm text-foreground-secondary">
            {hasSelectedInterests
              ? "Cities are highlighted based on your interests."
              : "Choose which cities to visit on your trip."}
          </p>
        </div>

        {/* City Selection List */}
        <div className="flex-1 min-h-[400px]">
          <CityList />
        </div>

        {/* Validation Message */}
        {!hasSelectedCities && essentialsValid && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
            <p className="text-sm text-warning">
              Select at least one city to continue to the next step.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
