"use client";

import { useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin } from "lucide-react";

import { cn } from "@/lib/cn";
import { REGIONS } from "@/data/regions";
import { VIBES, type VibeId } from "@/data/vibes";
import type { RegionDescription } from "@/data/regionDescriptions";
import type { KnownRegionId } from "@/types/trip";
import { easeCinematicMut } from "@/lib/motion";

type RegionDetailPanelProps = {
  region: RegionDescription | null;
  isSelected: boolean;
  onToggle: (regionId: KnownRegionId) => void;
  onPanelEnter: () => void;
  onPanelLeave: () => void;
};

export function RegionDetailPanel({
  region,
  isSelected,
  onToggle,
  onPanelEnter,
  onPanelLeave,
}: RegionDetailPanelProps) {
  // Prevent wheel events from leaking to the page (which scrolls the rows)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      className="flex h-full w-full"
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

            {/* Scrollable content area */}
            <div
              className="flex-1 overflow-y-auto p-6"
              style={{ overscrollBehavior: "contain" }}
            >
              <div className="flex flex-col gap-5">
                {/* Description */}
                <p className="text-sm leading-relaxed text-foreground-secondary">
                  {region.description}
                </p>

                {/* Cities */}
                <div>
                  <h4 className="mb-2 text-[10px] font-medium uppercase tracking-widest text-stone">
                    Cities
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(REGIONS.find((r) => r.id === region.id)?.cities ?? []).map(
                      (city) => (
                        <span
                          key={city.id}
                          className="flex items-center gap-1 rounded-lg bg-foreground/5 px-2.5 py-1 text-xs text-foreground-secondary"
                        >
                          <MapPin className="h-3 w-3 text-brand-primary" />
                          {city.name}
                        </span>
                      )
                    )}
                  </div>
                </div>

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

                {/* Toggle button — always visible at bottom of scroll */}
                <button
                  type="button"
                  onClick={() => onToggle(region.id)}
                  className={cn(
                    "mt-2 w-full shrink-0 rounded-xl py-3 text-sm font-medium uppercase tracking-wider transition-colors",
                    isSelected
                      ? "bg-foreground/10 text-foreground hover:bg-foreground/15"
                      : "bg-brand-primary text-white hover:bg-brand-primary/90"
                  )}
                >
                  {isSelected ? "Remove Region" : "Add Region"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
