"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { MapPin } from "lucide-react";

import { SplitText } from "@/components/ui/SplitText";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { REGIONS } from "@/data/regions";
import {
  scoreRegionsForTrip,
  autoSelectRegions,
} from "@/lib/tripBuilder/regionScoring";
import type { KnownRegionId } from "@/types/trip";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";
import type { RegionDescription } from "@/data/regionDescriptions";

import { RegionMapCanvas } from "./RegionMapCanvas";
import { RegionRow } from "./RegionRow";
import { RegionDetailPanel } from "./RegionDetailPanel";
import { RegionSummaryPill } from "./RegionSummaryPill";

export type RegionStepProps = {
  onValidityChange?: (isValid: boolean) => void;
  sanityConfig?: TripBuilderConfig;
};

const EASE_OUT_EXPO = [0.215, 0.61, 0.355, 1] as const;

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
  const selectedRegions = useMemo(
    () => (data.regions ?? []) as KnownRegionId[],
    [data.regions]
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

  // Total cities
  const totalCities = useMemo(() => {
    return selectedRegions.reduce((sum, id) => {
      const region = REGIONS.find((r) => r.id === id);
      return sum + (region?.cities.length ?? 0);
    }, 0);
  }, [selectedRegions]);

  // Auto-select on mount
  useEffect(() => {
    if (hasAutoSelected.current) return;
    if (selectedRegions.length > 0) {
      hasAutoSelected.current = true;
      return;
    }

    const autoSelected = autoSelectRegions(vibes, data.entryPoint, data.duration);
    if (autoSelected.length > 0) {
      setData((prev) => ({ ...prev, regions: autoSelected }));
      hasAutoSelected.current = true;
    }
  }, [vibes, data.entryPoint, data.duration, selectedRegions.length, setData]);

  // Validity
  useEffect(() => {
    onValidityChange?.(selectedRegions.length > 0);
  }, [selectedRegions.length, onValidityChange]);

  const toggleRegion = useCallback(
    (regionId: KnownRegionId) => {
      setData((prev) => {
        const current = new Set<string>(prev.regions ?? []);
        if (current.has(regionId)) {
          current.delete(regionId);
        } else {
          current.add(regionId);
        }
        return { ...prev, regions: Array.from(current) as KnownRegionId[] };
      });
    },
    [setData]
  );

  // Detail panel region (from hover on desktop)
  const detailRegion = useMemo(() => {
    if (!hoveredRegion) return null;
    return scoredRegions.find((s) => s.region.id === hoveredRegion)?.region ?? null;
  }, [hoveredRegion, scoredRegions]);

  // Mobile expand handler — toggles selection AND inline detail
  const handleMobileToggle = useCallback(
    (regionId: KnownRegionId) => {
      toggleRegion(regionId);
      setExpandedRegion((prev) => (prev === regionId ? null : regionId));
    },
    [toggleRegion]
  );

  return (
    <div className="relative min-h-[calc(100dvh-5rem)] bg-charcoal">
      {/* Layer 0: Map canvas — fixed to viewport so it never scrolls */}
      <div className="fixed inset-0 z-0">
        <RegionMapCanvas
          hoveredRegion={hoveredRegion}
          selectedRegions={selectedRegions}
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
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-brand-primary">
            STEP 04
          </p>

          <SplitText
            as="h2"
            className="mt-3 font-serif text-3xl italic tracking-tight text-white sm:text-4xl lg:text-5xl"
            splitBy="word"
            trigger="load"
            animation="clipY"
            staggerDelay={0.06}
          >
            {sanityConfig?.regionStepHeading ?? "Where are you headed?"}
          </SplitText>

          <p className="mt-3 text-sm text-white/50 lg:text-base">
            {sanityConfig?.regionStepDescription ?? "Choose your destinations. We've highlighted the best matches for your travel style."}
          </p>
        </div>

        {/* Region rows */}
        <div className="mt-8 px-4 pb-32 lg:max-w-[45%] lg:px-8">
          {scoredRegions.map((scored, i) => (
            <div key={scored.region.id}>
              {/* Desktop: hover-driven */}
              <div className="hidden lg:block">
                <RegionRow
                  index={i}
                  region={scored.region}
                  matchScore={scored.totalScore}
                  isSelected={selectedRegions.includes(scored.region.id)}
                  isHovered={hoveredRegion === scored.region.id}
                  isRecommended={scored.isRecommended}
                  isEntryPointRegion={scored.isEntryPointRegion}
                  onToggle={() => toggleRegion(scored.region.id)}
                  onHover={() => handleHoverRegion(scored.region.id)}
                  onLeave={handleLeaveRegion}
                />
              </div>

              {/* Mobile: tap-driven with inline expand */}
              <div className="lg:hidden">
                <RegionRow
                  index={i}
                  region={scored.region}
                  matchScore={scored.totalScore}
                  isSelected={selectedRegions.includes(scored.region.id)}
                  isHovered={expandedRegion === scored.region.id}
                  isRecommended={scored.isRecommended}
                  isEntryPointRegion={scored.isEntryPointRegion}
                  onToggle={() => handleMobileToggle(scored.region.id)}
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
                        ease: EASE_OUT_EXPO as [number, number, number, number],
                      }}
                      className="overflow-hidden"
                    >
                      <MobileRegionDetail region={scored.region} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary pill — fixed to viewport */}
      <div className="fixed bottom-20 left-1/2 z-20 -translate-x-1/2">
        <RegionSummaryPill
          selectedCount={selectedRegions.length}
          totalCities={totalCities}
        />
      </div>

      {/* Desktop detail panel — fixed to viewport */}
      <div className="fixed inset-y-0 right-0 z-10 hidden w-[40%] lg:block">
        <RegionDetailPanel
          region={detailRegion}
          isSelected={hoveredRegion ? selectedRegions.includes(hoveredRegion) : false}
          onToggle={toggleRegion}
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
function MobileRegionDetail({ region }: { region: import("@/data/regionDescriptions").RegionDescription }) {
  const regionCities = REGIONS.find((r) => r.id === region.id)?.cities ?? [];

  return (
    <div className="border-b border-white/5 bg-white/[0.02] px-4 py-4">
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
      <p className="text-sm leading-relaxed text-white/60">
        {region.description}
      </p>

      {/* Cities */}
      {regionCities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {regionCities.map((city) => (
            <span
              key={city.id}
              className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-0.5 text-xs text-white/60"
            >
              <MapPin className="h-3 w-3 text-brand-primary" />
              {city.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
