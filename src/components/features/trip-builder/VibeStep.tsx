"use client";

import { useEffect } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { VibeSelector } from "./VibeSelector";

export type VibeStepProps = {
  onValidityChange?: (isValid: boolean) => void;
};

/**
 * Travel style (vibes) selection sub-step.
 * Wrapper around the existing VibeSelector component.
 */
export function VibeStep({ onValidityChange }: VibeStepProps) {
  const { data } = useTripBuilder();

  const hasSelectedVibes = (data.vibes?.length ?? 0) > 0;

  // Report validity whenever vibes change
  useEffect(() => {
    onValidityChange?.(hasSelectedVibes);
  }, [hasSelectedVibes, onValidityChange]);

  return <VibeSelector />;
}
