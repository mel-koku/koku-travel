"use client";

import { useEffect, useMemo } from "react";

import { SplitText } from "@/components/ui/SplitText";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { RegionSelector } from "./RegionSelector";
import { RegionMapPanel } from "./RegionMapPanel";
import { REGIONS } from "@/data/regions";
import type { KnownRegionId } from "@/types/trip";

export type RegionStepProps = {
  onValidityChange?: (isValid: boolean) => void;
};

export function RegionStep({ onValidityChange }: RegionStepProps) {
  const { data } = useTripBuilder();

  const hasSelectedRegions = useMemo(
    () => (data.regions?.length ?? 0) > 0,
    [data.regions]
  );

  useEffect(() => {
    onValidityChange?.(hasSelectedRegions);
  }, [hasSelectedRegions, onValidityChange]);

  // Get selected region names for map panel
  const selectedRegionNames = useMemo(() => {
    if (!data.regions?.length) return [];
    return data.regions
      .map((id) => REGIONS.find((r) => r.id === id)?.name)
      .filter(Boolean) as string[];
  }, [data.regions]);

  // Total cities across selected regions
  const totalCities = useMemo(() => {
    if (!data.regions?.length) return 0;
    return data.regions.reduce((sum, id) => {
      const region = REGIONS.find((r) => r.id === id);
      return sum + (region?.cities.length ?? 0);
    }, 0);
  }, [data.regions]);

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* Left (60%) — Scrollable region cards */}
      <div className="flex-1 px-6 py-8 lg:w-[60%] lg:overflow-y-auto lg:px-8 lg:py-12">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-brand-primary">
          STEP 04
        </p>

        <SplitText
          as="h2"
          className="mt-3 font-serif text-3xl italic tracking-tight text-foreground sm:text-4xl"
          splitBy="word"
          trigger="load"
          animation="clipY"
          staggerDelay={0.06}
        >
          Where are you headed?
        </SplitText>

        <p className="mt-2 text-base text-foreground-secondary">
          Pick one region or several — each one opens up a different side of Japan.
        </p>

        <div className="mt-8">
          <RegionSelector />
        </div>
      </div>

      {/* Right (40%) — Dark map panel (desktop only) */}
      <div className="hidden lg:block lg:w-[40%]">
        <div className="flex h-full flex-col bg-surface">
          <RegionMapPanel
            selectedRegions={(data.regions ?? []) as KnownRegionId[]}
            selectedRegionNames={selectedRegionNames}
            totalCities={totalCities}
          />
        </div>
      </div>
    </div>
  );
}
