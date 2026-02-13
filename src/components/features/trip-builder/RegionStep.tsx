"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Check, MapPin } from "lucide-react";

import { cn } from "@/lib/cn";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { REGIONS, deriveRegionsFromCities } from "@/data/regions";
import {
  scoreRegionsForTrip,
  autoSelectCities,
} from "@/lib/tripBuilder/regionScoring";
import type { KnownCityId, KnownRegionId } from "@/types/trip";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";
import type { RegionDescription } from "@/data/regionDescriptions";
import { easeCinematicMut } from "@/lib/motion";

import { RegionMapCanvas } from "./RegionMapCanvas";
import { RegionRow } from "./RegionRow";
import { RegionDetailPanel } from "./RegionDetailPanel";
import { RegionSummaryPill } from "./RegionSummaryPill";
import { checkLocationCapacity } from "@/lib/tripBuilder/locationCapacity";

export type RegionStepProps = {
  onValidityChange?: (isValid: boolean) => void;
  sanityConfig?: TripBuilderConfig;
};

/** Merge Sanity overrides into a RegionDescription, falling back to hardcoded values */
function mergeRegionOverride(
  region: RegionDescription,
  sanityRegionMap: Map<string, NonNullable<TripBuilderConfig["regions"]>[number]> | null
): RegionDescription {
  if (!sanityRegionMap) return region;
  const override = sanityRegionMap.get(region.id);
  if (!override) return region;
  return {
    ...region,
    name: override.name || region.name,
    tagline: override.tagline || region.tagline,
    description: override.description || region.description,
    highlights: override.highlights?.length ? override.highlights : region.highlights,
    heroImage: override.heroImage?.url ?? region.heroImage,
  };
}

export function RegionStep({ onValidityChange, sanityConfig }: RegionStepProps) {
  const { data, setData } = useTripBuilder();
  const hasAutoSelected = useRef(false);
  const hoverClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hoveredRegion, setHoveredRegion] = useState<KnownRegionId | null>(null);
  const [expandedRegion, setExpandedRegion] = useState<KnownRegionId | null>(null);

  // Debounced hover: cancel any pending clear, set immediately
  const handleHoverRegion = useCallback((regionId: KnownRegionId) => {
    if (hoverClearTimer.current) {
      clearTimeout(hoverClearTimer.current);
      hoverClearTimer.current = null;
    }
    setHoveredRegion(regionId);
  }, []);

  // Debounced leave: delay clear so cursor can travel to the detail panel
  const handleLeaveRegion = useCallback(() => {
    hoverClearTimer.current = setTimeout(() => {
      setHoveredRegion(null);
      hoverClearTimer.current = null;
    }, 275);
  }, []);

  // Detail panel hover keeps the panel alive
  const handlePanelEnter = useCallback(() => {
    if (hoverClearTimer.current) {
      clearTimeout(hoverClearTimer.current);
      hoverClearTimer.current = null;
    }
  }, []);

  const handlePanelLeave = useCallback(() => {
    hoverClearTimer.current = setTimeout(() => {
      setHoveredRegion(null);
      hoverClearTimer.current = null;
    }, 275);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hoverClearTimer.current) clearTimeout(hoverClearTimer.current);
    };
  }, []);

  // Build Sanity override lookup by regionId
  const sanityRegions = sanityConfig?.regions;
  const sanityRegionMap = useMemo(() => {
    if (!sanityRegions?.length) return null;
    const map = new Map<string, NonNullable<TripBuilderConfig["regions"]>[number]>();
    for (const r of sanityRegions) {
      map.set(r.regionId, r);
    }
    return map;
  }, [sanityRegions]);

  const vibes = useMemo(() => data.vibes ?? [], [data.vibes]);

  // City-level selection (primary source of truth)
  const selectedCities = useMemo(
    () => new Set<KnownCityId>((data.cities ?? []) as KnownCityId[]),
    [data.cities]
  );

  // Derive regions from selected cities (for map highlighting & summary)
  const derivedRegions = useMemo(
    () => deriveRegionsFromCities(Array.from(selectedCities)),
    [selectedCities]
  );

  const derivedRegionNames = useMemo(
    () =>
      derivedRegions
        .map((id) => REGIONS.find((r) => r.id === id)?.name)
        .filter(Boolean) as string[],
    [derivedRegions]
  );

  // Check if selected cities have enough locations for the trip duration
  const locationWarning = useMemo(
    () =>
      checkLocationCapacity(
        Array.from(selectedCities) as KnownCityId[],
        data.duration ?? 0,
      ),
    [selectedCities, data.duration],
  );

  // Score regions and merge Sanity overrides
  const scoredRegions = useMemo(() => {
    const scored = scoreRegionsForTrip(vibes, data.entryPoint);
    if (!sanityRegionMap) return scored;
    return scored.map((s) => ({
      ...s,
      region: mergeRegionOverride(s.region, sanityRegionMap),
    }));
  }, [vibes, data.entryPoint, sanityRegionMap]);

  // Auto-select cities on mount
  useEffect(() => {
    if (hasAutoSelected.current) return;
    if (selectedCities.size > 0) {
      hasAutoSelected.current = true;
      return;
    }

    const autoCities = autoSelectCities(vibes, data.entryPoint, data.duration);
    if (autoCities.length > 0) {
      const autoRegions = deriveRegionsFromCities(autoCities);
      setData((prev) => ({ ...prev, cities: autoCities, regions: autoRegions }));
      hasAutoSelected.current = true;
    }
  }, [vibes, data.entryPoint, data.duration, selectedCities.size, setData]);

  // Validity
  useEffect(() => {
    onValidityChange?.(selectedCities.size > 0);
  }, [selectedCities.size, onValidityChange]);

  // Toggle a single city
  const toggleCity = useCallback(
    (cityId: KnownCityId) => {
      setData((prev) => {
        const current = new Set<KnownCityId>((prev.cities ?? []) as KnownCityId[]);
        if (current.has(cityId)) {
          current.delete(cityId);
        } else {
          current.add(cityId);
        }
        const cities = Array.from(current);
        return { ...prev, cities, regions: deriveRegionsFromCities(cities) };
      });
    },
    [setData]
  );

  // Select all cities in a region
  const selectAllRegion = useCallback(
    (regionId: KnownRegionId) => {
      setData((prev) => {
        const current = new Set<KnownCityId>((prev.cities ?? []) as KnownCityId[]);
        const regionCities = REGIONS.find((r) => r.id === regionId)?.cities ?? [];
        regionCities.forEach((c) => current.add(c.id));
        const cities = Array.from(current);
        return { ...prev, cities, regions: deriveRegionsFromCities(cities) };
      });
    },
    [setData]
  );

  // Deselect all cities in a region
  const deselectAllRegion = useCallback(
    (regionId: KnownRegionId) => {
      setData((prev) => {
        const current = new Set<KnownCityId>((prev.cities ?? []) as KnownCityId[]);
        const regionCities = REGIONS.find((r) => r.id === regionId)?.cities ?? [];
        regionCities.forEach((c) => current.delete(c.id));
        const cities = Array.from(current);
        return { ...prev, cities, regions: deriveRegionsFromCities(cities) };
      });
    },
    [setData]
  );

  // Detail panel region (from hover on desktop)
  const detailRegion = useMemo(() => {
    if (!hoveredRegion) return null;
    return scoredRegions.find((s) => s.region.id === hoveredRegion)?.region ?? null;
  }, [hoveredRegion, scoredRegions]);

  // Mobile expand handler — expansion only (no selection)
  const handleMobileToggle = useCallback(
    (regionId: KnownRegionId) => {
      setExpandedRegion((prev) => (prev === regionId ? null : regionId));
    },
    []
  );

  // Helper: get city counts for a region
  const getCityCounts = useCallback(
    (regionId: KnownRegionId) => {
      const regionCities = REGIONS.find((r) => r.id === regionId)?.cities ?? [];
      const total = regionCities.length;
      const selected = regionCities.filter((c) => selectedCities.has(c.id)).length;
      return { selected, total };
    },
    [selectedCities]
  );

  return (
    <div className="relative min-h-[calc(100dvh-5rem)] bg-background">
      {/* Layer 0: Map canvas — fixed to viewport so it never scrolls */}
      <div className="fixed inset-0 z-0">
        <RegionMapCanvas
          hoveredRegion={hoveredRegion}
          selectedRegions={derivedRegions}
        />

        {/* Grain/texture overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Layer 1: Scrollable content — flows over the fixed map */}
      <div className="relative z-10">
        {/* Heading */}
        <div className="px-6 pt-24 lg:max-w-[45%] lg:px-10 lg:pt-28">
          <p className="eyebrow-editorial text-brand-primary">
            STEP 04
          </p>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeCinematicMut, delay: 0.15 }}
            className="mt-3 font-serif text-3xl italic tracking-tight text-foreground sm:text-4xl lg:text-5xl"
          >
            {sanityConfig?.regionStepHeading ?? "Where are you headed?"}
          </motion.h2>

          <p className="mt-3 text-sm text-stone lg:text-base">
            {sanityConfig?.regionStepDescription ?? "Pick your cities. Highlighted ones match your travel style."}
          </p>
        </div>

        {/* Region rows */}
        <div className="mt-8 px-4 pb-32 lg:max-w-[45%] lg:px-8">
          {scoredRegions.map((scored, i) => {
            const { selected, total } = getCityCounts(scored.region.id);
            const cityNames = REGIONS.find((r) => r.id === scored.region.id)?.cities.map((c) => c.name) ?? [];
            return (
              <div key={scored.region.id}>
                {/* Desktop: hover-driven */}
                <div className="hidden lg:block">
                  <RegionRow
                    index={i}
                    region={scored.region}
                    cityNames={cityNames}
                    matchScore={scored.totalScore}
                    selectedCityCount={selected}
                    totalCityCount={total}
                    isHovered={hoveredRegion === scored.region.id}
                    isRecommended={scored.isRecommended}
                    isEntryPointRegion={scored.isEntryPointRegion}
                    onClick={() => handleHoverRegion(scored.region.id)}
                    onHover={() => handleHoverRegion(scored.region.id)}
                    onLeave={handleLeaveRegion}
                  />
                </div>

                {/* Mobile: tap-driven with inline expand */}
                <div className="lg:hidden">
                  <RegionRow
                    index={i}
                    region={scored.region}
                    cityNames={cityNames}
                    matchScore={scored.totalScore}
                    selectedCityCount={selected}
                    totalCityCount={total}
                    isHovered={expandedRegion === scored.region.id}
                    isRecommended={scored.isRecommended}
                    isEntryPointRegion={scored.isEntryPointRegion}
                    onClick={() => handleMobileToggle(scored.region.id)}
                    onHover={() => {}}
                    onLeave={() => {}}
                  />

                  {/* Mobile inline detail */}
                  <AnimatePresence>
                    {expandedRegion === scored.region.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          duration: 0.4,
                          ease: easeCinematicMut,
                        }}
                        className="overflow-hidden"
                      >
                        <MobileRegionDetail
                          region={scored.region}
                          selectedCities={selectedCities}
                          onToggleCity={toggleCity}
                          onSelectAllRegion={selectAllRegion}
                          onDeselectAllRegion={deselectAllRegion}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary pill — fixed to viewport */}
      <div className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] left-1/2 z-20 -translate-x-1/2">
        <RegionSummaryPill
          selectedCityCount={selectedCities.size}
          derivedRegionNames={derivedRegionNames}
          warning={locationWarning}
        />
      </div>

      {/* Desktop detail panel — fixed to viewport, z-40 to sit above StepProgressTrack (z-30).
           pointer-events-none on wrapper so it doesn't block clicks when panel is hidden. */}
      <div className="pointer-events-none fixed inset-y-0 right-0 z-40 hidden w-[40%] lg:block">
        <RegionDetailPanel
          region={detailRegion}
          selectedCities={selectedCities}
          onToggleCity={toggleCity}
          onSelectAllRegion={selectAllRegion}
          onDeselectAllRegion={deselectAllRegion}
          onPanelEnter={handlePanelEnter}
          onPanelLeave={handlePanelLeave}
        />
      </div>
    </div>
  );
}

/**
 * Compact inline detail shown on mobile when a region row is expanded.
 */
function MobileRegionDetail({
  region,
  selectedCities,
  onToggleCity,
  onSelectAllRegion,
  onDeselectAllRegion,
}: {
  region: RegionDescription;
  selectedCities: Set<KnownCityId>;
  onToggleCity: (cityId: KnownCityId) => void;
  onSelectAllRegion: (regionId: KnownRegionId) => void;
  onDeselectAllRegion: (regionId: KnownRegionId) => void;
}) {
  const regionCities = REGIONS.find((r) => r.id === region.id)?.cities ?? [];
  const allCitiesSelected =
    regionCities.length > 0 && regionCities.every((c) => selectedCities.has(c.id));

  return (
    <div className="border-b border-border/50 bg-foreground/[0.02] px-4 py-4">
      {/* Hero image */}
      <div className="relative mb-3 aspect-[16/9] overflow-hidden rounded-xl">
        <Image
          src={region.heroImage}
          alt={region.name}
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 to-transparent" />
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed text-foreground-secondary">
        {region.description}
      </p>

      {/* Cities — interactive toggles */}
      {regionCities.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-widest text-stone">
              Cities
            </span>
            <button
              type="button"
              onClick={() =>
                allCitiesSelected
                  ? onDeselectAllRegion(region.id)
                  : onSelectAllRegion(region.id)
              }
              className="text-[10px] font-medium uppercase tracking-wider text-brand-primary hover:text-brand-primary/80"
            >
              {allCitiesSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {regionCities.map((city) => {
              const isSelected = selectedCities.has(city.id);
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => onToggleCity(city.id)}
                  className={cn(
                    "flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-200",
                    isSelected
                      ? "border border-brand-primary/30 bg-brand-primary/5"
                      : "border border-transparent hover:bg-foreground/5"
                  )}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors duration-200",
                      isSelected
                        ? "bg-brand-primary"
                        : "border border-border"
                    )}
                  >
                    {isSelected && (
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    )}
                  </div>

                  <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-primary" />
                  <span className="text-sm text-foreground-secondary">
                    {city.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
