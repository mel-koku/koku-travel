"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MapPin } from "lucide-react";
import { JAPAN_MAP_VIEWBOX, REGION_PREFECTURES, ALL_PREFECTURE_PATHS } from "@/data/japanMapPaths";
import type { KnownRegionId } from "@/types/trip";

type RegionMapPanelProps = {
  selectedRegions: KnownRegionId[];
  selectedRegionNames: string[];
  totalCities: number;
};

export function RegionMapPanel({
  selectedRegions,
  selectedRegionNames,
  totalCities,
}: RegionMapPanelProps) {
  return (
    <div className="flex h-full flex-col">
      {/* SVG Map */}
      <div className="flex flex-1 items-center justify-center p-6">
        <svg
          viewBox={JAPAN_MAP_VIEWBOX}
          className="h-auto max-h-[50vh] w-full"
          aria-hidden
        >
          {/* Base map — all prefectures in muted outline */}
          {ALL_PREFECTURE_PATHS.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
              className="text-border"
              opacity="0.3"
            />
          ))}

          {/* Highlighted regions overlay */}
          {selectedRegions.map((regionId) => {
            const prefPaths = REGION_PREFECTURES[regionId];
            if (!prefPaths) return null;
            return prefPaths.map((d, i) => (
              <path
                key={`${regionId}-${i}`}
                d={d}
                className="fill-brand-primary/20 stroke-brand-primary transition-all duration-300"
                strokeWidth="1.2"
              />
            ));
          })}
        </svg>
      </div>

      {/* Bottom summary */}
      <div className="border-t border-border p-6">
        <AnimatePresence mode="popLayout">
          {selectedRegionNames.length > 0 ? (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex flex-wrap gap-2">
                {selectedRegionNames.map((name) => (
                  <span
                    key={name}
                    className="rounded-full bg-brand-primary/10 px-3 py-1 text-sm font-medium text-brand-primary"
                  >
                    {name}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-stone">
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  {totalCities} {totalCities === 1 ? "city" : "cities"} across{" "}
                  {selectedRegionNames.length}{" "}
                  {selectedRegionNames.length === 1 ? "region" : "regions"}
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-stone"
            >
              Select regions to see them on the map
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
