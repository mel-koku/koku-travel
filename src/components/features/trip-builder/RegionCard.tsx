"use client";

import Image from "next/image";
import { Check, Star } from "lucide-react";

import { cn } from "@/lib/cn";
import { VIBES, type VibeId } from "@/data/vibes";
import type { RegionDescription } from "@/data/regionDescriptions";

export type RegionCardProps = {
  region: RegionDescription;
  matchScore: number;
  isRecommended: boolean;
  isSelected: boolean;
  onToggle: () => void;
};

export function RegionCard({
  region,
  matchScore,
  isRecommended,
  isSelected,
  onToggle,
}: RegionCardProps) {
  const bestForVibes = region.bestFor
    .map((vibeId: VibeId) => VIBES.find((v) => v.id === vibeId))
    .filter(Boolean);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border-2 bg-background transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
        isSelected
          ? "border-brand-primary shadow-md"
          : "border-border hover:border-brand-primary/30 hover:shadow-sm"
      )}
    >
      {/* Hero Image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <Image
          src={region.heroImage}
          alt={`${region.name} region`}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Match Score Badge */}
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs font-semibold backdrop-blur-sm">
          <span className="text-brand-primary">{matchScore}%</span>
          <span className="text-stone">match</span>
        </div>

        {/* Recommended Badge */}
        {isRecommended && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-brand-primary px-2 py-1 text-xs font-semibold text-white">
            <Star className="h-3 w-3 fill-current" />
            <span>Recommended</span>
          </div>
        )}

        {/* Selected Overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-brand-primary/10" />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-charcoal">
              {region.name}
            </h3>
            <p className="text-xs text-stone">{region.tagline}</p>
          </div>
          {isSelected && (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white">
              <Check className="h-4 w-4" />
            </div>
          )}
        </div>

        <p className="text-sm text-warm-gray line-clamp-2">
          {region.description}
        </p>

        {/* Best For Tags */}
        <div className="mt-auto flex flex-wrap gap-1 pt-2">
          {bestForVibes.map((vibe) => (
            <span
              key={vibe!.id}
              className="rounded-full bg-sand px-2 py-0.5 text-xs text-warm-gray"
            >
              {vibe!.name}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
