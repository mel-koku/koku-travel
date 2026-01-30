"use client";

import { useEffect, useMemo } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { RegionSelector } from "./RegionSelector";

export type RegionStepProps = {
  onValidityChange?: (isValid: boolean) => void;
};

export function RegionStep({ onValidityChange }: RegionStepProps) {
  const { data } = useTripBuilder();

  const hasSelectedRegions = useMemo(
    () => (data.regions?.length ?? 0) > 0,
    [data.regions]
  );

  // Notify parent of validity whenever selection changes
  useEffect(() => {
    onValidityChange?.(hasSelectedRegions);
  }, [hasSelectedRegions, onValidityChange]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-serif text-2xl font-bold text-charcoal sm:text-3xl">
          Discover Japan&apos;s Regions
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-base text-warm-gray">
          Each region offers unique experiences, from ancient temples to modern cities.
        </p>
      </div>

      {/* Region Cards */}
      <RegionSelector />
    </div>
  );
}
