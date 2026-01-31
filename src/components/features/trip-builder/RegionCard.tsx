"use client";

import Image from "next/image";
import { Check, MapPin, Plane, Star } from "lucide-react";

import { cn } from "@/lib/cn";
import { VIBES, type VibeId } from "@/data/vibes";
import { REGIONS } from "@/data/regions";
import type { RegionDescription } from "@/data/regionDescriptions";

export type RegionCardProps = {
  region: RegionDescription;
  matchScore: number;
  isRecommended: boolean;
  isEntryPointRegion: boolean;
  isSelected: boolean;
  onToggle: () => void;
};

export function RegionCard({
  region,
  matchScore,
  isRecommended,
  isEntryPointRegion,
  isSelected,
  onToggle,
}: RegionCardProps) {
  const bestForVibes = region.bestFor
    .map((vibeId: VibeId) => VIBES.find((v) => v.id === vibeId))
    .filter(Boolean);

  // Get cities for this region
  const regionCities = REGIONS.find((r) => r.id === region.id)?.cities ?? [];

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-background transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
        isSelected
          ? "border-brand-primary shadow-lg ring-1 ring-brand-primary/20"
          : "border-transparent shadow-md hover:shadow-xl hover:-translate-y-1"
      )}
    >
      {/* Hero Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={region.heroImage}
          alt={`${region.name} region`}
          fill
          className={cn(
            "object-cover transition-transform duration-300",
            isSelected ? "scale-105" : "group-hover:scale-110"
          )}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />

        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

        {/* Selected Tint Overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-brand-primary/25" />
        )}

        {/* Match Score Badge - Top Right */}
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur-sm">
          <span className="text-brand-primary">{matchScore}%</span>
          <span className="text-stone">match</span>
        </div>

        {/* Badges - Top Left */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {isEntryPointRegion && (
            <div className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow-md">
              <Plane className="h-3 w-3" />
              <span>Nearest to arrival</span>
            </div>
          )}
          {isRecommended && (
            <div className="flex items-center gap-1 rounded-full bg-brand-primary px-2.5 py-1 text-xs font-semibold text-white shadow-md">
              <Star className="h-3 w-3 fill-current" />
              <span>Top Pick</span>
            </div>
          )}
        </div>

        {/* Selected Checkmark - Top Right (overlaps with match on selection) */}
        {isSelected && (
          <div className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg">
            <Check className="h-5 w-5" strokeWidth={3} />
          </div>
        )}

        {/* Region Name & Tagline Overlay - Bottom */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-serif text-xl font-bold text-white drop-shadow-lg sm:text-2xl">
            {region.name}
          </h3>
          <p className="mt-0.5 text-sm text-white/90 drop-shadow-md">
            {region.tagline}
          </p>
        </div>
      </div>

      {/* Content Below Image */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Description */}
        <p className="text-left text-sm leading-relaxed text-warm-gray">
          {region.description}
        </p>

        {/* Cities in this region */}
        {regionCities.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 shrink-0 text-brand-primary" />
            <span className="text-charcoal">
              {regionCities.map((city) => city.name).join(", ")}
            </span>
          </div>
        )}

        {/* Best For Tags */}
        <div className="mt-auto flex flex-wrap gap-1.5">
          {bestForVibes.slice(0, 3).map((vibe) => (
            <span
              key={vibe!.id}
              className="rounded-full bg-sand/80 px-2 py-0.5 text-xs font-medium text-warm-gray"
            >
              {vibe!.name}
            </span>
          ))}
          {bestForVibes.length > 3 && (
            <span className="rounded-full bg-sand/80 px-2 py-0.5 text-xs font-medium text-stone">
              +{bestForVibes.length - 3}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
