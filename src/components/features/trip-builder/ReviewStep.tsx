"use client";

import { useCallback } from "react";

import { PreferenceCards } from "./PreferenceCards";

export type ReviewStepProps = {
  onValidityChange?: (isValid: boolean) => void;
};

export function ReviewStep({ onValidityChange }: ReviewStepProps) {
  const handlePreferenceValidityChange = useCallback(
    (_isValid: boolean) => {
      // Step 3 is always considered valid since preferences are optional
      onValidityChange?.(true);
    },
    [onValidityChange]
  );

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

      {/* Preference Cards */}
      <PreferenceCards onValidityChange={handlePreferenceValidityChange} />
    </div>
  );
}
