"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        transition={{ duration: 0.3 }}
        className="mx-auto max-w-2xl px-4 sm:px-6 py-1"
      >
        <div className="flex items-center gap-3 rounded-xl bg-brand-primary/[0.06] px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {highlight.label}
            </p>
            <p className="text-xs text-foreground-secondary mt-0.5">
              {highlight.description} — {matchCount.toLocaleString()} {matchCount === 1 ? "place" : "places"} to explore
            </p>
          </div>
          <button
            type="button"
            onClick={onFilterSeasonal}
            className="shrink-0 rounded-xl bg-brand-secondary/20 px-3 py-1.5 text-xs font-medium text-brand-secondary hover:bg-brand-secondary/30 transition-colors"
          >
            View
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
