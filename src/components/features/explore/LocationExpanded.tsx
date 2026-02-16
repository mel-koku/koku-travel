"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { easeReveal, durationFast } from "@/lib/motion";
import type { Location, LocationDetails } from "@/types/location";
import { useLenis } from "@/providers/LenisProvider";
import { useLocationDetailsQuery } from "@/hooks/useLocationDetailsQuery";
import { useWishlist } from "@/context/WishlistContext";
import { useFirstFavoriteToast } from "@/hooks/useFirstFavoriteToast";
import { getLocationDisplayName } from "@/lib/locationNameUtils";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { HeartIcon } from "./LocationCard";

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
  const imageSrc = resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 800);
  const { pause, resume } = useLenis();
  const { status, details, fetchedLocation } = useLocationDetailsQuery(location.id);
  const locationWithDetails = fetchedLocation ?? location;
  const { isInWishlist, toggleWishlist } = useWishlist();
  const showFirstFavoriteToast = useFirstFavoriteToast();
  const [heartAnimating, setHeartAnimating] = useState(false);

  const isFavorite = isInWishlist(location.id);
  const wasInWishlist = useRef(isFavorite);

  const displayName = useMemo(() => {
    return getLocationDisplayName(details?.displayName, location);
  }, [location, details]);

  const description = useMemo(() => {
    return getBestDescription(locationWithDetails, details);
  }, [locationWithDetails, details]);

  useEffect(() => {
    if (isFavorite && !wasInWishlist.current) {
      setHeartAnimating(true);
      const timer = setTimeout(() => setHeartAnimating(false), 500);
      return () => clearTimeout(timer);
    }
    wasInWishlist.current = isFavorite;
  }, [isFavorite]);

  const handleToggleFavorite = useCallback(() => {
    if (!isFavorite) showFirstFavoriteToast();
    toggleWishlist(location.id);
  }, [location.id, toggleWishlist, isFavorite, showFirstFavoriteToast]);

  // Lock body scroll
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
        className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: durationFast, ease: easeReveal }}
        onClick={onClose}
      />

      {/* Right Panel — desktop: 560px from right, mobile: full-screen overlay */}
      <motion.div
        data-lenis-prevent
        className="fixed z-50 bg-background shadow-2xl overflow-y-auto overscroll-contain
          inset-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[560px] sm:max-w-[95vw] sm:border-l sm:border-border"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: durationFast, ease: easeReveal }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-md backdrop-blur-md transition-transform hover:scale-105 hover:bg-surface"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Hero image — flush edges */}
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <Image
            src={imageSrc || "/placeholder.jpg"}
            alt={displayName}
            fill
            className="object-cover"
            sizes="(min-width: 640px) 560px, 100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent" />

          {/* Title overlay */}
          <div className="absolute inset-x-0 bottom-0 p-4 sm:px-6 sm:pb-5">
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/60 mb-1">
              {location.city}, {location.region}
            </p>
            <h2 className="line-clamp-2 font-serif italic text-xl text-white sm:text-2xl">
              {displayName}
            </h2>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <button
            type="button"
            onClick={handleToggleFavorite}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface shadow-sm transition-transform hover:scale-105 hover:bg-border/50"
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <HeartIcon active={isFavorite} animating={heartAnimating} variant="inline" />
          </button>
          <span className="text-sm text-stone">
            {isFavorite ? "Saved to favorites" : "Save to include in your trip"}
          </span>
        </div>

        {/* Detail content */}
        <div className="space-y-6 p-6">
          {/* Category, rating, duration */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-xl bg-surface px-3 py-1 font-medium capitalize text-foreground-secondary">
              {location.category}
            </span>
            {(details?.rating ?? location.rating) ? (
              <span className="flex items-center gap-1 text-foreground">
                <svg className="h-4 w-4 text-warning" viewBox="0 0 24 24" fill="currentColor">
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

          {/* Description */}
          {description && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone">
                Overview
              </h3>
              <p className="text-base leading-relaxed text-foreground-secondary">{description}</p>
            </section>
          )}

          {/* Practical info */}
          {(location.nameJapanese || location.nearestStation || location.cashOnly !== undefined || location.reservationInfo) && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone">
                Practical info
              </h3>
              <dl className="space-y-2 text-sm">
                {location.nameJapanese && (
                  <div className="flex gap-2">
                    <dt className="text-stone shrink-0 w-28">Japanese name</dt>
                    <dd className="text-foreground-secondary">{location.nameJapanese}</dd>
                  </div>
                )}
                {location.nearestStation && (
                  <div className="flex gap-2">
                    <dt className="text-stone shrink-0 w-28">Nearest station</dt>
                    <dd className="text-foreground-secondary">{location.nearestStation}</dd>
                  </div>
                )}
                {location.cashOnly !== undefined && location.cashOnly !== null && (
                  <div className="flex gap-2">
                    <dt className="text-stone shrink-0 w-28">Payment</dt>
                    <dd className="text-foreground-secondary">{location.cashOnly ? "Cash only" : "Cards accepted"}</dd>
                  </div>
                )}
                {location.reservationInfo && (
                  <div className="flex gap-2">
                    <dt className="text-stone shrink-0 w-28">Reservations</dt>
                    <dd className="text-foreground-secondary">{location.reservationInfo}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Loading indicator */}
          {status === "loading" && (
            <div className="flex items-center gap-2 text-sm text-stone">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone/30 border-t-stone" />
              Loading details...
            </div>
          )}

          {/* Address */}
          {details?.formattedAddress && (
            <section className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone">
                Address
              </h3>
              <p className="text-sm text-foreground-secondary">{details.formattedAddress}</p>
            </section>
          )}

          {/* Opening hours */}
          {status === "success" && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone">
                Opening hours
              </h3>
              {hasOpeningHours ? (
                <ul className="space-y-1 text-sm text-foreground-secondary">
                  {(details!.currentOpeningHours ?? details!.regularOpeningHours ?? []).map(
                    (entry) => (
                      <li key={entry}>{entry}</li>
                    ),
                  )}
                </ul>
              ) : (
                <p className="text-sm text-foreground-secondary">Open 24 hours or hours not listed</p>
              )}
            </section>
          )}

          {/* Links */}
          {hasLinks && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone">
                Links
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
                  <li className="text-foreground-secondary">{details!.internationalPhoneNumber}</li>
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
          )}
        </div>
      </motion.div>

    </>
  );
}
