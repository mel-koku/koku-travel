"use client";

import { motion } from "framer-motion";
import { CityCardB } from "./CityCardB";
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

export function CityIndexB({ regions, totalCities }: Props) {
  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      {/* Hero */}
      <section className="pt-32 pb-12 sm:pt-40 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
          >
            {totalCities} cities across Japan
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--foreground)] tracking-tight"
          >
            Cities of Japan
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 max-w-xl text-lg text-[var(--foreground-body)]"
          >
            From neon-lit capitals to mountain onsen towns. Find your next destination.
          </motion.p>
        </div>
      </section>

      {/* Region groups */}
      {regions.map((region) => (
        <section key={region.regionId} className="py-10 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--foreground)] tracking-tight">
                {region.regionName}
              </h2>
              <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
                {region.tagline}
              </p>
            </motion.div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {region.cities.map((city, i) => (
                <CityCardB
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
