"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { useCursor } from "@/providers/CursorProvider";
import { SplitText } from "@/components/ui/SplitText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

import type { Location } from "@/types/location";

const LocationDetailsModal = dynamic(
  () =>
    import("@/components/features/explore/LocationDetailsModal").then(
      (m) => ({
        default: m.LocationDetailsModal,
      })
    ),
  { ssr: false }
);

type FeaturedLocationsProps = {
  locations: Location[];
};

export function FeaturedLocations({ locations }: FeaturedLocationsProps) {
  const [selectedLocation, setSelectedLocation] =
    useState<Location | null>(null);
  const handleClose = () => setSelectedLocation(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Horizontal scroll: vertical scroll maps to horizontal card movement
  const xTranslate = useTransform(scrollYProgress, [0.1, 0.9], ["0%", "-60%"]);

  if (locations.length === 0) return null;

  return (
    <>
      <section ref={containerRef} className="relative bg-surface py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          {/* Section Header */}
          <div className="mb-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <ScrollReveal>
                <p className="text-sm font-medium uppercase tracking-widest text-brand-primary">
                  Staff Picks
                </p>
              </ScrollReveal>
              <SplitText
                as="h2"
                className="mt-4 font-serif text-3xl font-medium text-charcoal sm:text-4xl"
                splitBy="word"
                animation="clipY"
              >
                Worth your time
              </SplitText>
            </div>
            <Link
              href="/explore"
              className="group flex items-center gap-2 text-charcoal transition-colors hover:text-brand-primary"
            >
              <span className="text-sm font-medium uppercase tracking-wider">
                View all locations
              </span>
              <ArrowRightIcon />
            </Link>
          </div>
        </div>

        {/* Horizontal scroll gallery */}
        <div className="relative overflow-hidden">
          <motion.div
            className="flex gap-6 px-6"
            style={prefersReducedMotion ? {} : { x: xTranslate }}
          >
            {locations.slice(0, 8).map((location, index) => (
              <HorizontalLocationCard
                key={location.id}
                location={location}
                index={index}
                onSelect={setSelectedLocation}
              />
            ))}
          </motion.div>
        </div>
      </section>

      <LocationDetailsModal
        location={selectedLocation}
        onClose={handleClose}
      />
    </>
  );
}

function HorizontalLocationCard({
  location,
  index,
  onSelect,
}: {
  location: Location;
  index: number;
  onSelect: (location: Location) => void;
}) {
  const imageSrc = location.primaryPhotoUrl ?? location.image;
  const { setCursorState, isEnabled } = useCursor();
  const cardRef = useRef<HTMLButtonElement>(null);

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"],
  });

  // Subtle parallax on the image within the card
  const imageY = useTransform(scrollYProgress, [0, 1], ["-5%", "5%"]);

  return (
    <motion.button
      ref={cardRef}
      type="button"
      onClick={() => onSelect(location)}
      className="group relative flex-shrink-0 overflow-hidden rounded-xl text-left"
      style={{ width: "clamp(300px, 50vw, 500px)" }}
      initial={{ clipPath: "inset(0 100% 0 0)" }}
      whileInView={{ clipPath: "inset(0 0% 0 0)" }}
      viewport={{ once: true, margin: "-5%" }}
      transition={{ duration: 0.8, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
      onMouseEnter={() => isEnabled && setCursorState("view")}
      onMouseLeave={() => isEnabled && setCursorState("default")}
    >
      <div className="relative aspect-[3/4]">
        <motion.div
          className="absolute inset-[-10%] h-[120%] w-[120%]"
          style={{ y: imageY }}
        >
          <Image
            src={imageSrc || "/placeholder.jpg"}
            alt={location.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="50vw"
          />
        </motion.div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">
            {location.city}
          </p>
          <h3 className="mt-1 font-serif text-xl text-white sm:text-2xl">
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
    </motion.button>
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
