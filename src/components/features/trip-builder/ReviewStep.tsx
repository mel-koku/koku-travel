"use client";

import { useCallback, useMemo } from "react";

import { PreferenceCards } from "./PreferenceCards";
import { PlanningWarningsList } from "./PlanningWarning";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { detectPlanningWarnings } from "@/lib/planning/tripWarnings";

export type ReviewStepProps = {
  onValidityChange?: (isValid: boolean) => void;
};

export function ReviewStep({ onValidityChange }: ReviewStepProps) {
  const { data } = useTripBuilder();

  const handlePreferenceValidityChange = useCallback(
    (_isValid: boolean) => {
      // Step 3 is always considered valid since preferences are optional
      onValidityChange?.(true);
    },
    [onValidityChange]
  );

  // Detect planning warnings based on trip data
  const warnings = useMemo(() => detectPlanningWarnings(data), [data]);

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-serif text-2xl font-bold text-charcoal sm:text-3xl">
          Customize Your Experience
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-base text-warm-gray">
          All fields are optional. Add details to get more personalized recommendations, or skip ahead to generate your itinerary.
        </p>
      </div>

      {/* Planning Warnings */}
      {warnings.length > 0 && (
        <PlanningWarningsList warnings={warnings} />
      )}

      {/* Preference Cards */}
      <PreferenceCards onValidityChange={handlePreferenceValidityChange} />
    </div>
  );
}
