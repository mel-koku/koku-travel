"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Location } from "@/types/location";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type FeaturedLocationsBProps = {
  locations: Location[];
  content?: LandingPageContent;
};

export function FeaturedLocationsB({
  locations,
  content,
}: FeaturedLocationsBProps) {
  const heading =
    content?.featuredLocationsHeading ?? "Places worth the journey";
  const description =
    content?.featuredLocationsDescription ??
    "Hand-picked spots across Japan — top-rated by visitors, vetted by locals.";

  return (
    <section className="bg-[var(--background)] py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header — enters first */}
        <div className="max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
          >
            {content?.featuredLocationsEyebrow ?? "Featured Places"}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
              duration: 0.7,
              delay: 0.08,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl"
          >
            {heading}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
              duration: 0.6,
              delay: 0.16,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="mt-3 text-[var(--foreground-body)]"
          >
            {description}
          </motion.p>
        </div>

        {/* Cards — staggered cascade */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {locations.slice(0, 8).map((loc, i) => (
            <motion.div
              key={loc.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{
                duration: 0.6,
                delay: 0.1 + i * 0.08,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              whileHover={{
                y: -4,
                transition: { type: "spring", stiffness: 300, damping: 25 },
              }}
              className="transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]"
              style={{ borderRadius: "1rem" }}
            >
              <Link
                href={`/b/places?location=${loc.id}`}
                className="group block overflow-hidden rounded-2xl bg-white"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={
                      loc.primaryPhotoUrl ??
                      loc.image ??
                      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&q=75"
                    }
                    alt={loc.name}
                    fill
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-[var(--foreground)] transition-colors duration-200 group-hover:text-[var(--primary)]">
                    {loc.name}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {loc.city}
                    {loc.rating ? ` · ${loc.rating}` : ""}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* View all */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-10 text-center"
        >
          <Link
            href="/b/places"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] px-6 text-sm font-medium text-[var(--foreground)] transition-all duration-200 hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            {content?.featuredLocationsCtaText ?? "View All Places"}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
