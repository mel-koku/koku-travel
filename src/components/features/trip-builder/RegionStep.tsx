"use client";

import { useEffect, useMemo } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { SplitText } from "@/components/ui/SplitText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
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
      {/* Header with dramatic typography */}
      <div className="text-center">
        <SplitText
          as="h2"
          className="justify-center font-serif text-2xl font-bold text-charcoal sm:text-3xl"
          splitBy="word"
          trigger="load"
          animation="clipY"
          staggerDelay={0.06}
        >
          Discover Japan&apos;s Regions
        </SplitText>
        <ScrollReveal delay={0.3} distance={15}>
          <p className="mx-auto mt-2 max-w-2xl text-base text-warm-gray">
            Each region offers unique experiences, from ancient temples to modern cities.
          </p>
        </ScrollReveal>
      </div>

      {/* Region Cards */}
      <RegionSelector />
    </div>
  );
}
