"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { PlacesCardB } from "@b/features/places/PlacesCardB";
import { CityStatBarB } from "./CityStatBarB";
import { CategoryBreakdownB } from "./CategoryBreakdownB";
import type { CityPageData } from "@/lib/cities/cityData";
import type { CityStats, CategoryBreakdown } from "@/lib/cities/cityHelpers";
import type { Location } from "@/types/location";
import { resizePhotoUrl } from "@/lib/google/transformations";

type NearbyCity = {
  id: string;
  name: string;
  locationCount: number;
};

type Props = {
  city: CityPageData;
  stats: CityStats;
  categories: CategoryBreakdown[];
  topLocations: Location[];
  hiddenGems: Location[];
  heroImage?: string;
  regionName: string;
  nearbyCities: NearbyCity[];
};

const FALLBACK_HERO =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export function CityDetailB({
  city,
  stats,
  categories,
  topLocations,
  hiddenGems,
  heroImage,
  regionName,
  nearbyCities,
}: Props) {
  const heroSrc = resizePhotoUrl(heroImage, 1600) ?? FALLBACK_HERO;

  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[360px] sm:h-[60vh] overflow-hidden">
        <Image
          src={heroSrc}
          alt={city.name}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/30 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="w-full px-4 sm:px-6 lg:px-8 pb-10 sm:pb-14">
            <div className="mx-auto max-w-7xl">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2 mb-3"
              >
                <Link
                  href="/b/cities"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors"
                >
                  Cities
                </Link>
                <span className="text-white/40">/</span>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                  {regionName}
                </span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight"
              >
                {city.name}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-2 text-lg text-white/80"
              >
                {city.nameJapanese} · {city.tagline}
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* Description + Stats */}
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-2xl text-base sm:text-lg text-[var(--foreground-body)] leading-relaxed"
          >
            {city.description}
          </motion.p>
          <div className="mt-8">
            <CityStatBarB stats={stats} />
          </div>
        </div>
      </section>

      {/* Category Breakdown */}
      {categories.length > 0 && (
        <CategoryBreakdownB categories={categories} cityName={city.name} />
      )}

      {/* Top-Rated Locations */}
      {topLocations.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-xl sm:text-2xl font-semibold text-[var(--foreground)] tracking-tight"
            >
              Top-rated in {city.name}
            </motion.h2>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {topLocations.map((loc, i) => (
                <PlacesCardB key={loc.id} location={loc} eager={i < 4} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Hidden Gems */}
      {hiddenGems.length > 0 && (
        <section className="py-12 sm:py-16 bg-[var(--surface)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                Off the beaten path
              </p>
              <h2 className="mt-2 text-xl sm:text-2xl font-semibold text-[var(--foreground)] tracking-tight">
                Hidden gems in {city.name}
              </h2>
            </motion.div>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {hiddenGems.map((loc) => (
                <PlacesCardB key={loc.id} location={loc} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Nearby Cities */}
      {nearbyCities.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-xl sm:text-2xl font-semibold text-[var(--foreground)] tracking-tight"
            >
              Nearby in {regionName}
            </motion.h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {nearbyCities.map((nc) => (
                <Link
                  key={nc.id}
                  href={`/b/cities/${nc.id}`}
                  className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]"
                >
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {nc.name}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {nc.locationCount} places
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight"
          >
            Plan a trip to {city.name}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-3 text-[var(--foreground-body)]"
          >
            Build a personalized itinerary with the best of {city.name}.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8"
          >
            <Link
              href="/b/trip-builder"
              className="inline-flex h-12 items-center rounded-xl bg-[var(--primary)] px-8 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Start planning
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
