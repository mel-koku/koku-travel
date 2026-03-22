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

type SeasonalBannerBProps = {
  locations: Location[];
  onFilterSeasonal: () => void;
};

export function SeasonalBannerB({ locations, onFilterSeasonal }: SeasonalBannerBProps) {
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
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="flex items-center gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {highlight.label}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {highlight.description} — {matchCount.toLocaleString()} {matchCount === 1 ? "place" : "places"} to explore
            </p>
          </div>
          <button
            type="button"
            onClick={onFilterSeasonal}
            className="shrink-0 rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] transition-colors"
          >
            View
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
