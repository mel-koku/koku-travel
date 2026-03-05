"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { resizePhotoUrl } from "@/lib/google/transformations";

import type { Location } from "@/types/location";
import type { LandingPageContent } from "@/types/sanitySiteContent";

const LocationExpanded = dynamic(
  () =>
    import("@/components/features/places/LocationExpanded").then((m) => ({
      default: m.LocationExpanded,
    })),
  { ssr: false }
);

type FeaturedLocationsProps = {
  locations: Location[];
  content?: LandingPageContent;
};

export function FeaturedLocations({ locations, content }: FeaturedLocationsProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  if (locations.length === 0) return null;

  return (
    <>
      <section aria-label="Featured locations" className="bg-canvas py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6">
          {/* Header */}
          <ScrollReveal>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow-editorial text-brand-primary">
                  {content?.featuredLocationsEyebrow ?? "Editor\u2019s Picks"}
                </p>
                <h2 className="mt-4 font-serif italic text-3xl tracking-heading text-foreground sm:text-4xl">
                  {content?.featuredLocationsHeading ?? "Places that stay with you"}
                </h2>
                <p className="mt-3 max-w-md text-base text-foreground-secondary">
                  {content?.featuredLocationsDescription ?? "Hidden shrines. Neighborhood favorites. The places guidebooks don\u2019t know about."}
                </p>
              </div>
              <Link
                href="/places"
                className="link-reveal group inline-flex shrink-0 items-center gap-2 text-sm font-medium uppercase tracking-wider text-foreground transition-colors hover:text-brand-primary"
              >
                {content?.featuredLocationsCtaText ?? "See all places"}
                <ArrowRightIcon />
              </Link>
            </div>
          </ScrollReveal>

          {/* Grid */}
          <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {locations.slice(0, 8).map((location, i) => (
              <ScrollReveal key={location.id} delay={0.05 * (i % 4)}>
                <LocationCard
                  location={location}
                  onSelect={setSelectedLocation}
                />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {selectedLocation && (
          <LocationExpanded
            location={selectedLocation}
            onClose={() => setSelectedLocation(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function LocationCard({
  location,
  onSelect,
}: {
  location: Location;
  onSelect: (location: Location) => void;
}) {
  const imageSrc = resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 800);

  return (
    <button
      type="button"
      onClick={() => onSelect(location)}
      className="group relative w-full overflow-hidden rounded-xl text-left transition-shadow duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
    >
      <div className="relative aspect-[4/5]">
        <Image
          src={imageSrc || "/placeholder.jpg"}
          alt={location.name}
          fill
          className="object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.04]"
          sizes="(min-width: 1024px) 25vw, 50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/65 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70 group-hover:text-brand-secondary transition-colors duration-300">
            {location.city}
          </p>
          <h3 className="mt-1 font-serif italic text-lg text-white sm:text-xl">
            {location.name}
          </h3>
          {location.rating && (
            <div className="mt-1.5 flex items-center gap-1 text-white/80">
              <StarIcon />
              <span className="text-sm">{location.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function StarIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
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
  );
}
