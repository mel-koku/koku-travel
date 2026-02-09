"use client";

import { useMemo, type ReactNode } from "react";
import type { Location } from "@/types/location";
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
  shopping: "Shotengai, department stores, and hidden boutiques.",
  view: "The vantage points worth the climb.",
};

const DEFAULT_INTERSTITIALS = [
  "Keep scrolling. The best places are the ones you almost missed.",
  "From neon-lit streets to moss-covered paths.",
  "Every backstreet has a story.",
];

/**
 * Chunks locations into repeating editorial row modules:
 * Module pattern per 6 items: FeatureRow(1) + ThreeUpRow(3) + TwoUpRow(2)
 * Inserts TextInterstitial every ~18 items (3 modules).
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

    for (let i = 0; i < locations.length; ) {
      const remaining = locations.length - i;

      // Feature Row (1 item)
      if (remaining >= 1) {
        result.push(
          <FeatureRow
            key={`feature-${i}`}
            location={locations[i]!}
            onSelect={onSelect}
          />
        );
        i += 1;
      }

      // ThreeUp Row (3 items)
      if (i < locations.length) {
        const threeItems = locations.slice(i, Math.min(i + 3, locations.length));
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
      if (i < locations.length) {
        const twoItems = locations.slice(i, Math.min(i + 2, locations.length));
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

      // Insert text interstitial every 3 modules
      if (moduleCount % INTERSTITIAL_INTERVAL === 0 && i < locations.length) {
        const text = activeCategory
          ? INTERSTITIAL_MESSAGES[activeCategory] || DEFAULT_INTERSTITIALS[interstitialIndex % DEFAULT_INTERSTITIALS.length]!
          : DEFAULT_INTERSTITIALS[interstitialIndex % DEFAULT_INTERSTITIALS.length]!;

        result.push(
          <TextInterstitial key={`interstitial-${moduleCount}`} text={text} />
        );
        interstitialIndex += 1;
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
        <p className="text-base font-medium text-foreground mb-1">No places found</p>
        <p className="text-sm text-stone text-center max-w-sm">
          Try adjusting your filters or search to find what you&apos;re looking for.
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
