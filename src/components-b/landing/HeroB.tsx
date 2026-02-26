"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import type { LandingPageContent } from "@/types/sanitySiteContent";
import { urlFor } from "@/sanity/image";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.1 + i * 0.12, ease: bEase },
  }),
};

type HeroBProps = {
  locationCount: number;
  content?: LandingPageContent;
};

export function HeroB({ locationCount, content }: HeroBProps) {
  const headline =
    content?.heroHeadline ?? "Travel Japan like the people who live here";
  const description = (
    content?.heroDescription ??
    "Curated guides and smart itineraries built from {locationCount}+ local-vetted places."
  ).replace("{locationCount}", String(locationCount));

  const heroImage = content?.heroImage;
  const imageUrl = heroImage
    ? urlFor(heroImage).width(1200).quality(85).url()
    : "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=80";

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 pb-12 pt-28 sm:gap-12 sm:pb-16 sm:pt-32 lg:grid-cols-2 lg:gap-16 lg:pb-20 lg:pt-36">
          {/* Text */}
          <div className="max-w-xl">
            <motion.p
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
            >
              Discover Japan
            </motion.p>
            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-4 text-[clamp(2.25rem,5vw,4.5rem)] font-bold leading-[1.1] tracking-[-0.04em] text-[var(--foreground)]"
            >
              {headline}
            </motion.h1>
            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-5 text-base leading-relaxed text-[var(--foreground-body)] sm:text-lg"
            >
              {description}
            </motion.p>
            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Link
                href="/b/trip-builder"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--primary)] px-8 text-sm font-medium text-white shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]"
              >
                {content?.heroPrimaryCtaText ?? "Build My Trip"}
              </Link>
              <Link
                href="/b/places"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--border)] px-8 text-sm font-medium text-[var(--foreground)] transition-all hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                {content?.heroSecondaryCtaText ?? "Explore Places"}
              </Link>
            </motion.div>
          </div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: bEase }}
            className="relative aspect-[3/2] overflow-hidden rounded-3xl lg:aspect-[4/3]"
            style={{ boxShadow: "var(--shadow-depth)" }}
          >
            <motion.div
              animate={{ scale: [1, 1.03, 1] }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0"
            >
              <Image
                src={imageUrl}
                alt="Japan travel"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
