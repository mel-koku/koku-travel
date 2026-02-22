"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const STORAGE_PREFIX = "koku:seasonal-banner-dismissed:";

function isDismissed(highlightId: string): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${highlightId}`) === "true";
  } catch {
    return false;
  }
}

function dismiss(highlightId: string) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${highlightId}`, "true");
  } catch {
    // quota exceeded — ignore
  }
}

export function SeasonalBanner({ locations, onFilterSeasonal }: SeasonalBannerProps) {
  const highlight = useMemo<SeasonalHighlight | null>(
    () => getActiveSeasonalHighlight(),
    []
  );

  const [visible, setVisible] = useState(false);

  // Check dismissal on mount (requires client-side localStorage)
  useEffect(() => {
    if (highlight && !isDismissed(highlight.id)) {
      setVisible(true);
    }
  }, [highlight]);

  const matchCount = useMemo(() => {
    if (!highlight) return 0;
    const month = getCurrentMonth();
    return locations.filter((loc) => locationHasSeasonalTag(loc.tags, month)).length;
  }, [highlight, locations]);

  const handleDismiss = useCallback(() => {
    if (highlight) {
      dismiss(highlight.id);
    }
    setVisible(false);
  }, [highlight]);

  if (!highlight || matchCount === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          <div className="flex items-center gap-3 rounded-xl border border-brand-secondary/20 bg-brand-secondary/10 px-4 py-3">
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
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss seasonal banner"
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-foreground-secondary hover:text-foreground hover:bg-surface/50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
