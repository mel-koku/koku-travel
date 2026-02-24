"use client";

import Image from "next/image";
import { VIBES, type VibeId } from "@/data/vibes";
import { RegionCitySelector } from "@/components/features/trip-builder/RegionCitySelector";
import type { RegionDescription } from "@/data/regionDescriptions";
import type { CityId } from "@/types/trip";

type RegionDetailPanelBProps = {
  region: RegionDescription;
  selectedCities: Set<CityId>;
  onToggleCity: (cityId: CityId) => void;
  variant?: "desktop" | "mobile";
};

export function RegionDetailPanelB({
  region,
  selectedCities,
  onToggleCity,
  variant = "mobile",
}: RegionDetailPanelBProps) {
  return (
    <div className="space-y-4 rounded-2xl bg-white p-4" style={{ boxShadow: variant === "desktop" ? "var(--shadow-elevated)" : undefined }}>
      {/* Hero image */}
      <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
        <Image
          src={region.heroImage}
          alt={region.name}
          fill
          className="object-cover"
          sizes={variant === "desktop" ? "40vw" : "100vw"}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed text-[var(--foreground-body)]">
        {region.description}
      </p>

      {/* Best for */}
      {region.bestFor.length > 0 && (
        <div>
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Best for
          </span>
          <div className="flex flex-wrap gap-2">
            {region.bestFor.map((vibeId: VibeId) => {
              const vibe = VIBES.find((v) => v.id === vibeId);
              if (!vibe) return null;
              return (
                <span
                  key={vibeId}
                  className="rounded-lg bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--primary)]"
                >
                  {vibe.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Highlights */}
      {region.highlights.length > 0 && (
        <div>
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Highlights
          </span>
          <ul className="space-y-1.5">
            {region.highlights.map((h) => (
              <li
                key={h}
                className="flex items-center gap-2 text-sm text-[var(--foreground-body)]"
              >
                <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* City selector */}
      <RegionCitySelector
        regionName={region.name}
        selectedCities={selectedCities}
        onToggleCity={onToggleCity}
        variant="mobile"
      />
    </div>
  );
}
