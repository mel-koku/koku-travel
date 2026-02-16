"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Check, MapPin, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { REGIONS, deriveRegionsFromCities } from "@/data/regions";
import {
  scoreRegionsForTrip,
  autoSelectCities,
} from "@/lib/tripBuilder/regionScoring";
import { getAllCities } from "@/lib/tripBuilder/cityRelevance";
import type { CityId, KnownCityId, KnownRegionId } from "@/types/trip";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";
import type { RegionDescription } from "@/data/regionDescriptions";
import { easeCinematicMut } from "@/lib/motion";

import { RegionMapCanvas } from "./RegionMapCanvas";
import { RegionRow } from "./RegionRow";
import { RegionDetailPanel } from "./RegionDetailPanel";
import { CitySearchBar } from "./CitySearchBar";

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

  // City-level selection (primary source of truth) — includes both known and dynamic cities
  const selectedCities = useMemo(
    () => new Set<CityId>(data.cities ?? []),
    [data.cities]
  );

  // All 640 cities grouped by region (lazy-loaded, cached)
  const allCitiesByRegion = useMemo(() => {
    const cities = getAllCities();
    const byRegion = new Map<string, number>();
    for (const c of cities) {
      if (c.region) {
        byRegion.set(c.region, (byRegion.get(c.region) ?? 0) + 1);
      }
    }
    return byRegion;
  }, []);

  // All cities data for looking up dynamic city metadata
  const allCitiesData = useMemo(() => getAllCities(), []);

  // Derive regions from selected cities (for map highlighting & summary)
  const derivedRegions = useMemo(
    () => deriveRegionsFromCities(Array.from(selectedCities)),
    [selectedCities]
  );

  // Build display names for all selected cities (known + dynamic)
  const selectedCityNames = useMemo(() => {
    const knownCityMap = new Map<string, string>();
    for (const r of REGIONS) {
      for (const c of r.cities) {
        knownCityMap.set(c.id, c.name);
      }
    }
    return Array.from(selectedCities).map((id) => {
      const known = knownCityMap.get(id);
      if (known) return known;
      const dynamic = allCitiesData.find((c) => c.city.toLowerCase() === id);
      return dynamic?.city ?? id.charAt(0).toUpperCase() + id.slice(1);
    });
  }, [selectedCities, allCitiesData]);

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

  // Toggle a single city (known or dynamic)
  const toggleCity = useCallback(
    (cityId: CityId) => {
      setData((prev) => {
        const current = new Set<CityId>(prev.cities ?? []);
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

  // Select all known cities in a region
  const selectAllRegion = useCallback(
    (regionId: KnownRegionId) => {
      setData((prev) => {
        const current = new Set<CityId>(prev.cities ?? []);
        const regionCities = REGIONS.find((r) => r.id === regionId)?.cities ?? [];
        regionCities.forEach((c) => current.add(c.id));
        const cities = Array.from(current);
        return { ...prev, cities, regions: deriveRegionsFromCities(cities) };
      });
    },
    [setData]
  );

  // Deselect all known cities in a region
  const deselectAllRegion = useCallback(
    (regionId: KnownRegionId) => {
      setData((prev) => {
        const current = new Set<CityId>(prev.cities ?? []);
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

  // Helper: get city counts for a region (known cities only for dots)
  const getCityCounts = useCallback(
    (regionId: KnownRegionId) => {
      const regionCities = REGIONS.find((r) => r.id === regionId)?.cities ?? [];
      const total = regionCities.length;
      const selected = regionCities.filter((c) => selectedCities.has(c.id)).length;
      return { selected, total };
    },
    [selectedCities]
  );

  // Compute additional city count per region (total DB cities minus known cities)
  const getAdditionalCityCount = useCallback(
    (regionName: string, knownCityCount: number) => {
      const totalInRegion = allCitiesByRegion.get(regionName) ?? 0;
      return Math.max(0, totalInRegion - knownCityCount);
    },
    [allCitiesByRegion]
  );

  // Compute dynamic selected cities for a given region (selected but not in the 17 known)
  const getDynamicCitiesForRegion = useCallback(
    (regionName: string) => {
      const knownIds = new Set(REGIONS.flatMap((r) => r.cities.map((c) => c.id)));
      const result: { id: string; name: string }[] = [];
      for (const cityId of selectedCities) {
        if (knownIds.has(cityId as KnownCityId)) continue;
        const cityData = allCitiesData.find((c) => c.city.toLowerCase() === cityId);
        if (cityData?.region === regionName) {
          result.push({ id: cityId, name: cityData.city });
        }
      }
      return result;
    },
    [selectedCities, allCitiesData]
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

          <CitySearchBar
            selectedCities={selectedCities}
            onSelectCity={toggleCity}
          />

          {/* Selected city chips */}
          {selectedCities.size > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedCityNames.map((name, i) => {
                const cityId = Array.from(selectedCities)[i];
                return (
                  <motion.button
                    key={cityId}
                    type="button"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => toggleCity(cityId!)}
                    className="flex items-center gap-1.5 rounded-full border border-brand-primary/30 bg-brand-primary/5 px-3 py-1.5 text-sm text-foreground-secondary transition-colors hover:border-brand-primary/50 hover:bg-brand-primary/10"
                  >
                    {name}
                    <X className="h-3 w-3 text-stone hover:text-foreground" />
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-warning">
              Select at least one city
            </p>
          )}
        </div>

        {/* Region rows */}
        <div className="mt-8 px-4 pb-32 lg:max-w-[45%] lg:px-8">
          {scoredRegions.map((scored, i) => {
            const { selected, total } = getCityCounts(scored.region.id);
            const regionDef = REGIONS.find((r) => r.id === scored.region.id);
            const cityNames = regionDef?.cities.map((c) => c.name) ?? [];
            const regionName = scored.region.name;
            const additionalCityCount = getAdditionalCityCount(regionName, cityNames.length);
            const dynamicCities = getDynamicCitiesForRegion(regionName);
            return (
              <div key={scored.region.id}>
                {/* Desktop: hover-driven */}
                <div className="hidden lg:block">
                  <RegionRow
                    index={i}
                    region={scored.region}
                    cityNames={cityNames}
                    regionName={regionName}
                    additionalCityCount={additionalCityCount}
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
                    regionName={regionName}
                    additionalCityCount={additionalCityCount}
                    matchScore={scored.totalScore}
                    selectedCityCount={selected}
                    totalCityCount={total}
                    isHovered={expandedRegion === scored.region.id}
                    isRecommended={scored.isRecommended}
                    isEntryPointRegion={scored.isEntryPointRegion}
                    onClick={() => handleMobileToggle(scored.region.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleMobileToggle(scored.region.id);
                      }
                    }}
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
                          dynamicSelectedCities={dynamicCities}
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

      {/* Desktop detail panel — fixed to viewport, z-40 to sit above StepProgressTrack (z-30).
           pointer-events-none on wrapper so it doesn't block clicks when panel is hidden. */}
      <div className="pointer-events-none fixed inset-y-0 right-0 z-40 hidden w-[40%] lg:block">
        <RegionDetailPanel
          region={detailRegion}
          selectedCities={selectedCities}
          dynamicSelectedCities={detailRegion ? getDynamicCitiesForRegion(detailRegion.name) : []}
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
  dynamicSelectedCities,
  onToggleCity,
  onSelectAllRegion,
  onDeselectAllRegion,
}: {
  region: RegionDescription;
  selectedCities: Set<CityId>;
  dynamicSelectedCities: { id: string; name: string }[];
  onToggleCity: (cityId: CityId) => void;
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

      {/* Dynamic cities — "Also selected" */}
      {dynamicSelectedCities.length > 0 && (
        <div className="mt-3">
          <span className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-stone">
            Also selected
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {dynamicSelectedCities.map((city) => (
              <button
                key={city.id}
                type="button"
                onClick={() => onToggleCity(city.id)}
                className="flex min-h-[44px] items-center gap-3 rounded-xl border border-brand-primary/30 bg-brand-primary/5 px-3 py-2 text-left transition-colors duration-200"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brand-primary transition-colors duration-200">
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </div>
                <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-primary" />
                <span className="text-sm text-foreground-secondary">
                  {city.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
