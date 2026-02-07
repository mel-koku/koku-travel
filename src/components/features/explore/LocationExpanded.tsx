"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import type { Location, LocationDetails } from "@/types/location";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useLenis } from "@/providers/LenisProvider";
import { useLocationDetailsQuery } from "@/hooks/useLocationDetailsQuery";
import { useWishlist } from "@/context/WishlistContext";
import { useAddToItinerary } from "@/hooks/useAddToItinerary";
import { getLocationDisplayName } from "@/lib/locationNameUtils";
import { HeartIcon } from "./LocationCard";
import { PlusIcon } from "./PlusIcon";
import { MinusIcon } from "./MinusIcon";
import { TripPickerModal } from "./TripPickerModal";

type LocationExpandedProps = {
  location: Location;
  onClose: () => void;
};

function getBestDescription(location: Location, details: LocationDetails | null): string | undefined {
  const candidates = [
    location.description,
    location.shortDescription,
    details?.editorialSummary,
  ].filter((d): d is string => Boolean(d?.trim()));

  if (candidates.length === 0) return undefined;

  const complete = candidates.filter((d) => /[.!?]$/.test(d.trim()));
  if (complete.length > 0) {
    return complete.reduce((a, b) => (a.length > b.length ? a : b));
  }

  return candidates.reduce((a, b) => (a.length > b.length ? a : b));
}

export function LocationExpanded({ location, onClose }: LocationExpandedProps) {
  const imageSrc = location.primaryPhotoUrl ?? location.image;
  const { pause, resume } = useLenis();
  const { status, details, fetchedLocation } = useLocationDetailsQuery(location.id);
  const locationWithDetails = fetchedLocation ?? location;
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { trips, needsTripPicker, isInItinerary, addToItinerary, removeFromItinerary } = useAddToItinerary();
  const [tripPickerOpen, setTripPickerOpen] = useState(false);
  const [heartAnimating, setHeartAnimating] = useState(false);

  const isFavorite = isInWishlist(location.id);
  const locationInItinerary = isInItinerary(location.id);
  const wasInWishlist = useRef(isFavorite);

  const displayName = useMemo(() => {
    return getLocationDisplayName(details?.displayName, location);
  }, [location, details]);

  const description = useMemo(() => {
    return getBestDescription(locationWithDetails, details);
  }, [locationWithDetails, details]);

  // Track auto-favorite animation
  useEffect(() => {
    if (isFavorite && !wasInWishlist.current) {
      setHeartAnimating(true);
      const timer = setTimeout(() => setHeartAnimating(false), 500);
      return () => clearTimeout(timer);
    }
    wasInWishlist.current = isFavorite;
  }, [isFavorite]);

  const handleToggleFavorite = useCallback(() => {
    toggleWishlist(location.id);
  }, [location.id, toggleWishlist]);

  const handleToggleItinerary = useCallback(() => {
    if (locationInItinerary) {
      removeFromItinerary(location.id);
    } else if (needsTripPicker) {
      setTripPickerOpen(true);
    } else {
      addToItinerary(location.id, location);
    }
  }, [location, locationInItinerary, needsTripPicker, addToItinerary, removeFromItinerary]);

  const handleTripSelect = useCallback(
    (tripId: string) => {
      addToItinerary(location.id, location, tripId);
    },
    [addToItinerary, location]
  );

  // Lock body scroll — use native overflow hidden instead of Lenis pause
  // so the inner panel can still scroll
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    pause();
    return () => {
      html.style.overflow = prev;
      resume();
    };
  }, [pause, resume]);

  // Close on escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const hasOpeningHours =
    (details?.currentOpeningHours?.length ?? 0) >= 3 ||
    (details?.regularOpeningHours?.length ?? 0) >= 3;

  const hasLinks = details?.websiteUri || details?.internationalPhoneNumber || details?.googleMapsUri;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Expanded card */}
      <motion.div
        data-lenis-prevent
        className="fixed inset-x-4 top-[5vh] bottom-[5vh] z-50 mx-auto max-w-4xl overflow-y-auto overscroll-contain rounded-2xl bg-background shadow-depth sm:inset-x-8"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-md backdrop-blur-sm transition-transform hover:scale-105"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Hero image with action buttons */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-2xl">
          <Image
            src={imageSrc || "/placeholder.jpg"}
            alt={displayName}
            fill
            className="object-cover"
            sizes="(min-width: 768px) 896px, 100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Bottom bar: title left, actions right */}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 sm:px-6 sm:pb-5">
            <div className="min-w-0 flex-1 pr-4">
              <p className="text-xs font-medium uppercase tracking-wider text-white/70">
                {location.city}, {location.region}
              </p>
              <h2 className="mt-1 truncate font-serif text-2xl font-medium text-white sm:text-3xl">
                {displayName}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleToggleFavorite}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-transform hover:scale-105"
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <HeartIcon active={isFavorite} animating={heartAnimating} variant="overlay" />
            </button>
            <button
              type="button"
              onClick={handleToggleItinerary}
              className="flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-charcoal shadow-md backdrop-blur-sm transition-transform hover:scale-105"
              aria-label={locationInItinerary ? "Remove from itinerary" : "Add to itinerary"}
            >
              {locationInItinerary ? (
                <>
                  <MinusIcon className="h-4 w-4" />
                  Remove
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4" />
                  Add
                </>
              )}
            </button>
          </div>
          </div>
        </div>

        {/* Detail content */}
        <div className="space-y-6 p-6 sm:p-8">
          {/* Category, rating, duration */}
          <ScrollReveal distance={20} duration={0.4}>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full bg-surface px-3 py-1 font-medium capitalize text-warm-gray">
                {location.category}
              </span>
              {(details?.rating ?? location.rating) ? (
                <span className="flex items-center gap-1 text-charcoal">
                  <svg className="h-4 w-4 text-semantic-warning" viewBox="0 0 24 24" fill="currentColor">
                    <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
                  </svg>
                  {(details?.rating ?? location.rating)!.toFixed(1)}
                  {details?.userRatingCount ? (
                    <span className="text-xs text-stone">
                      ({details.userRatingCount.toLocaleString()} reviews)
                    </span>
                  ) : null}
                </span>
              ) : null}
              {location.estimatedDuration && (
                <span className="flex items-center gap-1 text-stone">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" d="M12 6v6l4 2" />
                  </svg>
                  Est. {location.estimatedDuration}
                </span>
              )}
            </div>
          </ScrollReveal>

          {/* Description */}
          {description && (
            <ScrollReveal delay={0.1} distance={20} duration={0.4}>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-stone">
                  Overview
                </h3>
                <p className="text-sm leading-relaxed text-warm-gray">{description}</p>
              </section>
            </ScrollReveal>
          )}

          {/* Details loading indicator */}
          {status === "loading" && (
            <div className="flex items-center gap-2 text-sm text-stone">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone/30 border-t-stone" />
              Loading details...
            </div>
          )}

          {/* Address */}
          {details?.formattedAddress && (
            <ScrollReveal delay={0.15} distance={20} duration={0.4}>
              <section className="space-y-1">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-stone">
                  Address
                </h3>
                <p className="text-sm text-warm-gray">{details.formattedAddress}</p>
              </section>
            </ScrollReveal>
          )}

          {/* Opening hours — show when details loaded */}
          {status === "success" && (
            <ScrollReveal delay={0.2} distance={20} duration={0.4}>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-stone">
                  Opening hours
                </h3>
                {hasOpeningHours ? (
                  <ul className="space-y-1 text-sm text-warm-gray">
                    {(details!.currentOpeningHours ?? details!.regularOpeningHours ?? []).map(
                      (entry) => (
                        <li key={entry}>{entry}</li>
                      ),
                    )}
                  </ul>
                ) : (
                  <p className="text-sm text-warm-gray">Open 24 hours or hours not listed</p>
                )}
              </section>
            </ScrollReveal>
          )}

          {/* Links: website, phone, Google Maps */}
          {hasLinks && (
            <ScrollReveal delay={0.25} distance={20} duration={0.4}>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-stone">
                  Details
                </h3>
                <ul className="space-y-1 text-sm text-sage">
                  {details!.websiteUri && (
                    <li>
                      <a
                        href={details!.websiteUri}
                        target="_blank"
                        rel="noreferrer"
                        className="transition hover:underline"
                      >
                        Official website
                      </a>
                    </li>
                  )}
                  {details!.internationalPhoneNumber && (
                    <li className="text-warm-gray">{details!.internationalPhoneNumber}</li>
                  )}
                  {details!.googleMapsUri && (
                    <li>
                      <a
                        href={details!.googleMapsUri}
                        target="_blank"
                        rel="noreferrer"
                        className="transition hover:underline"
                      >
                        View on Google Maps
                      </a>
                    </li>
                  )}
                </ul>
              </section>
            </ScrollReveal>
          )}
        </div>
      </motion.div>

      {/* Trip picker modal for multi-trip users */}
      <TripPickerModal
        isOpen={tripPickerOpen}
        onClose={() => setTripPickerOpen(false)}
        trips={trips}
        onSelectTrip={handleTripSelect}
        locationName={displayName}
      />
    </>
  );
}
