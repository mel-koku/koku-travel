"use client";

import { motion } from "framer-motion";
import type { CityStats } from "@/lib/cities/cityHelpers";

type Props = {
  stats: CityStats;
};

export function CityStatBarB({ stats }: Props) {
  const topCategory = stats.topCategories[0]?.category ?? "—";

  const items = [
    { label: "Places", value: stats.totalLocations.toString() },
    { label: "Hidden gems", value: stats.hiddenGemsCount.toString() },
    ...(stats.averageRating > 0
      ? [{ label: "Avg rating", value: stats.averageRating.toFixed(1) }]
      : []),
    { label: "Known for", value: topCategory },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex flex-wrap gap-3"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-[var(--shadow-sm)]"
        >
          <span className="text-xs text-[var(--muted-foreground)]">
            {item.label}
          </span>
          <span className="text-sm font-semibold capitalize text-[var(--foreground)]">
            {item.value}
          </span>
        </div>
      ))}
    </motion.div>
  );
}
