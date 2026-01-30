"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { RegionCard } from "./RegionCard";
import {
  scoreRegionsForTrip,
  autoSelectRegions,
} from "@/lib/tripBuilder/regionScoring";
import type { KnownRegionId } from "@/types/trip";

export type RegionSelectorProps = {
  onSelectionChange?: (regions: KnownRegionId[]) => void;
};

export function RegionSelector({ onSelectionChange }: RegionSelectorProps) {
  const { data, setData } = useTripBuilder();
  const hasAutoSelected = useRef(false);

  const vibes = useMemo(() => data.vibes ?? [], [data.vibes]);
  const selectedRegions = useMemo(() => data.regions ?? [], [data.regions]);

  // Score regions based on vibes and entry point
  const scoredRegions = useMemo(
    () => scoreRegionsForTrip(vibes, data.entryPoint),
    [vibes, data.entryPoint]
  );

  // Auto-select recommended regions on initial load
  useEffect(() => {
    if (hasAutoSelected.current) return;
    if (selectedRegions.length > 0) {
      hasAutoSelected.current = true;
      return;
    }

    const autoSelected = autoSelectRegions(vibes, data.entryPoint, data.duration);
    if (autoSelected.length > 0) {
      setData((prev) => ({
        ...prev,
        regions: autoSelected,
      }));
      onSelectionChange?.(autoSelected);
      hasAutoSelected.current = true;
    }
  }, [vibes, data.entryPoint, data.duration, selectedRegions.length, setData, onSelectionChange]);

  const toggleRegion = useCallback(
    (regionId: KnownRegionId) => {
      setData((prev) => {
        const current = new Set<string>(prev.regions ?? []);
        if (current.has(regionId)) {
          current.delete(regionId);
        } else {
          current.add(regionId);
        }
        const nextRegions = Array.from(current) as KnownRegionId[];
        onSelectionChange?.(nextRegions);
        return {
          ...prev,
          regions: nextRegions,
        };
      });
    },
    [setData, onSelectionChange]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Region Grid - 1 column mobile, 2 columns tablet, 3 columns desktop */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {scoredRegions.map((scored) => (
          <RegionCard
            key={scored.region.id}
            region={scored.region}
            matchScore={scored.totalScore}
            isRecommended={scored.isRecommended}
            isSelected={selectedRegions.includes(scored.region.id)}
            onToggle={() => toggleRegion(scored.region.id)}
          />
        ))}
      </div>

      {/* Selection Summary */}
      {selectedRegions.length > 0 && (
        <div className="rounded-xl bg-brand-primary/5 border border-brand-primary/20 px-5 py-4 text-center">
          <p className="text-sm text-charcoal">
            <span className="font-semibold text-brand-primary">{selectedRegions.length}</span>{" "}
            {selectedRegions.length === 1 ? "region" : "regions"} selected
            <span className="mx-2 text-stone">·</span>
            <span className="text-stone">Cities will be auto-selected based on your trip duration</span>
          </p>
        </div>
      )}

      {/* Validation Message */}
      {selectedRegions.length === 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-5 py-4 text-center">
          <p className="text-sm text-warning">
            Select at least one region to continue
          </p>
        </div>
      )}
    </div>
  );
}
