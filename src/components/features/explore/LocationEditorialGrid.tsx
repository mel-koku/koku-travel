"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import type { Location } from "@/types/location";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { FeatureRow } from "./FeatureRow";
import { ThreeUpRow } from "./ThreeUpRow";
import { TwoUpRow } from "./TwoUpRow";
import { TextInterstitial } from "./TextInterstitial";

type LocationEditorialGridProps = {
  locations: Location[];
  onSelect?: (location: Location) => void;
  totalCount?: number;
  activeCategory?: string | null;
};

const INTERSTITIAL_MESSAGES: Record<string, string> = {
  culture: "Temples, castles, and the stories they hold.",
  food: "From street-side yakitori to multi-course kaiseki.",
  nature: "Mountains, coastlines, and gardens that slow time.",
  shopping: "Covered arcades, department stores, and the boutiques in between.",
  view: "The vantage points worth the climb.",
};

const DEFAULT_INTERSTITIALS = [
  "Keep going. There's more worth finding.",
  "Neon-lit streets. Moss-covered paths. Same country.",
  "Some of these places don't even have English signage. That's the point.",
];

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function FullBleedRow({ location }: { location: Location }) {
  const imageSrc = resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 1600);

  return (
    <Link
      href={`/explore?location=${location.id}`}
      className="group relative block w-full overflow-hidden rounded-xl aspect-[21/9]"
    >
      <Image
        src={imageSrc || FALLBACK_IMAGE}
        alt={location.name}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        sizes="(min-width: 1280px) 1200px, 100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal/70 via-charcoal/20 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
        <p className="text-xs uppercase tracking-wide text-white/60">
          {location.city}
        </p>
        <h3 className="text-2xl font-serif italic text-white sm:text-3xl">
          {location.name}
        </h3>
      </div>
    </Link>
  );
}

/**
 * Chunks locations into repeating editorial row modules:
 * Module pattern per 6 items: FeatureRow(1) + ThreeUpRow(3) + TwoUpRow(2)
 * Inserts TextInterstitial every ~18 items (3 modules).
 * After every 3 modules, a FullBleedRow showcases a single location at full width.
 */
export function LocationEditorialGrid({
  locations,
  onSelect,
  activeCategory,
}: LocationEditorialGridProps) {
  const rows = useMemo(() => {
    const result: ReactNode[] = [];
    const INTERSTITIAL_INTERVAL = 3; // every 3 modules (18 items)

    let moduleCount = 0;
    let interstitialIndex = 0;

    // Pre-reserve locations for full-bleed rows so they aren't shown in regular modules.
    // Every 3 modules consumes 18 items, then 1 item for the full-bleed row = 19 per cycle.
    const fullBleedLocations: Location[] = [];
    const gridLocations: Location[] = [];

    let cursor = 0;
    while (cursor < locations.length) {
      // Take up to 18 items for 3 regular modules
      const chunkEnd = Math.min(cursor + 18, locations.length);
      for (let j = cursor; j < chunkEnd; j++) {
        gridLocations.push(locations[j]!);
      }
      cursor = chunkEnd;

      // Reserve the next item for a full-bleed row (if available)
      if (cursor < locations.length) {
        fullBleedLocations.push(locations[cursor]!);
        cursor += 1;
      }
    }

    let fullBleedIndex = 0;

    for (let i = 0; i < gridLocations.length; ) {
      const remaining = gridLocations.length - i;

      // Feature Row (1 item)
      if (remaining >= 1) {
        result.push(
          <FeatureRow
            key={`feature-${i}`}
            location={gridLocations[i]!}
            onSelect={onSelect}
          />
        );
        i += 1;
      }

      // ThreeUp Row (3 items)
      if (i < gridLocations.length) {
        const threeItems = gridLocations.slice(i, Math.min(i + 3, gridLocations.length));
        if (threeItems.length > 0) {
          result.push(
            <ThreeUpRow
              key={`three-${i}`}
              locations={threeItems}
              onSelect={onSelect}
            />
          );
          i += threeItems.length;
        }
      }

      // TwoUp Row (2 items)
      if (i < gridLocations.length) {
        const twoItems = gridLocations.slice(i, Math.min(i + 2, gridLocations.length));
        if (twoItems.length > 0) {
          result.push(
            <TwoUpRow
              key={`two-${i}`}
              locations={twoItems}
              onSelect={onSelect}
            />
          );
          i += twoItems.length;
        }
      }

      moduleCount += 1;

      // Insert text interstitial + full-bleed row every 3 modules
      if (moduleCount % INTERSTITIAL_INTERVAL === 0 && i < gridLocations.length) {
        const text = activeCategory
          ? INTERSTITIAL_MESSAGES[activeCategory] || DEFAULT_INTERSTITIALS[interstitialIndex % DEFAULT_INTERSTITIALS.length]!
          : DEFAULT_INTERSTITIALS[interstitialIndex % DEFAULT_INTERSTITIALS.length]!;

        result.push(
          <TextInterstitial key={`interstitial-${moduleCount}`} text={text} />
        );
        interstitialIndex += 1;

        // Insert full-bleed row after the interstitial
        if (fullBleedIndex < fullBleedLocations.length) {
          result.push(
            <FullBleedRow
              key={`fullbleed-${fullBleedIndex}`}
              location={fullBleedLocations[fullBleedIndex]!}
            />
          );
          fullBleedIndex += 1;
        }
      }
    }

    return result;
  }, [locations, onSelect, activeCategory]);

  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface">
          <svg className="h-8 w-8 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p className="text-base font-medium text-foreground mb-1">Nothing matched those filters</p>
        <p className="text-sm text-stone text-center max-w-sm">
          Try removing a filter or searching for something else.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-10">
      {rows}
    </div>
  );
}
