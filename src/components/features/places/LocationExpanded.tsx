"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { easeReveal, durationFast } from "@/lib/motion";
import type { Location, LocationDetails } from "@/types/location";
import { useLenis } from "@/providers/LenisProvider";
import { useLocationDetailsQuery } from "@/hooks/useLocationDetailsQuery";
import { useSaved } from "@/context/SavedContext";
import { useFirstSaveToast } from "@/hooks/useFirstSaveToast";
import { getLocationDisplayName } from "@/lib/locationNameUtils";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { fetchGuidanceForLocation } from "@/lib/tips/guidanceService";
import { cn } from "@/lib/cn";
import type { TravelGuidance } from "@/types/travelGuidance";
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
  const { pause, resume } = useLenis();
  const { status, details, fetchedLocation } = useLocationDetailsQuery(location.id);
  const locationWithDetails = fetchedLocation ?? location;
  const { isInSaved, toggleSave } = useSaved();
  const showFirstSaveToast = useFirstSaveToast();
  const [heartAnimating, setHeartAnimating] = useState(false);

  const isSaved = isInSaved(location.id);
  const wasSaved = useRef(isSaved);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Reset active photo when location changes
  useEffect(() => {
    setActivePhotoIndex(0);
  }, [location.id]);

  // Build deduplicated photo list: hero first, then details photos
  const allPhotos = useMemo(() => {
    const hero = resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 800);
    const detailPhotos = (details?.photos ?? [])
      .map((p) => p.proxyUrl)
      .filter((url): url is string => Boolean(url));

    // Start with hero, then add detail photos that aren't the same as hero
    const photos: string[] = [];
    if (hero) photos.push(hero);
    for (const url of detailPhotos) {
      // Deduplicate by comparing the photoName param
      const heroName = hero ? new URL(hero, "http://x").searchParams.get("photoName") : null;
      const detailName = new URL(url, "http://x").searchParams.get("photoName");
      if (heroName && detailName && heroName === detailName) continue;
      if (!photos.includes(url)) photos.push(url);
    }
    return photos.slice(0, 5);
  }, [location.primaryPhotoUrl, location.image, details?.photos]);

  const displayName = useMemo(() => {
    return getLocationDisplayName(details?.displayName, location);
  }, [location, details]);

  const description = useMemo(() => {
    return getBestDescription(locationWithDetails, details);
  }, [locationWithDetails, details]);

  const mealLabels = useMemo(() => {
    const m = locationWithDetails.mealOptions;
    if (!m) return null;
    const parts: string[] = [];
    if (m.servesBreakfast) parts.push("Breakfast");
    if (m.servesBrunch) parts.push("Brunch");
    if (m.servesLunch) parts.push("Lunch");
    if (m.servesDinner) parts.push("Dinner");
    return parts.length > 0 ? parts.join(", ") : null;
  }, [locationWithDetails.mealOptions]);

  const serviceLabels = useMemo(() => {
    const s = locationWithDetails.serviceOptions;
    if (!s) return null;
    const parts: string[] = [];
    if (s.dineIn) parts.push("Dine-in");
    if (s.takeout) parts.push("Takeout");
    if (s.delivery) parts.push("Delivery");
    return parts.length > 0 ? parts.join(", ") : null;
  }, [locationWithDetails.serviceOptions]);

  const accessibilityBadges = useMemo(() => {
    const a = locationWithDetails.accessibilityOptions;
    if (!a) return [];
    const badges: { key: string; label: string }[] = [];
    if (a.wheelchairAccessibleEntrance) badges.push({ key: "entrance", label: "Wheelchair entrance" });
    if (a.wheelchairAccessibleParking) badges.push({ key: "parking", label: "Wheelchair parking" });
    if (a.wheelchairAccessibleRestroom) badges.push({ key: "restroom", label: "Wheelchair restroom" });
    if (a.wheelchairAccessibleSeating) badges.push({ key: "seating", label: "Wheelchair seating" });
    return badges;
  }, [locationWithDetails.accessibilityOptions]);

  const goodForPills = useMemo(() => {
    const pills: { key: string; label: string }[] = [];
    if (locationWithDetails.goodForChildren) pills.push({ key: "children", label: "Families" });
    if (locationWithDetails.goodForGroups) pills.push({ key: "groups", label: "Groups" });
    return pills;
  }, [locationWithDetails.goodForChildren, locationWithDetails.goodForGroups]);

  // Guidance tips
  const [tips, setTips] = useState<TravelGuidance[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchGuidanceForLocation(locationWithDetails)
      .then((result) => { if (!cancelled) setTips(result.slice(0, 3)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [locationWithDetails]);

  useEffect(() => {
    if (isSaved && !wasSaved.current) {
      setHeartAnimating(true);
      const timer = setTimeout(() => setHeartAnimating(false), 500);
      return () => clearTimeout(timer);
    }
    wasSaved.current = isSaved;
  }, [isSaved]);

  const handleToggleSave = useCallback(() => {
    if (!isSaved) showFirstSaveToast();
    toggleSave(location.id);
  }, [location.id, toggleSave, isSaved, showFirstSaveToast]);

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
            src={allPhotos[activePhotoIndex] || "/placeholder.jpg"}
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

        {/* Photo thumbnail strip */}
        {allPhotos.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto overscroll-contain snap-x snap-mandatory scrollbar-hide px-4 py-2">
            {allPhotos.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActivePhotoIndex(i)}
                className={cn(
                  "relative h-16 w-16 shrink-0 snap-start overflow-hidden rounded-xl transition",
                  i === activePhotoIndex
                    ? "ring-2 ring-brand-primary ring-offset-1 ring-offset-background"
                    : "opacity-60 hover:opacity-100"
                )}
              >
                <Image
                  src={resizePhotoUrl(src, 128) || src}
                  alt={`${displayName} photo ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <button
            type="button"
            onClick={handleToggleSave}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface shadow-sm transition-transform hover:scale-105 hover:bg-border/50"
            aria-label={isSaved ? "Unsave" : "Save"}
          >
            <HeartIcon active={isSaved} animating={heartAnimating} variant="inline" />
          </button>
          <span className="text-sm text-stone">
            {isSaved ? "Saved" : "Save to include in your trip"}
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
            {locationWithDetails.priceLevel !== undefined && locationWithDetails.priceLevel !== null && (
              <span className="text-stone font-mono text-xs">
                {locationWithDetails.priceLevel === 0 ? "Free" : "¥".repeat(locationWithDetails.priceLevel)}
              </span>
            )}
          </div>

          {/* Description */}
          {description && (
            <section className="space-y-2">
              <h3 className="eyebrow-editorial">
                Overview
              </h3>
              <p className="text-base leading-relaxed text-foreground-secondary">{description}</p>
            </section>
          )}

          {/* Local tips */}
          {tips.length > 0 && (
            <section className="space-y-2">
              <h3 className="eyebrow-editorial">
                Local tips
              </h3>
              <div className="space-y-2">
                {tips.map((tip) => (
                  <div
                    key={tip.id}
                    className="flex gap-2.5 rounded-xl bg-sage/5 border border-sage/10 p-3"
                  >
                    {tip.icon && <span className="text-base shrink-0">{tip.icon}</span>}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{tip.title}</p>
                      <p className="text-xs text-foreground-secondary mt-0.5">{tip.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Practical info */}
          {(location.nameJapanese || location.nearestStation || location.cashOnly !== undefined || location.reservationInfo || locationWithDetails.dietaryOptions?.servesVegetarianFood || mealLabels || serviceLabels) && (
            <section className="space-y-3">
              <h3 className="eyebrow-editorial">
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
                {locationWithDetails.dietaryOptions?.servesVegetarianFood && (
                  <div className="flex gap-2">
                    <dt className="text-stone shrink-0 w-28">Dietary</dt>
                    <dd className="text-foreground-secondary">Vegetarian options</dd>
                  </div>
                )}
                {mealLabels && (
                  <div className="flex gap-2">
                    <dt className="text-stone shrink-0 w-28">Meals</dt>
                    <dd className="text-foreground-secondary">{mealLabels}</dd>
                  </div>
                )}
                {serviceLabels && (
                  <div className="flex gap-2">
                    <dt className="text-stone shrink-0 w-28">Service</dt>
                    <dd className="text-foreground-secondary">{serviceLabels}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Accessibility */}
          {accessibilityBadges.length > 0 && (
            <section className="space-y-2">
              <h3 className="eyebrow-editorial">
                Accessibility
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {accessibilityBadges.map((badge) => (
                  <span
                    key={badge.key}
                    className="inline-flex items-center gap-1 rounded-full bg-sage/10 px-2.5 py-1 text-xs text-sage"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {badge.label}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Good for */}
          {goodForPills.length > 0 && (
            <section className="space-y-2">
              <h3 className="eyebrow-editorial">
                Good for
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {goodForPills.map((pill) => (
                  <span
                    key={pill.key}
                    className="rounded-xl bg-surface px-3 py-1 text-sm text-foreground-secondary"
                  >
                    {pill.label}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Review snippets */}
          {details?.reviews && details.reviews.length > 0 && (
            <section className="space-y-2">
              <h3 className="eyebrow-editorial">
                Reviews
              </h3>
              <div className="space-y-3">
                {details.reviews
                  .filter((r) => r.text && r.text.length > 20)
                  .slice(0, 3)
                  .map((review, i) => (
                    <div key={i} className="rounded-xl bg-surface p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        {review.rating && (
                          <span className="flex items-center gap-0.5">
                            {Array.from({ length: review.rating }, (_, j) => (
                              <svg key={j} className="h-3 w-3 text-warning" viewBox="0 0 24 24" fill="currentColor">
                                <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
                              </svg>
                            ))}
                          </span>
                        )}
                        <span className="text-xs text-stone">{review.authorName}</span>
                        {review.relativePublishTimeDescription && (
                          <span className="text-xs text-stone">&middot; {review.relativePublishTimeDescription}</span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed text-foreground-secondary line-clamp-3">
                        {review.text}
                      </p>
                    </div>
                  ))}
              </div>
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
              <h3 className="eyebrow-editorial">
                Address
              </h3>
              <p className="text-sm text-foreground-secondary">{details.formattedAddress}</p>
            </section>
          )}

          {/* Opening hours */}
          {status === "success" && (
            <section className="space-y-2">
              <h3 className="eyebrow-editorial">
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
              <h3 className="eyebrow-editorial">
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
