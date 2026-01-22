"use client";

import { useCallback } from "react";

import { SelectionReview } from "./SelectionReview";
import { PreferenceCards } from "./PreferenceCards";

export type ReviewStepProps = {
  onBack?: () => void;
  onValidityChange?: (isValid: boolean) => void;
};

export function ReviewStep({ onBack, onValidityChange }: ReviewStepProps) {
  const handlePreferenceValidityChange = useCallback(
    (_isValid: boolean) => {
      // Step 2 is always considered valid since preferences are optional
      onValidityChange?.(true);
    },
    [onValidityChange]
  );

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Selection Review */}
      <SelectionReview onEdit={onBack} />

      {/* Preference Cards */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Customize Your Experience
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Fine-tune your preferences to get personalized recommendations.
          </p>
        </div>

        <PreferenceCards onValidityChange={handlePreferenceValidityChange} />
      </div>
    </div>
  );
}
