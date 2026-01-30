"use client";

import { useEffect, useMemo } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { RegionSelector } from "./RegionSelector";
import { RegionMap } from "./RegionMap";

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
    <div className="flex h-full flex-col gap-6 lg:flex-row">
      {/* Region Selector - takes full width on mobile, 2/3 on desktop */}
      <div className="flex-1 lg:w-2/3">
        <div className="rounded-xl border border-border bg-background p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-charcoal">
              Choose Your Regions
            </h3>
            <p className="text-sm text-stone">
              Select the areas of Japan you&apos;d like to explore
            </p>
          </div>
          <RegionSelector />
        </div>
      </div>

      {/* Map Preview - hidden on mobile, 1/3 on desktop */}
      <div className="hidden lg:block lg:w-1/3">
        <div className="sticky top-4 h-[500px] overflow-hidden rounded-xl border border-border">
          <RegionMap />
        </div>
      </div>
    </div>
  );
}
