"use client";

import { useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  getActiveSeasonalHighlight,
  locationHasSeasonalTag,
  getCurrentMonth,
  type SeasonalHighlight,
} from "@/lib/utils/seasonUtils";
import type { Location } from "@/types/location";

type SeasonalBannerProps = {
  locations: Location[];
  onFilterSeasonal: () => void;
};

export function SeasonalBanner({ locations, onFilterSeasonal }: SeasonalBannerProps) {
  const highlight = useMemo<SeasonalHighlight | null>(
    () => getActiveSeasonalHighlight(),
    []
  );

  const matchCount = useMemo(() => {
    if (!highlight) return 0;
    const month = getCurrentMonth();
    return locations.filter((loc) => locationHasSeasonalTag(loc.tags, month)).length;
  }, [highlight, locations]);

  if (!highlight || matchCount === 0) return null;

  return (
    <AnimatePresence>
      <m.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="text-sm text-foreground-secondary"
      >
        {highlight.description}. {matchCount.toLocaleString()} {matchCount === 1 ? "place" : "places"} to explore.{" "}
        <button
          type="button"
          onClick={onFilterSeasonal}
          className="font-medium text-brand-primary hover:underline underline-offset-2 active:scale-[0.98] transition-colors"
        >
          View
        </button>
      </m.p>
    </AnimatePresence>
  );
}
