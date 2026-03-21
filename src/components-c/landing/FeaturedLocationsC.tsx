"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { Location } from "@/types/location";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type FeaturedLocationsCProps = {
  locations: Location[];
  content?: LandingPageContent;
};

const cEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: cEase },
  },
};

export function FeaturedLocationsC({
  locations,
  content,
}: FeaturedLocationsCProps) {
  const prefersReducedMotion = useReducedMotion();
  if (!locations.length) return null;

  // Take first 6 for the grid
  const featured = locations.slice(0, 6);

  return (
    <section
      aria-label="Featured places"
      className="bg-[var(--background)]"
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="py-24 sm:py-32 lg:py-48">
          {/* Section header: 12-col grid, header left, link right */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                {content?.featuredLocationsEyebrow ?? "Featured"}
              </p>
              <h2
                className="mt-4 leading-[1.1]"
                style={{
                  fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--foreground)",
                }}
              >
                {content?.featuredLocationsHeading ?? "Places worth the trip"}
              </h2>
            </div>
            <Link
              href="/c/places"
              className="hidden text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--primary)] transition-opacity hover:opacity-70 sm:block"
            >
              View All
            </Link>
          </div>

          {/* Modular grid: 2 large + 4 small, asymmetric */}
          <div className="mt-12 grid grid-cols-1 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
            {featured.map((loc) => (
                <motion.div
                  key={loc.id}
                  initial={prefersReducedMotion ? undefined : "hidden"}
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={fadeUp}
                  className="group relative overflow-hidden bg-[var(--background)]"
                >
                  <Link href={`/c/places/${loc.id}`} className="block">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {loc.image ? (
                        <Image
                          src={loc.image}
                          alt={loc.name}
                          fill
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[var(--surface)]">
                          <span className="text-sm text-[var(--muted-foreground)]">
                            No image
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 lg:p-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                        {loc.city ?? loc.region}
                      </p>
                      <h3
                        className="mt-2 text-base font-bold text-[var(--foreground)] transition-colors duration-200 group-hover:text-[var(--primary)] lg:text-lg"
                        style={{ letterSpacing: "-0.01em" }}
                      >
                        {loc.name}
                      </h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                        {loc.category}
                      </p>
                    </div>
                  </Link>
                </motion.div>
            ))}
          </div>

          {/* Mobile "View All" */}
          <div className="mt-8 sm:hidden">
            <Link
              href="/c/places"
              className="inline-flex h-12 items-center justify-center border border-[var(--foreground)] px-8 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--foreground)] transition-colors hover:bg-[var(--foreground)] hover:text-[var(--background)]"
            >
              View All Places
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b border-[var(--border)]" />
    </section>
  );
}
