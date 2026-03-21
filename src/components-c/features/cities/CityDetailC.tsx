"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { PlacesCardC } from "@c/features/places/PlacesCardC";
import { cEase, fadeUp } from "@c/ui/motionC";
import { getCategoryHexColor } from "@/lib/itinerary/activityColors";
import { resizePhotoUrl } from "@/lib/google/transformations";
import type { CityPageData } from "@/lib/cities/cityData";
import type { CityStats, CategoryBreakdown } from "@/lib/cities/cityHelpers";
import type { Location } from "@/types/location";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const FALLBACK_HERO =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

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

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function CityDetailC({
  city,
  stats,
  categories,
  topLocations,
  hiddenGems,
  heroImage,
  regionName,
  nearbyCities,
}: Props) {
  const prefersReducedMotion = useReducedMotion();
  const heroSrc = resizePhotoUrl(heroImage, 1600) ?? FALLBACK_HERO;

  const initial = (vals: Record<string, number>) =>
    prefersReducedMotion ? undefined : { opacity: 0, ...vals };

  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      {/* ------------------------------------------------------------ */}
      {/* Hero                                                          */}
      {/* ------------------------------------------------------------ */}
      <section className="relative h-[50vh] min-h-[360px] sm:h-[60vh] overflow-hidden">
        <Image
          src={heroSrc}
          alt={city.name}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/40 to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="w-full px-6 lg:px-10 pb-10 sm:pb-14">
            <div className="mx-auto max-w-[1400px]">
              {/* Breadcrumb */}
              <motion.div
                initial={initial({})}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: cEase }}
                className="flex items-center gap-2 mb-4"
              >
                <Link
                  href="/c/cities"
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors"
                >
                  Cities
                </Link>
                <span className="text-white/30">/</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                  {regionName}
                </span>
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={initial({ y: 16 })}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: cEase, delay: 0.1 }}
                style={{
                  fontFamily:
                    "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "white",
                  fontSize: "clamp(2rem, 5vw, 3.5rem)",
                  lineHeight: 1.1,
                }}
              >
                {city.name}
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={initial({})}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: cEase, delay: 0.2 }}
                className="mt-3 text-sm sm:text-base text-white/80"
              >
                {city.nameJapanese} / {city.tagline}
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Description + Stats bar                                       */}
      {/* ------------------------------------------------------------ */}
      <section className="py-16 sm:py-20 lg:py-24 border-b border-[var(--border)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <motion.p
            initial={initial({ y: 16 })}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: cEase, delay: 0.1 }}
            className="max-w-2xl text-sm sm:text-base text-[var(--muted-foreground)] leading-relaxed lg:text-[15px]"
          >
            {city.description}
          </motion.p>

          {/* Stats: gap-px border grid */}
          <motion.div
            initial={initial({ y: 16 })}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: cEase, delay: 0.2 }}
            className="mt-10 inline-grid grid-cols-2 sm:grid-cols-4 gap-px border border-[var(--border)] bg-[var(--border)]"
          >
            <StatCell label="Places" value={stats.totalLocations.toString()} />
            <StatCell
              label="Hidden gems"
              value={stats.hiddenGemsCount.toString()}
            />
            {stats.averageRating > 0 && (
              <StatCell
                label="Avg rating"
                value={stats.averageRating.toFixed(1)}
              />
            )}
            <StatCell
              label="Known for"
              value={stats.topCategories[0]?.category ?? "Various"}
              capitalize
            />
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Category Breakdown                                            */}
      {/* ------------------------------------------------------------ */}
      {categories.length > 0 && (
        <section className="py-16 sm:py-20 lg:py-24 border-b border-[var(--border)]">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
            <motion.div
              initial={prefersReducedMotion ? undefined : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp()}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Breakdown
              </p>
              <h2
                className="mt-3 leading-[1.1]"
                style={{
                  fontFamily:
                    "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontSize: "clamp(1.25rem, 2vw, 1.75rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--foreground)",
                }}
              >
                What {city.name} is known for
              </h2>
            </motion.div>

            <div className="mt-10 max-w-2xl space-y-2">
              {categories.slice(0, 10).map((cat, i) => {
                const color = getCategoryHexColor(cat.category);
                const maxCount = categories[0]?.count ?? 1;
                const widthPct = Math.max((cat.count / maxCount) * 100, 4);

                return (
                  <motion.div
                    key={cat.category}
                    initial={
                      prefersReducedMotion
                        ? undefined
                        : { opacity: 0, x: -12 }
                    }
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.4,
                      delay: i * 0.04,
                      ease: cEase,
                    }}
                    className="flex items-center gap-3"
                  >
                    <span className="w-28 shrink-0 text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                      {CATEGORY_LABELS[cat.category] ?? cat.category}
                    </span>
                    <div className="flex-1 h-6 bg-[var(--surface)] overflow-hidden">
                      <motion.div
                        className="h-full flex items-center justify-end pr-2"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${widthPct}%` }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.6,
                          delay: 0.1 + i * 0.04,
                          ease: cEase,
                        }}
                      >
                        <span className="text-[10px] font-bold text-white">
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
      )}

      {/* ------------------------------------------------------------ */}
      {/* Top-Rated Locations                                           */}
      {/* ------------------------------------------------------------ */}
      {topLocations.length > 0 && (
        <section className="py-16 sm:py-20 lg:py-24 border-b border-[var(--border)]">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
            <motion.div
              initial={prefersReducedMotion ? undefined : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp()}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Top rated
              </p>
              <h2
                className="mt-3 leading-[1.1]"
                style={{
                  fontFamily:
                    "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontSize: "clamp(1.25rem, 2vw, 1.75rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--foreground)",
                }}
              >
                Best of {city.name}
              </h2>
            </motion.div>

            <div className="mt-10 grid grid-cols-1 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
              {topLocations.map((loc, i) => (
                <PlacesCardC key={loc.id} location={loc} eager={i < 4} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ */}
      {/* Hidden Gems                                                   */}
      {/* ------------------------------------------------------------ */}
      {hiddenGems.length > 0 && (
        <section className="py-16 sm:py-20 lg:py-24 border-b border-[var(--border)]">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
            <motion.div
              initial={prefersReducedMotion ? undefined : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp()}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                Off the beaten path
              </p>
              <h2
                className="mt-3 leading-[1.1]"
                style={{
                  fontFamily:
                    "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontSize: "clamp(1.25rem, 2vw, 1.75rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--foreground)",
                }}
              >
                Worth finding in {city.name}
              </h2>
            </motion.div>

            <div className="mt-10 grid grid-cols-1 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
              {hiddenGems.map((loc) => (
                <PlacesCardC key={loc.id} location={loc} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ */}
      {/* Nearby Cities                                                 */}
      {/* ------------------------------------------------------------ */}
      {nearbyCities.length > 0 && (
        <section className="py-16 sm:py-20 lg:py-24 border-b border-[var(--border)]">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
            <motion.div
              initial={prefersReducedMotion ? undefined : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp()}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Same region
              </p>
              <h2
                className="mt-3 leading-[1.1]"
                style={{
                  fontFamily:
                    "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontSize: "clamp(1.25rem, 2vw, 1.75rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--foreground)",
                }}
              >
                Nearby in {regionName}
              </h2>
            </motion.div>

            <div className="mt-8 flex flex-wrap gap-px bg-[var(--border)] border border-[var(--border)] w-fit">
              {nearbyCities.map((nc, i) => (
                <motion.div
                  key={nc.id}
                  initial={
                    prefersReducedMotion ? undefined : { opacity: 0, y: 8 }
                  }
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    delay: i * 0.05,
                    ease: cEase,
                  }}
                >
                  <Link
                    href={`/c/cities/${nc.id}`}
                    className="flex items-center gap-3 bg-[var(--background)] px-5 py-4 transition-colors hover:bg-[var(--surface)] active:scale-[0.98]"
                  >
                    <span
                      className="text-sm text-[var(--foreground)]"
                      style={{ fontWeight: 700, letterSpacing: "-0.01em" }}
                    >
                      {nc.name}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                      {nc.locationCount} places
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ */}
      {/* CTA                                                           */}
      {/* ------------------------------------------------------------ */}
      <section className="py-24 sm:py-32 lg:py-48">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <motion.div
            initial={prefersReducedMotion ? undefined : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={fadeUp()}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Ready to go
            </p>
            <h2
              className="mt-4 leading-[1.1]"
              style={{
                fontFamily:
                  "var(--font-plus-jakarta), system-ui, sans-serif",
                fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "var(--foreground)",
              }}
            >
              Plan a trip to {city.name}
            </h2>
            <p className="mt-3 text-sm text-[var(--muted-foreground)] lg:text-[15px]">
              Build a personalized itinerary with the best of {city.name}.
            </p>
            <div className="mt-8">
              <Link
                href="/c/trip-builder"
                className="inline-flex h-11 items-center bg-[var(--primary)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-colors hover:brightness-110 active:scale-[0.98]"
              >
                Start planning
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stat Cell                                                            */
/* ------------------------------------------------------------------ */

function StatCell({
  label,
  value,
  capitalize: cap,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="bg-[var(--background)] px-5 py-4 sm:px-6 sm:py-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p
        className={`mt-1 text-lg text-[var(--foreground)] ${cap ? "capitalize" : ""}`}
        style={{ fontWeight: 700, letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
    </div>
  );
}
