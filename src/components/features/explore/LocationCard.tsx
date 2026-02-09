"use client";

import Image from "next/image";
import { memo, useRef, useState, useCallback, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { useWishlist } from "@/context/WishlistContext";
import { LOCATION_EDITORIAL_SUMMARIES } from "@/data/locationEditorialSummaries";
import { useAddToItinerary } from "@/hooks/useAddToItinerary";
import { useCursor } from "@/providers/CursorProvider";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { easeReveal, durationBase, easeCinematicCSS } from "@/lib/motion";
import type { Location } from "@/types/location";
import { PlusIcon } from "./PlusIcon";
import { MinusIcon } from "./MinusIcon";
import { TripPickerModal } from "./TripPickerModal";

type LocationCardProps = {
  location: Location;
  onSelect?: (location: Location) => void;
  variant?: "default" | "tall";
};

export const LocationCard = memo(function LocationCard({ location, onSelect, variant = "default" }: LocationCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const active = isInWishlist(location.id);
  const { setCursorState, isEnabled: cursorEnabled } = useCursor();
  const prefersReducedMotion = useReducedMotion();
  // Use location name directly - no need to fetch details just for display name
  const displayName = location.name;
  // Use local data for summary - details are fetched when modal opens
  const summary = getShortOverview(location, null);
  const estimatedDuration = location.estimatedDuration?.trim();
  const rating = getLocationRating(location);
  const reviewCount = getLocationReviewCount(location);
  const buttonRef = useRef<HTMLDivElement | null>(null);
  // Use primary photo URL from database if available, otherwise fall back to image field
  // Request 800px for card thumbnails instead of 1600px (saves bandwidth)
  const imageSrc = resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 800);

  // Add to itinerary state
  const { trips, needsTripPicker, isInItinerary, addToItinerary, removeFromItinerary } = useAddToItinerary();
  const locationInItinerary = isInItinerary(location.id);
  const [tripPickerOpen, setTripPickerOpen] = useState(false);
  const [heartAnimating, setHeartAnimating] = useState(false);
  const wasInWishlist = useRef(active);

  // Track when location is auto-favorited to trigger animation
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
      {/* Trip picker modal */}
      <TripPickerModal
        isOpen={tripPickerOpen}
        onClose={() => setTripPickerOpen(false)}
        trips={trips}
        onSelectTrip={handleTripSelect}
        locationName={displayName}
      />

      {/* Unified Card Container */}
      <div className={`overflow-hidden rounded-xl border border-border/50 bg-surface shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_8px_32px_rgba(196,80,79,0.1)] ${variant === "tall" ? "h-full" : ""}`}>
        {/* Image Area */}
        <div className="relative">
          {/* Clickable image area */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelect?.(location)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(location); }}
            ref={buttonRef}
            className="relative block w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-inset"
          >
            {/* Image - 4:3 aspect ratio (tall variant gets taller) */}
            <div className={`relative w-full overflow-hidden bg-surface ${variant === "tall" ? "aspect-[3/4]" : "aspect-[4/3]"}`}>
              <Image
                src={imageSrc || FALLBACK_IMAGE_SRC}
                alt={displayName}
                fill
                unoptimized
                className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]"
                style={{ transitionTimingFunction: easeCinematicCSS }}
                sizes="(min-width:1280px) 25vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                priority={false}
              />
              {/* Hover gradient overlay — intensifies on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/50 via-charcoal/10 to-transparent opacity-0 group-hover:opacity-100 sm:transition-opacity sm:duration-500" />
            </div>
          </div>

          {/* Overlay Actions - Grouped bottom-right */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2 sm:opacity-0 sm:translate-y-2 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:transition-all sm:duration-300 pointer-events-none">
            {/* Heart Button */}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleWishlist(location.id);
              }}
              aria-label={active ? "Remove from favorites" : "Add to favorites"}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 backdrop-blur-md shadow-lg transition-all hover:bg-surface hover:scale-105 active:scale-95"
            >
              <HeartIcon active={active} animating={heartAnimating} variant="overlay" />
            </button>

            {/* Itinerary Button */}
            <button
              type="button"
              onClick={handleToggleItinerary}
              aria-label={locationInItinerary ? "Remove from itinerary" : "Add to itinerary"}
              className={`pointer-events-auto flex h-10 items-center gap-1.5 rounded-full px-3 backdrop-blur-sm shadow-lg transition-all hover:scale-105 active:scale-95 ${
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
        </div>

        {/* Content Inside Card */}
        <button
          type="button"
          onClick={() => onSelect?.(location)}
          className="block w-full text-left cursor-pointer focus-visible:outline-none p-4"
        >
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-foreground line-clamp-1 transition-colors duration-200 group-hover:text-brand-primary">
                {displayName}
              </h3>
              {rating ? (
                <div className="flex shrink-0 items-center gap-1 text-sm">
                  <StarIcon />
                  <span className="text-foreground">{rating.toFixed(1)}</span>
                  {reviewCount ? (
                    <span className="text-stone">({formatReviewCount(reviewCount)})</span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <p className="text-sm text-stone">
              {location.city}, {location.region}
            </p>

            <p className="text-sm text-stone line-clamp-2">{summary}</p>

            {/* Category Pill and Duration */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-medium capitalize bg-sand/50 text-foreground-secondary px-2.5 py-1 rounded-xl">
                {location.category}
              </span>
              {estimatedDuration ? (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1 text-sm text-stone">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" d="M12 6v6l4 2" />
                    </svg>
                    Est. {estimatedDuration}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </button>
      </div>
    </motion.article>
  );
});

type HeartIconProps = {
  active: boolean;
  animating?: boolean;
  className?: string;
  variant?: "overlay" | "inline";
};

export function HeartIcon({ active, animating, className, variant = "inline" }: HeartIconProps) {
  const baseClass = className ?? "h-5 w-5";
  const colorClass = variant === "overlay"
    ? active ? "fill-error stroke-error" : "fill-black/30 stroke-charcoal"
    : active ? "fill-error stroke-error" : "fill-none stroke-current";

  return (
    <svg
      aria-hidden="true"
      className={`${baseClass} transition-colors ${colorClass} ${animating ? "animate-heart-pulse" : ""}`}
      viewBox="0 0 24 24"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19.5 13.572a24.064 24.064 0 0 1-7.5 7.178 24.064 24.064 0 0 1-7.5-7.178C3.862 12.334 3 10.478 3 8.52 3 5.989 5.014 4 7.5 4c1.54 0 2.994.757 4 1.955C12.506 4.757 13.96 4 15.5 4 17.986 4 20 5.989 20 8.52c0 1.958-.862 3.813-2.5 5.052Z" />
    </svg>
  );
}

const CATEGORY_DESCRIPTORS: Record<string, string> = {
  culture: "Historic cultural landmark",
  food: "Favorite spot for local flavors",
  nature: "Outdoor escape with scenic views",
  shopping: "Bustling shopping stop",
  view: "Panoramic viewpoint worth the stop",
};

const FALLBACK_IMAGE_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function getShortOverview(location: Location, cachedSummary: string | null): string {
  const trimmedCachedSummary = cachedSummary?.trim();
  if (trimmedCachedSummary) {
    return trimmedCachedSummary;
  }
  const editorialSummary = LOCATION_EDITORIAL_SUMMARIES[location.id]?.trim();
  if (editorialSummary) {
    return editorialSummary;
  }
  if (location.shortDescription && location.shortDescription.trim().length > 0) {
    return location.shortDescription.trim();
  }

  const descriptor =
    CATEGORY_DESCRIPTORS[location.category.toLowerCase()] ?? "Notable experience";
  const cityPiece = location.city ? ` in ${location.city}` : "";

  const details: string[] = [];
  if (location.minBudget) {
    details.push(`Budget ${location.minBudget}`);
  }
  if (location.estimatedDuration) {
    details.push(`Plan for ${location.estimatedDuration}`);
  }

  const detailsSentence = details.length > 0 ? ` ${details.join(" • ")}` : "";

  return `${descriptor}${cityPiece}.${detailsSentence || " Easily fits into most itineraries."}`;
}

function getLocationRating(location: Location): number | null {
  const baseValue = Number.isFinite(location.rating)
    ? clamp(location.rating as number, 0, 5)
    : generateRatingFromId(location.id);

  return baseValue ? Math.round(baseValue * 10) / 10 : null;
}

function getLocationReviewCount(location: Location): number | null {
  if (Number.isFinite(location.reviewCount) && (location.reviewCount as number) > 0) {
    return location.reviewCount as number;
  }
  // Generate a deterministic fallback based on location id
  const hash = hashString(location.id + "-reviews");
  return 50 + (hash % 450); // 50-500 range
}

function formatReviewCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

function generateRatingFromId(seed: string): number {
  const hash = hashString(seed);
  const rating = 3.9 + (hash % 18) / 20; // 3.9 - 4.8 range
  return clamp(rating, 0, 5);
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 text-warning"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
    </svg>
  );
}
