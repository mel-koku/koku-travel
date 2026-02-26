"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { REGIONS, deriveRegionsFromCities } from "@/data/regions";
import {
  scoreRegionsForTrip,
  autoSelectCities,
} from "@/lib/tripBuilder/regionScoring";
import { getAllCities } from "@/lib/tripBuilder/cityRelevance";
import { CitySearchBar } from "@/components/features/trip-builder/CitySearchBar";
import { RegionRowB, type RegionSelectionState } from "./RegionRowB";
import { RegionDetailPanelB } from "./RegionDetailPanelB";
import type { CityId, KnownRegionId } from "@/types/trip";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";
import type { RegionDescription } from "@/data/regionDescriptions";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

function mergeRegionOverride(
  region: RegionDescription,
  sanityRegionMap: Map<
    string,
    NonNullable<TripBuilderConfig["regions"]>[number]
  > | null,
): RegionDescription {
  if (!sanityRegionMap) return region;
  const override = sanityRegionMap.get(region.id);
  if (!override) return region;
  const galleryUrls = override.galleryImages
    ?.map((img) => img.url)
    .filter(Boolean) as string[] | undefined;
  return {
    ...region,
    name: override.name || region.name,
    tagline: override.tagline || region.tagline,
    description: override.description || region.description,
    highlights: override.highlights?.length
      ? override.highlights
      : region.highlights,
    heroImage: override.heroImage?.url ?? region.heroImage,
    galleryImages: galleryUrls?.length ? galleryUrls : region.galleryImages,
  };
}

export type RegionStepBProps = {
  onValidityChange?: (isValid: boolean) => void;
  sanityConfig?: TripBuilderConfig;
};

export function RegionStepB({
  onValidityChange,
  sanityConfig,
}: RegionStepBProps) {
  const { data, setData } = useTripBuilder();
  const hasAutoSelected = useRef(false);

  const [expandedRegion, setExpandedRegion] = useState<KnownRegionId | null>(
    null,
  );

  const sanityRegions = sanityConfig?.regions;
  const sanityRegionMap = useMemo(() => {
    if (!sanityRegions?.length) return null;
    const map = new Map<
      string,
      NonNullable<TripBuilderConfig["regions"]>[number]
    >();
    for (const r of sanityRegions) {
      map.set(r.regionId, r);
    }
    return map;
  }, [sanityRegions]);

  const vibes = useMemo(() => data.vibes ?? [], [data.vibes]);

  const selectedCities = useMemo(
    () => new Set<CityId>(data.cities ?? []),
    [data.cities],
  );

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

  const allCitiesData = useMemo(() => getAllCities(), []);

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
      const dynamic = allCitiesData.find(
        (c) => c.city.toLowerCase() === id,
      );
      return dynamic?.city ?? id.charAt(0).toUpperCase() + id.slice(1);
    });
  }, [selectedCities, allCitiesData]);

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
      setData((prev) => ({
        ...prev,
        cities: autoCities,
        regions: autoRegions,
      }));
      hasAutoSelected.current = true;
    }
  }, [vibes, data.entryPoint, data.duration, selectedCities.size, setData]);

  // Validity
  useEffect(() => {
    onValidityChange?.(selectedCities.size > 0);
  }, [selectedCities.size, onValidityChange]);

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
    [setData],
  );

  const getRegionSelectionState = useCallback(
    (regionId: KnownRegionId): RegionSelectionState => {
      const regionDef = REGIONS.find((r) => r.id === regionId);
      if (!regionDef) return "none";

      const knownCityIds = regionDef.cities.map((c) => c.id as CityId);
      const selectedCount = knownCityIds.filter((id) =>
        selectedCities.has(id),
      ).length;

      const regionName = regionDef.name.toLowerCase();
      const hasDynamicSelected = Array.from(selectedCities).some((cityId) => {
        if (knownCityIds.includes(cityId)) return false;
        const cityData = allCitiesData.find(
          (c) => c.city.toLowerCase() === cityId,
        );
        return cityData?.region?.toLowerCase() === regionName;
      });

      const totalSelected = selectedCount + (hasDynamicSelected ? 1 : 0);
      if (totalSelected === 0) return "none";
      if (selectedCount === knownCityIds.length && !hasDynamicSelected)
        return "full";
      return "partial";
    },
    [selectedCities, allCitiesData],
  );

  const getCityCounts = useCallback(
    (regionId: KnownRegionId) => {
      const regionCities =
        REGIONS.find((r) => r.id === regionId)?.cities ?? [];
      const total = regionCities.length;
      const selected = regionCities.filter((c) =>
        selectedCities.has(c.id),
      ).length;
      return { selected, total };
    },
    [selectedCities],
  );

  const getAdditionalCityCount = useCallback(
    (regionName: string, knownCityCount: number) => {
      const totalInRegion = allCitiesByRegion.get(regionName) ?? 0;
      return Math.max(0, totalInRegion - knownCityCount);
    },
    [allCitiesByRegion],
  );

  const handleToggleExpand = useCallback(
    (regionId: KnownRegionId) => {
      setExpandedRegion((prev) => (prev === regionId ? null : regionId));
    },
    [],
  );

  return (
    <div className="flex flex-1 flex-col bg-[var(--background)]">
      {/* Header — centered like VibeStepB */}
      <div className="px-4 pt-24 text-center sm:px-6 lg:pt-28">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
          Step 04
        </p>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: bEase, delay: 0.1 }}
          className="mt-3 text-2xl font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl"
        >
          {sanityConfig?.regionStepHeading ?? "Where are you headed?"}
        </motion.h2>

        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          {sanityConfig?.regionStepDescription ??
            "Pick your cities. Highlighted ones match your vibes."}
        </p>

        <div className="mx-auto mt-4 max-w-md">
          <CitySearchBar
            selectedCities={selectedCities}
            onSelectCity={toggleCity}
          />
        </div>

        {/* Selected city chips */}
        {selectedCities.size > 0 ? (
          <div className="mx-auto mt-3 flex max-w-3xl flex-wrap justify-center gap-2">
            {selectedCityNames.map((name, i) => {
              const cityId = Array.from(selectedCities)[i];
              return (
                <motion.span
                  key={cityId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 px-3 py-1.5 text-sm text-[var(--foreground)]"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => toggleCity(cityId!)}
                    className="flex items-center justify-center rounded-full p-0.5 transition-colors hover:bg-[var(--primary)]/20"
                    aria-label={`Remove ${name}`}
                  >
                    <X className="h-3 w-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)]" />
                  </button>
                </motion.span>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--warning)]">
            Select at least one city
          </p>
        )}
      </div>

      {/* Region card grid — grouped into rows of 3 so the detail panel sits below the row */}
      <div className="mx-auto mt-8 w-full max-w-6xl space-y-4 px-4 pb-32 sm:px-6">
        {Array.from(
          { length: Math.ceil(scoredRegions.length / 3) },
          (_, rowIdx) => {
            const row = scoredRegions.slice(rowIdx * 3, rowIdx * 3 + 3);
            const expandedInRow = row.find(
              (s) => expandedRegion === s.region.id,
            );
            const expandedLocalIdx = expandedInRow
              ? row.indexOf(expandedInRow)
              : -1;

            return (
              <div key={rowIdx}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {row.map((scored, localIdx) => {
                    const globalIdx = rowIdx * 3 + localIdx;
                    const { selected, total } = getCityCounts(
                      scored.region.id,
                    );
                    const regionDef = REGIONS.find(
                      (r) => r.id === scored.region.id,
                    );
                    const cityNames =
                      regionDef?.cities.map((c) => c.name) ?? [];
                    const regionName = scored.region.name;
                    const additionalCityCount = getAdditionalCityCount(
                      regionName,
                      cityNames.length,
                    );
                    const isExpanded =
                      expandedRegion === scored.region.id;

                    return (
                      <RegionRowB
                        key={scored.region.id}
                        index={globalIdx}
                        regionName={regionName}
                        heroImage={scored.region.heroImage}
                        tagline={scored.region.tagline}
                        cityNames={cityNames}
                        additionalCityCount={additionalCityCount}
                        selectedCityCount={selected}
                        totalCityCount={total}
                        isExpanded={isExpanded}
                        isFaded={
                          expandedRegion !== null && !isExpanded
                        }
                        isRecommended={scored.isRecommended}
                        isEntryPointRegion={
                          scored.isEntryPointRegion
                        }
                        regionSelectionState={getRegionSelectionState(
                          scored.region.id,
                        )}
                        onClick={() =>
                          handleToggleExpand(scored.region.id)
                        }
                      />
                    );
                  })}
                </div>

                {/* Detail panel below the row */}
                <AnimatePresence>
                  {expandedInRow && (
                    <motion.div
                      key={expandedInRow.region.id}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: bEase }}
                      className="overflow-hidden"
                    >
                      <div className="relative pt-4">
                        {/* Caret pointing up toward the expanded card */}
                        <div
                          className={`absolute top-0 hidden lg:block ${
                            expandedLocalIdx === 0
                              ? "left-[16.67%] -translate-x-1/2"
                              : expandedLocalIdx === 1
                                ? "left-[50%] -translate-x-1/2"
                                : "left-[83.33%] -translate-x-1/2"
                          }`}
                        >
                          <div className="h-0 w-0 border-x-8 border-b-8 border-x-transparent border-b-white" />
                        </div>
                        <RegionDetailPanelB
                          region={expandedInRow.region}
                          selectedCities={selectedCities}
                          onToggleCity={toggleCity}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}
