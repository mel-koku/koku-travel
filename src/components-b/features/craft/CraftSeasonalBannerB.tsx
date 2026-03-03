"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { getActiveCraftHighlights } from "@/data/craftSeasons";
import { getCraftTypeColor } from "@/data/craftTypes";
import type { CraftTypeId } from "@/data/craftTypes";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

type CraftSeasonalBannerBProps = {
  onSelectCraftType: (craftType: CraftTypeId) => void;
};

export function CraftSeasonalBannerB({ onSelectCraftType }: CraftSeasonalBannerBProps) {
  const highlights = useMemo(() => {
    const month = new Date().getMonth() + 1;
    return getActiveCraftHighlights(month);
  }, []);

  if (highlights.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-4">
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory overscroll-contain pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {highlights.map((h, i) => (
          <motion.button
            key={h.craftType}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: bEase, delay: i * 0.06 }}
            onClick={() => onSelectCraftType(h.craftType)}
            className="group snap-start shrink-0 flex items-start gap-3 rounded-2xl bg-white p-4 text-left transition-shadow shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] min-w-[260px] max-w-[320px]"
          >
            <span
              className="mt-0.5 block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getCraftTypeColor(h.craftType) }}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                {h.title}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)] line-clamp-2">
                {h.description}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
