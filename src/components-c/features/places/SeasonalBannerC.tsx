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

type SeasonalBannerCProps = {
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
    // quota exceeded
  }
}

export function SeasonalBannerC({ locations, onFilterSeasonal }: SeasonalBannerCProps) {
  const highlight = useMemo<SeasonalHighlight | null>(
    () => getActiveSeasonalHighlight(),
    []
  );

  const [visible, setVisible] = useState(false);

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
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss seasonal banner"
              className="shrink-0 flex h-11 w-11 items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
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
