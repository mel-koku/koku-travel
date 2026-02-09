"use client";

import { JAPAN_MAP_VIEWBOX, REGION_PREFECTURES, ALL_PREFECTURE_PATHS } from "@/data/japanMapPaths";
import type { KnownRegionId } from "@/types/trip";

type RegionMapCanvasProps = {
  hoveredRegion: KnownRegionId | null;
  selectedRegions: KnownRegionId[];
};

export function RegionMapCanvas({
  hoveredRegion,
  selectedRegions,
}: RegionMapCanvasProps) {
  const selectedSet = new Set(selectedRegions);

  return (
    <div className="flex h-full w-full items-center justify-center opacity-20 lg:opacity-100">
      <svg
        viewBox={JAPAN_MAP_VIEWBOX}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {/* Base map — all prefectures */}
        {ALL_PREFECTURE_PATHS.map((d, i) => {
          // Determine if this path belongs to a selected or hovered region
          let isSelected = false;
          let isHovered = false;

          for (const [regionId, paths] of Object.entries(REGION_PREFECTURES)) {
            if (paths.includes(d)) {
              if (selectedSet.has(regionId as KnownRegionId)) isSelected = true;
              if (hoveredRegion === regionId) isHovered = true;
              break;
            }
          }

          return (
            <path
              key={i}
              d={d}
              fill={
                isSelected
                  ? "rgba(196, 80, 79, 0.2)"
                  : isHovered
                    ? "rgba(255, 255, 255, 0.1)"
                    : "none"
              }
              stroke={
                isSelected
                  ? "rgba(196, 80, 79, 0.8)"
                  : isHovered
                    ? "rgba(255, 255, 255, 0.35)"
                    : "rgba(255, 255, 255, 0.18)"
              }
              strokeWidth={isSelected ? 1.2 : 0.6}
              opacity={isSelected || isHovered ? 1 : 0.55}
              style={{
                transition: "fill 0.5s cubic-bezier(0.215, 0.61, 0.355, 1), stroke 0.5s cubic-bezier(0.215, 0.61, 0.355, 1), opacity 0.5s cubic-bezier(0.215, 0.61, 0.355, 1)",
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}
