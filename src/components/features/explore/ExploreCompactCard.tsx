"use client";

import Image from "next/image";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useWishlist } from "@/context/WishlistContext";
import { useAddToItinerary } from "@/hooks/useAddToItinerary";
import { resizePhotoUrl } from "@/lib/google/transformations";
import type { Location } from "@/types/location";
import { PlusIcon } from "./PlusIcon";
import { MinusIcon } from "./MinusIcon";
import { TripPickerModal } from "./TripPickerModal";
import { HeartIcon } from "./LocationCard";

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

type ExploreCompactCardProps = {
  location: Location;
  onSelect?: (location: Location) => void;
  isHighlighted?: boolean;
  onHover?: (locationId: string | null) => void;
  eager?: boolean;
};

export const ExploreCompactCard = memo(function ExploreCompactCard({
  location,
  onSelect,
  isHighlighted,
  onHover,
  eager = false,
}: ExploreCompactCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const active = isInWishlist(location.id);

  const imageSrc = resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 400);

  const {
    trips,
    needsTripPicker,
    isInItinerary,
    addToItinerary,
    removeFromItinerary,
  } = useAddToItinerary();
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
    [locationInItinerary, needsTripPicker, addToItinerary, removeFromItinerary, location],
  );

  const handleTripSelect = useCallback(
    (tripId: string) => {
      addToItinerary(location.id, location, tripId);
    },
    [addToItinerary, location],
  );

  return (
    <article
      className={`group relative text-foreground animate-card-in ${
        isHighlighted ? "ring-2 ring-brand-primary/60 rounded-xl" : ""
      }`}
      data-location-id={location.id}
      onMouseEnter={() => onHover?.(location.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <TripPickerModal
        isOpen={tripPickerOpen}
        onClose={() => setTripPickerOpen(false)}
        trips={trips}
        onSelectTrip={handleTripSelect}
        locationName={location.name}
      />

      <div
        onClick={() => onSelect?.(location)}
        className="relative block w-full text-left cursor-pointer rounded-xl"
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect?.(location);
          }
        }}
      >
        {/* Image container */}
        <div className="relative w-full overflow-hidden rounded-xl aspect-[4/3]">
          <Image
            src={imageSrc || FALLBACK_IMAGE}
            alt={location.name}
            fill
            priority={eager}
            className="object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.04]"
            sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-transparent" />

          {/* Bottom accent line on hover */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-primary origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />

          {/* Overlay Actions */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 sm:opacity-0 sm:translate-y-2 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:transition-all sm:duration-300 pointer-events-none z-10">
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
              aria-label={
                locationInItinerary ? "Remove from itinerary" : "Add to itinerary"
              }
              className={`pointer-events-auto flex h-8 items-center gap-1 rounded-full px-2.5 backdrop-blur-sm shadow-lg transition-all hover:scale-105 active:scale-95 ${
                locationInItinerary
                  ? "bg-sage/90 text-white hover:bg-sage"
                  : "bg-surface/90 text-foreground hover:bg-surface"
              }`}
            >
              {locationInItinerary ? (
                <MinusIcon className="h-3.5 w-3.5" />
              ) : (
                <PlusIcon className="h-3.5 w-3.5" />
              )}
              <span className="text-[11px] font-medium">
                {locationInItinerary ? "Added" : "Add"}
              </span>
            </button>
          </div>

          {/* Text overlay */}
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/60 mb-0.5 font-mono">
              {location.city}
            </p>
            <p className="font-serif italic text-white text-base line-clamp-1">
              {location.name}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
});
