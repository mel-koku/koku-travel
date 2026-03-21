"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { cEase, fadeUp } from "@c/ui/motionC";
import { resizePhotoUrl } from "@/lib/google/transformations";
import type { CityPageData } from "@/lib/cities/cityData";
import type { CityStats } from "@/lib/cities/cityHelpers";

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

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

export function CityIndexC({ regions, totalCities }: Props) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      {/* Hero */}
      <section className="pt-32 pb-12 sm:pt-40 sm:pb-16">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <motion.p
            initial={prefersReducedMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: cEase }}
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]"
          >
            {totalCities} cities across Japan
          </motion.p>
          <motion.h1
            initial={
              prefersReducedMotion ? undefined : { opacity: 0, y: 16 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: cEase, delay: 0.1 }}
            className="mt-4 leading-[1.1]"
            style={{
              fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
              fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--foreground)",
            }}
          >
            Cities of Japan
          </motion.h1>
          <motion.p
            initial={
              prefersReducedMotion ? undefined : { opacity: 0, y: 16 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: cEase, delay: 0.2 }}
            className="mt-4 max-w-xl text-sm text-[var(--muted-foreground)] lg:text-[15px]"
          >
            From neon-lit capitals to mountain onsen towns. Find your next
            destination.
          </motion.p>
        </div>
      </section>

      {/* Region groups */}
      {regions.map((region) => (
        <section
          key={region.regionId}
          className="border-t border-[var(--border)]"
        >
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-16 sm:py-20 lg:py-24">
            <motion.div
              initial={prefersReducedMotion ? undefined : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, ease: cEase }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Region
              </p>
              <h2
                className="mt-3 leading-[1.1]"
                style={{
                  fontFamily:
                    "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--foreground)",
                }}
              >
                {region.regionName}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {region.tagline}
              </p>
            </motion.div>

            <div className="mt-10 grid grid-cols-1 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
              {region.cities.map((city, i) => (
                <CityCardC
                  key={city.data.id}
                  slug={city.data.id}
                  name={city.data.name}
                  nameJapanese={city.data.nameJapanese}
                  tagline={city.data.tagline}
                  locationCount={city.stats.totalLocations}
                  topCategories={city.stats.topCategories}
                  heroImage={city.heroImage}
                  index={i}
                  noMotion={!!prefersReducedMotion}
                />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* City Card                                                           */
/* ------------------------------------------------------------------ */

type CityCardCProps = {
  slug: string;
  name: string;
  nameJapanese: string;
  tagline: string;
  locationCount: number;
  topCategories: { category: string; count: number }[];
  heroImage?: string;
  index: number;
  noMotion: boolean;
};

function CityCardC({
  slug,
  name,
  nameJapanese,
  tagline,
  locationCount,
  topCategories,
  heroImage,
  index,
  noMotion,
}: CityCardCProps) {
  const imageSrc = resizePhotoUrl(heroImage, 800) ?? FALLBACK_IMAGE;
  const hasImage = heroImage != null;

  return (
    <motion.article
      initial={noMotion ? undefined : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={fadeUp(index * 0.08)}
      className="group bg-[var(--background)]"
    >
      <Link href={`/c/cities/${slug}`} className="block">
        {/* Image */}
        <div className="relative aspect-[16/9] overflow-hidden">
          {hasImage ? (
            <Image
              src={imageSrc}
              alt={name}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[var(--surface)]">
              <span
                className="text-lg font-bold text-[var(--muted-foreground)]"
                style={{ letterSpacing: "-0.02em" }}
              >
                {nameJapanese}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 lg:p-6 space-y-2">
          <div className="flex items-baseline gap-2">
            <h3
              className="text-base font-bold text-[var(--foreground)] transition-colors duration-200 group-hover:text-[var(--primary)] lg:text-lg"
              style={{ letterSpacing: "-0.01em" }}
            >
              {name}
            </h3>
            <span className="text-xs text-[var(--muted-foreground)]">
              {nameJapanese}
            </span>
          </div>

          <p className="text-sm text-[var(--muted-foreground)] line-clamp-1">
            {tagline}
          </p>

          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            <span className="border border-[var(--primary)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--primary)]">
              {locationCount} places
            </span>
            {topCategories.slice(0, 3).map((cat) => (
              <span
                key={cat.category}
                className="border border-[var(--border)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]"
              >
                {cat.category}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
