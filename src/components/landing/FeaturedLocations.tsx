"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useCursor } from "@/providers/CursorProvider";
import { resizePhotoUrl } from "@/lib/google/transformations";

import type { Location } from "@/types/location";
import type { LandingPageContent } from "@/types/sanitySiteContent";

const LocationExpanded = dynamic(
  () =>
    import("@/components/features/explore/LocationExpanded").then(
      (m) => ({
        default: m.LocationExpanded,
      })
    ),
  { ssr: false }
);

type FeaturedLocationsProps = {
  locations: Location[];
  content?: LandingPageContent;
};

export function FeaturedLocations({ locations, content }: FeaturedLocationsProps) {
  const [selectedLocation, setSelectedLocation] =
    useState<Location | null>(null);
  const handleClose = () => setSelectedLocation(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    // tracking starts when section top hits viewport top, ends when section bottom hits viewport bottom
    offset: ["start start", "end end"],
  });

  // Horizontal scroll: cards stay still for the first 8% (intro readable),
  // then slide left with eased motion through the rest of the scroll range.
  // Cache dimensions to avoid DOM reads on every scroll frame.
  const galleryRef = useRef<HTMLDivElement>(null);
  const maxShiftRef = useRef(0);

  const updateMaxShift = useCallback(() => {
    if (!galleryRef.current) return;
    const contentWidth = galleryRef.current.scrollWidth;
    const viewportWidth = window.innerWidth;
    maxShiftRef.current = contentWidth > viewportWidth ? contentWidth - viewportWidth + 24 : 0;
  }, []);

  useEffect(() => {
    updateMaxShift();
    const observer = new ResizeObserver(updateMaxShift);
    if (galleryRef.current) observer.observe(galleryRef.current);
    return () => {
      observer.disconnect();
    };
  }, [updateMaxShift]);

  const xTranslate = useTransform(scrollYProgress, (progress) => {
    if (maxShiftRef.current === 0) return 0;
    // Ease-in-out: slow start, smooth middle, gentle stop
    const linear = Math.max(0, Math.min(1, (progress - 0.08) / 0.84));
    const t = linear < 0.5
      ? 2 * linear * linear
      : 1 - Math.pow(-2 * linear + 2, 2) / 2;
    return -t * maxShiftRef.current;
  });
  // Progress bar width
  const progressScale = useTransform(scrollYProgress, [0.08, 0.92], [0, 1]);

  if (locations.length === 0) return null;

  return (
    <>
      {/* Desktop: Scroll-pinned horizontal gallery */}
      <section ref={containerRef} className="relative hidden h-[180vh] bg-background lg:block">
        {/* Sticky viewport — stays visible while user scrolls the 250vh */}
        <div className="sticky top-0 flex h-[100dvh] flex-col justify-center overflow-hidden py-12">
          {/* Gallery row */}
          <motion.div
            ref={galleryRef}
            className="flex gap-6 px-6 overscroll-contain"
            style={prefersReducedMotion ? {} : { x: xTranslate }}
          >
            {/* Intro text card */}
            <div
              className="texture-grain relative flex h-full flex-shrink-0 flex-col justify-between rounded-xl bg-canvas p-10 lg:p-14"
              style={{ width: "min(clamp(320px, 40vw, 450px), 90vw)" }}
            >
              <div>
                <p className="eyebrow-editorial text-brand-primary">
                  {content?.featuredLocationsEyebrow ?? "Editor\u2019s Picks"}
                </p>
                <h2 className="mt-4 font-serif italic text-3xl tracking-heading text-foreground">
                  {content?.featuredLocationsHeading ?? "Places that stay with you"}
                </h2>
                <p className="mt-2 font-mono text-sm text-foreground-secondary">
                  3,907+ places
                </p>
                <p className="mt-4 text-base text-foreground-secondary">
                  {content?.featuredLocationsDescription ?? "Handpicked locations that represent the best of Japan \u2014 from hidden shrines to neighborhood favorites."}
                </p>
              </div>
              <div>
                <div className="mt-6 mb-4 h-px w-8 bg-brand-primary/60" />
                <Link
                  href="/explore"
                  className="link-reveal inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-foreground transition-colors hover:text-brand-primary"
                >
                  Explore all
                  <ArrowRightIcon />
                </Link>
              </div>
            </div>

            {locations.slice(0, 8).map((location) => (
              <HorizontalLocationCard
                key={location.id}
                location={location}
                onSelect={setSelectedLocation}
              />
            ))}
          </motion.div>

          {/* Scroll progress indicator */}
          <div className="mx-6 mt-8">
            <div className="h-[2px] w-full bg-border">
              <motion.div
                className="h-full origin-left bg-brand-primary"
                style={
                  prefersReducedMotion
                    ? {}
                    : { scaleX: progressScale }
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mobile: Simple horizontal scroll gallery */}
      <section className="bg-background py-12 sm:py-20 lg:hidden">
        <div className="px-6">
          <p className="eyebrow-editorial text-brand-primary">
            {content?.featuredLocationsEyebrow ?? "Editor\u2019s Picks"}
          </p>
          <h2 className="mt-4 font-serif italic text-2xl tracking-heading text-foreground sm:text-3xl">
            {content?.featuredLocationsHeading ?? "Places that stay with you"}
          </h2>
          <p className="mt-2 font-mono text-sm text-foreground-secondary">
            3,907+ places
          </p>
          <p className="mt-4 max-w-md text-base text-foreground-secondary">
            {content?.featuredLocationsDescription ?? "Handpicked locations that represent the best of Japan \u2014 from hidden shrines to neighborhood favorites."}
          </p>
        </div>

        <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-contain px-6 pb-4 scrollbar-hide">
          {locations.slice(0, 8).map((location) => (
            <div key={location.id} className="w-[280px] flex-shrink-0 snap-start sm:w-[320px]">
              <HorizontalLocationCard
                location={location}
                onSelect={setSelectedLocation}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 px-6">
          <div className="h-px w-8 bg-brand-primary/60 mb-4" />
          <Link
            href="/explore"
            className="link-reveal inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-foreground transition-colors hover:text-brand-primary"
          >
            Explore all
            <ArrowRightIcon />
          </Link>
        </div>
      </section>

      <AnimatePresence>
        {selectedLocation && (
          <LocationExpanded
            location={selectedLocation}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function HorizontalLocationCard({
  location,
  onSelect,
}: {
  location: Location;
  onSelect: (location: Location) => void;
}) {
  const imageSrc = resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 800);
  const { setCursorState, isEnabled } = useCursor();

  return (
    <button
      type="button"
      onClick={() => onSelect(location)}
      className="group relative flex-shrink-0 overflow-hidden rounded-xl text-left"
      style={{ width: "min(clamp(320px, 40vw, 450px), 90vw)" }}
      onMouseEnter={() => isEnabled && setCursorState("view")}
      onMouseLeave={() => isEnabled && setCursorState("default")}
    >
      <div className="relative aspect-[4/5]">
        <div className="absolute inset-0">
          <Image
            src={imageSrc || "/placeholder.jpg"}
            alt={location.name}
            fill
            className="object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.02] group-active:scale-[1.02]"
            sizes="(min-width: 1024px) 450px, 90vw"
          />
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent" />

        {/* Bottom accent line on hover */}
        <div className="absolute inset-x-0 bottom-0 h-[2px] scale-x-0 bg-brand-primary/60 transition-transform duration-500 group-hover:scale-x-100" />

        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70 transition-colors duration-500 group-hover:text-brand-secondary">
            {location.city}
          </p>
          <h3 className="mt-1 font-serif italic text-xl text-white sm:text-2xl">
            {location.name}
          </h3>
          {location.rating && (
            <div className="mt-2 flex items-center gap-1.5 text-white/80">
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
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
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
