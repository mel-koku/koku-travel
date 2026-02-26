"use client";

import { VIBES, type VibeId } from "@/data/vibes";
import { RegionCitySelector } from "@/components/features/trip-builder/RegionCitySelector";
import type { RegionDescription } from "@/data/regionDescriptions";
import type { CityId } from "@/types/trip";

type RegionDetailPanelBProps = {
  region: RegionDescription;
  selectedCities: Set<CityId>;
  onToggleCity: (cityId: CityId) => void;
};

export function RegionDetailPanelB({
  region,
  selectedCities,
  onToggleCity,
}: RegionDetailPanelBProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
      {/* Description */}
      <p className="text-sm leading-relaxed text-[var(--foreground-body)]">
        {region.description}
      </p>

      {/* Best for + Highlights — side by side on desktop */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-8">
        {region.bestFor.length > 0 && (
          <div className="sm:shrink-0">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
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

        {region.highlights.length > 0 && (
          <div className="min-w-0 flex-1">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              Highlights
            </span>
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
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
      </div>

      {/* City selector — capped height */}
      <div className="mt-4 max-h-[280px] overflow-y-auto overscroll-contain">
        <RegionCitySelector
          regionName={region.name}
          selectedCities={selectedCities}
          onToggleCity={onToggleCity}
          variant="mobile"
        />
      </div>
    </div>
  );
}
