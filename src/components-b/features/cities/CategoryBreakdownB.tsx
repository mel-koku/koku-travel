"use client";

import { motion } from "framer-motion";
import type { CategoryBreakdown } from "@/lib/cities/cityHelpers";
import { getCategoryHexColor } from "@/lib/itinerary/activityColors";

type Props = {
  categories: CategoryBreakdown[];
  cityName: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: "Restaurants",
  nature: "Nature",
  landmark: "Landmarks",
  culture: "Culture",
  shrine: "Shrines",
  museum: "Museums",
  park: "Parks",
  temple: "Temples",
  shopping: "Shopping",
  garden: "Gardens",
  onsen: "Onsen",
  entertainment: "Entertainment",
  market: "Markets",
  wellness: "Wellness",
  viewpoint: "Viewpoints",
  bar: "Bars",
  aquarium: "Aquariums",
  beach: "Beaches",
  cafe: "Cafes",
  castle: "Castles",
  historic_site: "Historic Sites",
  theater: "Theaters",
  zoo: "Zoos",
  craft: "Craft",
};

export function CategoryBreakdownB({ categories, cityName }: Props) {
  const maxCount = categories[0]?.count ?? 1;

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-[var(--foreground)] tracking-tight">
          What {cityName} is known for
        </h2>
        <div className="mt-8 space-y-3 max-w-2xl">
          {categories.slice(0, 10).map((cat, i) => {
            const color = getCategoryHexColor(cat.category);
            const widthPct = Math.max((cat.count / maxCount) * 100, 4);

            return (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="flex items-center gap-3"
              >
                <span className="w-28 shrink-0 text-sm capitalize text-[var(--foreground-body)]">
                  {CATEGORY_LABELS[cat.category] ?? cat.category}
                </span>
                <div className="flex-1 h-7 rounded-lg bg-[var(--surface)] overflow-hidden">
                  <motion.div
                    className="h-full rounded-lg flex items-center justify-end pr-2"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${widthPct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <span className="text-[11px] font-semibold text-white">
                      {cat.count}
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
