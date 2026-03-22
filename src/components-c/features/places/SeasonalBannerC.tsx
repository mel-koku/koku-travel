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

type SeasonalBannerCProps = {
  locations: Location[];
  onFilterSeasonal: () => void;
};

export function SeasonalBannerC({ locations, onFilterSeasonal }: SeasonalBannerCProps) {
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
      >
        <div className="flex items-center gap-3 border border-[var(--border)] px-4 py-3">
          <div className="flex-1 min-w-0">
            <p
              className="text-sm leading-snug"
              style={{
                fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                fontWeight: 700,
                color: "var(--foreground)",
              }}
            >
              {highlight.label}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {highlight.description}. {matchCount.toLocaleString()} {matchCount === 1 ? "place" : "places"} to explore.
            </p>
          </div>
          <button
            type="button"
            onClick={onFilterSeasonal}
            className="shrink-0 bg-[var(--foreground)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--background)] transition-colors hover:opacity-90 active:scale-[0.98] min-h-[44px]"
          >
            View
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
