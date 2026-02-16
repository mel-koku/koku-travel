"use client";

import { useCallback, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Check, MapPin } from "lucide-react";

import { cn } from "@/lib/cn";
import { REGIONS } from "@/data/regions";
import { VIBES, type VibeId } from "@/data/vibes";
import type { RegionDescription } from "@/data/regionDescriptions";
import type { CityId, KnownRegionId } from "@/types/trip";
import { easeCinematicMut } from "@/lib/motion";

type RegionDetailPanelProps = {
  region: RegionDescription | null;
  selectedCities: Set<CityId>;
  dynamicSelectedCities: { id: string; name: string }[];
  onToggleCity: (cityId: CityId) => void;
  onSelectAllRegion: (regionId: KnownRegionId) => void;
  onDeselectAllRegion: (regionId: KnownRegionId) => void;
  onPanelEnter: () => void;
  onPanelLeave: () => void;
};

export function RegionDetailPanel({
  region,
  selectedCities,
  dynamicSelectedCities,
  onToggleCity,
  onSelectAllRegion,
  onDeselectAllRegion,
  onPanelEnter,
  onPanelLeave,
}: RegionDetailPanelProps) {
  // Prevent wheel events from leaking to the page (which scrolls the rows)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  const regionCities = useMemo(
    () => (region ? REGIONS.find((r) => r.id === region.id)?.cities ?? [] : []),
    [region]
  );

  const allCitiesSelected = useMemo(
    () => regionCities.length > 0 && regionCities.every((c) => selectedCities.has(c.id)),
    [regionCities, selectedCities]
  );

  return (
    <div
      className={cn("flex h-full w-full", region ? "pointer-events-auto" : "pointer-events-none")}
      onMouseEnter={onPanelEnter}
      onMouseLeave={onPanelLeave}
      onWheel={handleWheel}
    >
      <AnimatePresence mode="wait">
        {region && (
          <motion.div
            key={region.id}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              duration: 0.5,
              ease: easeCinematicMut,
            }}
            className="flex h-full w-full flex-col border-l border-border bg-background/95 backdrop-blur-xl"
          >
            {/* Hero image — fixed height, not scrollable */}
            <div className="relative h-[40%] shrink-0 overflow-hidden">
              <Image
                src={region.heroImage}
                alt={region.name}
                fill
                className="object-cover"
                sizes="40vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/30 to-transparent" />

              {/* Region name overlay */}
              <div className="absolute inset-x-0 bottom-0 p-6">
                <h3 className="font-serif text-3xl italic text-white">
                  {region.name}
                </h3>
                <p className="mt-1 text-sm text-white/70">{region.tagline}</p>
              </div>
            </div>

            {/* Scrollable content area — pb-24 clears the sticky Continue bar */}
            <div
              className="flex-1 overflow-y-auto p-6 pb-24"
              style={{ overscrollBehavior: "contain" }}
            >
              <div className="flex flex-col gap-5">
                {/* Description */}
                <p className="text-sm leading-relaxed text-foreground-secondary">
                  {region.description}
                </p>

                {/* Cities — interactive toggles */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-[10px] font-medium uppercase tracking-widest text-stone">
                      Cities
                    </h4>
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
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                              >
                                <Check className="h-3 w-3 text-white" strokeWidth={3} />
                              </motion.div>
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

                {/* Dynamic cities — "Also selected" */}
                {dynamicSelectedCities.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-[10px] font-medium uppercase tracking-widest text-stone">
                      Also selected
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {dynamicSelectedCities.map((city) => (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => onToggleCity(city.id)}
                          className="flex min-h-[44px] items-center gap-3 rounded-xl border border-brand-primary/30 bg-brand-primary/5 px-3 py-2 text-left transition-colors duration-200"
                        >
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brand-primary transition-colors duration-200">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            >
                              <Check className="h-3 w-3 text-white" strokeWidth={3} />
                            </motion.div>
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

                {/* Best for vibes */}
                <div>
                  <h4 className="mb-2 text-[10px] font-medium uppercase tracking-widest text-stone">
                    Best for
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {region.bestFor.map((vibeId: VibeId) => {
                      const vibe = VIBES.find((v) => v.id === vibeId);
                      if (!vibe) return null;
                      return (
                        <span
                          key={vibeId}
                          className="rounded-lg bg-brand-primary/10 px-2.5 py-1 text-xs font-medium text-brand-primary"
                        >
                          {vibe.name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Highlights */}
                <div>
                  <h4 className="mb-2 text-[10px] font-medium uppercase tracking-widest text-stone">
                    Highlights
                  </h4>
                  <ul className="space-y-1.5">
                    {region.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-center gap-2 text-sm text-foreground-secondary"
                      >
                        <span className="h-1 w-1 shrink-0 rounded-full bg-brand-primary" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
