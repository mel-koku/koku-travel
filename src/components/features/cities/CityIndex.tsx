"use client";

import { motion } from "framer-motion";
import { typography } from "@/lib/typography-system";
import { CityCard } from "./CityCard";
import type { CityPageData } from "@/lib/cities/cityData";
import type { CityStats } from "@/lib/cities/cityHelpers";

type CityEntry = {
  data: CityPageData;
  stats: CityStats;
  heroImage?: string;
};

type RegionGroup = {
  regionId: string;
  regionName: string;
  tagline: string;
  cities: CityEntry[];
};

type Props = {
  regions: RegionGroup[];
  totalCities: number;
};

export function CityIndex({ regions, totalCities }: Props) {
  return (
    <div className="min-h-[100dvh]">
      {/* Hero */}
      <section className="pt-32 pb-12 sm:pt-40 sm:pb-16 px-6">
        <div className="mx-auto max-w-7xl">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="eyebrow-editorial text-brand-primary"
          >
            {totalCities} cities across Japan
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={`mt-3 ${typography({ intent: "editorial-h1" })}`}
          >
            Cities of Japan
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 max-w-xl text-lg text-foreground-secondary"
          >
            From neon-lit capitals to mountain onsen towns. Find your next destination.
          </motion.p>
        </div>
      </section>

      {/* Region groups — alternating bg */}
      {regions.map((region, ri) => (
        <section
          key={region.regionId}
          className={`py-12 sm:py-16 ${ri % 2 === 1 ? "bg-canvas" : ""}`}
        >
          <div className="mx-auto max-w-7xl px-6">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5 }}
            >
              <h2 className={typography({ intent: "editorial-h2" })}>
                {region.regionName}
              </h2>
              <p className="mt-1.5 text-sm text-foreground-secondary">
                {region.tagline}
              </p>
            </motion.div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {region.cities.map((city, i) => (
                <CityCard
                  key={city.data.id}
                  slug={city.data.id}
                  name={city.data.name}
                  nameJapanese={city.data.nameJapanese}
                  tagline={city.data.tagline}
                  regionName={region.regionName}
                  locationCount={city.stats.totalLocations}
                  topCategories={city.stats.topCategories}
                  heroImage={city.heroImage}
                  index={i}
                />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
