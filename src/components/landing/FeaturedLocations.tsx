"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { resizePhotoUrl } from "@/lib/google/transformations";

import type { Location } from "@/types/location";
import type { LandingPageContent } from "@/types/sanitySiteContent";

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
          <div className="max-w-2xl">
            <p className="eyebrow-editorial text-brand-primary">
              {content?.featuredLocationsEyebrow ?? "Editor\u2019s Picks"}
            </p>
            <h2 className="mt-4 font-serif text-3xl tracking-heading text-foreground sm:text-4xl">
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
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-brand-primary">
                    {location.name}
                  </h3>
                  <p className="mt-1 text-xs text-stone">
                    {location.city}
                    {location.rating ? ` \u00b7 ${location.rating.toFixed(1)}` : ""}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* View all */}
        <div className="mt-10 text-center">
          <Link
            href="/places"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-6 text-sm font-medium text-foreground transition-all duration-200 hover:border-brand-primary hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
          >
            {content?.featuredLocationsCtaText ?? "View All Places"}
          </Link>
        </div>
      </div>
    </section>
  );
}
