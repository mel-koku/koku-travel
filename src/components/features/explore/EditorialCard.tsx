"use client";

import Image from "next/image";
import { memo, useRef, useState, useCallback, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { useWishlist } from "@/context/WishlistContext";
import { useAddToItinerary } from "@/hooks/useAddToItinerary";
import { useCursor } from "@/providers/CursorProvider";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { easeReveal, durationBase, easeCinematicCSS } from "@/lib/motion";
import type { Location } from "@/types/location";
import { PlusIcon } from "./PlusIcon";
import { MinusIcon } from "./MinusIcon";
import { TripPickerModal } from "./TripPickerModal";
import { HeartIcon } from "./LocationCard";

type EditorialCardVariant = "standard" | "feature" | "landscape" | "square";

type EditorialCardProps = {
  location: Location;
  onSelect?: (location: Location) => void;
  variant?: EditorialCardVariant;
};

const ASPECT_MAP: Record<EditorialCardVariant, string> = {
  standard: "aspect-[3/4]",
  feature: "aspect-[16/9]",
  landscape: "aspect-[4/3]",
  square: "aspect-[1/1]",
};

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export const EditorialCard = memo(function EditorialCard({
  location,
  onSelect,
  variant = "standard",
}: EditorialCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const active = isInWishlist(location.id);
  const { setCursorState, isEnabled: cursorEnabled } = useCursor();
  const prefersReducedMotion = useReducedMotion();

  const imageSrc = resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 800);

  const { trips, needsTripPicker, isInItinerary, addToItinerary, removeFromItinerary } = useAddToItinerary();
  const locationInItinerary = isInItinerary(location.id);
  const [tripPickerOpen, setTripPickerOpen] = useState(false);
  const [heartAnimating, setHeartAnimating] = useState(false);
  const wasInWishlist = useRef(active);

  useEffect(() => {
    if (active && !wasInWishlist.current) {
      setHeartAnimating(true);
      const timer = setTimeout(() => setHeartAnimating(false), 500);
      return () => clearTimeout(timer);
    }
    wasInWishlist.current = active;
  }, [active]);

  const handleToggleItinerary = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (locationInItinerary) {
        removeFromItinerary(location.id);
      } else if (needsTripPicker) {
        setTripPickerOpen(true);
      } else {
        addToItinerary(location.id, location);
      }
    },
    [locationInItinerary, needsTripPicker, addToItinerary, removeFromItinerary, location]
  );

  const handleTripSelect = useCallback(
    (tripId: string) => {
      addToItinerary(location.id, location, tripId);
    },
    [addToItinerary, location]
  );

  const isFeature = variant === "feature";

  return (
    <motion.article
      className="group relative text-foreground"
      initial={prefersReducedMotion ? {} : { y: 24, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-5%" }}
      transition={{ duration: durationBase, ease: easeReveal }}
      onMouseEnter={() => cursorEnabled && setCursorState("view")}
      onMouseLeave={() => cursorEnabled && setCursorState("default")}
    >
      <TripPickerModal
        isOpen={tripPickerOpen}
        onClose={() => setTripPickerOpen(false)}
        trips={trips}
        onSelectTrip={handleTripSelect}
        locationName={location.name}
      />

      { }
      <div
        onClick={() => onSelect?.(location)}
        className="relative block w-full text-left cursor-pointer rounded-xl"
        role="link"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(location); } }}
      >
        {/* Image container */}
        <div className={`relative w-full overflow-hidden rounded-xl ${ASPECT_MAP[variant]}`}>
          <Image
            src={imageSrc || FALLBACK_IMAGE}
            alt={location.name}
            fill
            unoptimized
            className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]"
            style={{ transitionTimingFunction: easeCinematicCSS }}
            sizes={
              isFeature
                ? "(min-width:1280px) 1200px, 100vw"
                : "(min-width:1280px) 400px, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
            }
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-transparent" />

          {/* Bottom accent line on hover */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-primary origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />

          {/* Overlay Actions */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2 sm:opacity-0 sm:translate-y-2 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:transition-all sm:duration-300 pointer-events-none z-10">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleWishlist(location.id);
              }}
              aria-label={active ? "Remove from favorites" : "Add to favorites"}
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 backdrop-blur-md shadow-lg transition-all hover:bg-surface hover:scale-105 active:scale-95"
            >
              <HeartIcon active={active} animating={heartAnimating} variant="overlay" />
            </button>

            <button
              type="button"
              onClick={handleToggleItinerary}
              aria-label={locationInItinerary ? "Remove from itinerary" : "Add to itinerary"}
              className={`pointer-events-auto flex h-9 items-center gap-1.5 rounded-full px-3 backdrop-blur-sm shadow-lg transition-all hover:scale-105 active:scale-95 ${
                locationInItinerary
                  ? "bg-sage/90 text-white hover:bg-sage"
                  : "bg-surface/90 text-foreground hover:bg-surface"
              }`}
            >
              {locationInItinerary ? (
                <MinusIcon className="h-4 w-4" />
              ) : (
                <PlusIcon className="h-4 w-4" />
              )}
              <span className="text-xs font-medium">
                {locationInItinerary ? "Added" : "Add"}
              </span>
            </button>
          </div>

          {/* Text overlay */}
          <div className={`absolute inset-x-0 bottom-0 p-4 ${isFeature ? "sm:p-6" : "sm:p-4"}`}>
            <div className={isFeature ? "flex items-end justify-between" : ""}>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/60 mb-1">
                  {location.city}{location.region ? `, ${location.region}` : ""}
                </p>
                <h3
                  className={`font-serif italic text-white line-clamp-2 ${
                    isFeature ? "text-2xl sm:text-3xl" : "text-lg"
                  }`}
                >
                  {location.name}
                </h3>
                {isFeature && location.shortDescription && (
                  <p className="hidden sm:block text-sm text-white/70 mt-2 line-clamp-2 max-w-xl">
                    {location.shortDescription}
                  </p>
                )}
              </div>
              {isFeature && (
                <div className="hidden sm:flex flex-col items-end gap-1 ml-4 shrink-0">
                  <span className="text-xs uppercase tracking-wider text-white/60">
                    {location.category}
                  </span>
                  {location.rating && (
                    <span className="flex items-center gap-1 text-sm text-white/80">
                      <svg className="h-3.5 w-3.5 text-warning" viewBox="0 0 24 24" fill="currentColor">
                        <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
                      </svg>
                      {location.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
});
