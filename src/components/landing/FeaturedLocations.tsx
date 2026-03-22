"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { LOCATION_EDITORIAL_SUMMARIES } from "@/data/locationEditorialSummaries";

import type { Location } from "@/types/location";
import type { LandingPageContent } from "@/types/sanitySiteContent";

function getSummary(location: Location): string {
  const editorial = LOCATION_EDITORIAL_SUMMARIES[location.id]?.trim();
  if (editorial) return editorial;
  if (location.shortDescription?.trim()) return location.shortDescription.trim();
  if (location.description?.trim()) return location.description.trim();
  const city = location.city ? ` in ${location.city}` : "";
  return `Notable ${location.category}${city}.`;
}

type FeaturedLocationsProps = {
  locations: Location[];
  content?: LandingPageContent;
};

export function FeaturedLocations({ locations, content }: FeaturedLocationsProps) {
  if (locations.length === 0) return null;

  return (
    <section aria-label="Featured locations" className="bg-canvas py-12 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <ScrollReveal>
          <div>
            <p className="eyebrow-editorial text-brand-primary">
              {content?.featuredLocationsEyebrow ?? "Editor\u2019s Picks"}
            </p>
            <h2 className="mt-4 font-serif text-2xl tracking-heading text-foreground sm:text-3xl">
              {content?.featuredLocationsHeading ?? "Places that stay with you"}
            </h2>
            <p className="mt-3 max-w-md text-base text-foreground-secondary">
              {content?.featuredLocationsDescription ?? "Backstreet temples. Neighborhood staples. Places worth the detour."}
            </p>
          </div>
        </ScrollReveal>

        {/* Cards grid */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {locations.slice(0, 8).map((location, i) => (
            <motion.div
              key={location.id}
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
              className="h-full rounded-xl transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]"
            >
              <Link
                href={`/places?location=${location.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 600) || "/placeholder.jpg"}
                    alt={location.name}
                    fill
                    className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <div className="p-3.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-brand-primary transition-colors">
                      {location.name}
                    </h3>
                    {location.rating ? (
                      <span className="flex shrink-0 items-center gap-0.5 text-xs text-foreground">
                        <svg className="h-3 w-3 text-warning" viewBox="0 0 24 24" fill="currentColor">
                          <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
                        </svg>
                        {location.rating.toFixed(1)}
                        {location.reviewCount ? (
                          <span className="text-stone">
                            ({location.reviewCount >= 1000
                              ? `${(location.reviewCount / 1000).toFixed(1)}k`
                              : location.reviewCount})
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-stone">
                    {location.city}, {location.region}
                  </p>
                  <p className="text-xs text-foreground-secondary line-clamp-2 leading-relaxed">
                    {getSummary(location)}
                  </p>
                  <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                    <span className="text-[11px] font-medium capitalize bg-surface text-stone px-2 py-0.5 rounded-lg">
                      {location.category}
                    </span>
                    {location.estimatedDuration && (
                      <>
                        <span className="text-border">&middot;</span>
                        <span className="flex items-center gap-1 text-[11px] text-stone">
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" />
                            <path strokeLinecap="round" d="M12 6v6l4 2" />
                          </svg>
                          {location.estimatedDuration}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Section CTA */}
        <div className="mt-10">
          <Link
            href="/places"
            className="link-reveal group inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-foreground transition-colors hover:text-brand-primary"
          >
            {content?.featuredLocationsCtaText ?? "View all places"}
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
