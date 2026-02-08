"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Info } from "lucide-react";

import { cn } from "@/lib/cn";
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

  const hasSelection = selectedRegions.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Combined instruction and selection status */}
      <div
        className={cn(
          "mx-auto flex max-w-2xl items-center gap-3 rounded-xl px-5 py-4 text-center transition-colors",
          hasSelection
            ? "bg-brand-primary/5 border border-brand-primary/20"
            : "bg-surface/50"
        )}
      >
        <Info className={cn(
          "h-5 w-5 shrink-0",
          hasSelection ? "text-brand-primary" : "text-foreground-secondary"
        )} />
        <p className="text-sm text-foreground">
          {hasSelection ? (
            <>
              <span className="font-semibold text-brand-primary">{selectedRegions.length}</span>{" "}
              {selectedRegions.length === 1 ? "region" : "regions"} selected.{" "}
              <span className="text-foreground-secondary">
                Click to add more or remove. Cities will be auto-selected based on your trip duration.
              </span>
            </>
          ) : (
            <>
              <span className="font-medium">Click on the regions</span> you&apos;d like to explore.
              We&apos;ve highlighted our top picks based on your preferences.
            </>
          )}
        </p>
      </div>

      {/* Region Grid - 1 column mobile, 2 columns tablet, 3 columns desktop */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {scoredRegions.map((scored) => (
          <RegionCard
            key={scored.region.id}
            region={scored.region}
            matchScore={scored.totalScore}
            isRecommended={scored.isRecommended}
            isEntryPointRegion={scored.isEntryPointRegion}
            isSelected={selectedRegions.includes(scored.region.id)}
            onToggle={() => toggleRegion(scored.region.id)}
          />
        ))}
      </div>

      {/* Validation Message - only show when no selection */}
      {!hasSelection && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-5 py-4 text-center">
          <p className="text-sm text-warning">
            Select at least one region to continue
          </p>
        </div>
      )}
    </div>
  );
}
