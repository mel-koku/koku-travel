"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLenis } from "lenis/react";
import type { Location } from "@/types/location";
import type { TravelGuidance } from "@/types/travelGuidance";
import { useLocationDetailsQuery } from "@/hooks/useLocationDetailsQuery";
import { useSaved } from "@/context/SavedContext";
import { useFirstSaveToast } from "@/hooks/useFirstSaveToast";
import { getLocationDisplayName } from "@/lib/locationNameUtils";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { fetchGuidanceForLocation } from "@/lib/tips/guidanceService";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];
const DURATION_FAST = 0.25;

type PlaceDetailPanelBProps = {
  location: Location;
  onClose: () => void;
};

export function PlaceDetailPanelB({ location, onClose }: PlaceDetailPanelBProps) {
  const { status, details, fetchedLocation } = useLocationDetailsQuery(location.id);
  const loc = fetchedLocation ?? location;
  const { isInSaved, toggleSave } = useSaved();
  const showFirstSaveToast = useFirstSaveToast();
  const lenis = useLenis();

  const isSaved = isInSaved(loc.id);
  const [heartAnimating, setHeartAnimating] = useState(false);
  const wasSaved = useRef(isSaved);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Photos
  const allPhotos = useMemo(() => {
    const hero = resizePhotoUrl(loc.primaryPhotoUrl ?? loc.image, 800);
    const detailPhotos = (details?.photos ?? [])
      .map((p) => p.proxyUrl)
      .filter((url): url is string => Boolean(url));

    const photos: string[] = [];
    if (hero) photos.push(hero);
    for (const url of detailPhotos) {
      const heroName = hero ? new URL(hero, "http://x").searchParams.get("photoName") : null;
      const detailName = new URL(url, "http://x").searchParams.get("photoName");
      if (heroName && detailName && heroName === detailName) continue;
      if (!photos.includes(url)) photos.push(url);
    }
    return photos.slice(0, 5);
  }, [loc.primaryPhotoUrl, loc.image, details?.photos]);

  const displayName = useMemo(
    () => getLocationDisplayName(details?.displayName, loc),
    [loc, details],
  );

  const description = useMemo(() => {
    const candidates = [
      loc.description,
      loc.shortDescription,
      details?.editorialSummary,
    ].filter((d): d is string => Boolean(d?.trim()));
    if (candidates.length === 0) return undefined;
    const complete = candidates.filter((d) => /[.!?]$/.test(d.trim()));
    if (complete.length > 0) return complete.reduce((a, b) => (a.length > b.length ? a : b));
    return candidates.reduce((a, b) => (a.length > b.length ? a : b));
  }, [loc, details]);

  // Meal / service labels
  const mealLabels = useMemo(() => {
    const m = loc.mealOptions;
    if (!m) return null;
    const parts: string[] = [];
    if (m.servesBreakfast) parts.push("Breakfast");
    if (m.servesBrunch) parts.push("Brunch");
    if (m.servesLunch) parts.push("Lunch");
    if (m.servesDinner) parts.push("Dinner");
    return parts.length > 0 ? parts.join(", ") : null;
  }, [loc.mealOptions]);

  const serviceLabels = useMemo(() => {
    const s = loc.serviceOptions;
    if (!s) return null;
    const parts: string[] = [];
    if (s.dineIn) parts.push("Dine-in");
    if (s.takeout) parts.push("Takeout");
    if (s.delivery) parts.push("Delivery");
    return parts.length > 0 ? parts.join(", ") : null;
  }, [loc.serviceOptions]);

  const accessibilityBadges = useMemo(() => {
    const a = loc.accessibilityOptions;
    if (!a) return [];
    const badges: { key: string; label: string }[] = [];
    if (a.wheelchairAccessibleEntrance) badges.push({ key: "entrance", label: "Wheelchair entrance" });
    if (a.wheelchairAccessibleParking) badges.push({ key: "parking", label: "Wheelchair parking" });
    if (a.wheelchairAccessibleRestroom) badges.push({ key: "restroom", label: "Wheelchair restroom" });
    if (a.wheelchairAccessibleSeating) badges.push({ key: "seating", label: "Wheelchair seating" });
    return badges;
  }, [loc.accessibilityOptions]);

  const goodForPills = useMemo(() => {
    const pills: { key: string; label: string }[] = [];
    if (loc.goodForChildren) pills.push({ key: "children", label: "Families" });
    if (loc.goodForGroups) pills.push({ key: "groups", label: "Groups" });
    return pills;
  }, [loc.goodForChildren, loc.goodForGroups]);

  // Guidance tips
  const [tips, setTips] = useState<TravelGuidance[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchGuidanceForLocation(loc)
      .then((result) => { if (!cancelled) setTips(result.slice(0, 3)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [loc]);

  // Heart animation
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
    toggleSave(loc.id);
  }, [loc.id, toggleSave, isSaved, showFirstSaveToast]);

  // Scroll lock + Lenis pause
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    lenis?.stop();
    return () => {
      document.documentElement.style.overflow = prev;
      lenis?.start();
    };
  }, [lenis]);

  // Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const hasOpeningHours =
    (details?.currentOpeningHours?.length ?? 0) >= 3 ||
    (details?.regularOpeningHours?.length ?? 0) >= 3;
  const hasLinks = details?.websiteUri || details?.internationalPhoneNumber || details?.googleMapsUri;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-50 bg-[var(--charcoal)]/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: DURATION_FAST, ease: bEase }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        data-lenis-prevent
        className="fixed inset-0 z-50 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[560px] sm:max-w-[90vw] bg-white border-l border-[var(--border)] flex flex-col overflow-y-auto overscroll-contain"
        style={{ boxShadow: "var(--shadow-depth)" }}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: DURATION_FAST, ease: bEase }}
        role="dialog"
        aria-modal="true"
        aria-label={displayName}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          title="Close"
          className="absolute top-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 hover:bg-white transition"
          style={{ boxShadow: "var(--shadow-sm)" }}
          aria-label="Close panel"
        >
          <svg className="h-4 w-4 text-[var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Hero image */}
        <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden">
          <Image
            src={allPhotos[activePhotoIndex] || resizePhotoUrl(loc.primaryPhotoUrl ?? loc.image, 800) || "/placeholder.jpg"}
            alt={displayName}
            fill
            className="object-cover"
            sizes="(min-width:640px) 560px, 100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--charcoal)]/50 via-transparent to-transparent" />
        </div>

        {/* Photo strip */}
        {allPhotos.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-5 -mt-5 relative z-[1]">
            {allPhotos.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActivePhotoIndex(i)}
                title={`Photo ${i + 1}`}
                aria-label={`View photo ${i + 1}`}
                className={`relative h-11 w-16 shrink-0 snap-start overflow-hidden rounded-lg transition-all duration-200 ${
                  i === activePhotoIndex ? "opacity-100 ring-2 ring-white" : "opacity-60 hover:opacity-90"
                }`}
                style={i === activePhotoIndex ? { boxShadow: "var(--shadow-card)" } : undefined}
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

        {/* Content */}
        <div className="flex-1 px-5 pt-5 pb-8 space-y-6">
          {/* Category eyebrow */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
              {loc.category}
            </p>

            <h2
              className="mt-1.5 font-semibold leading-tight text-[var(--foreground)]"
              style={{ fontSize: "clamp(1.25rem, 3vw, 1.75rem)" }}
            >
              {displayName}
            </h2>

            {loc.nameJapanese && (
              <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{loc.nameJapanese}</p>
            )}
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {(details?.rating ?? loc.rating) ? (
              <span className="flex items-center gap-1 text-[var(--foreground)]">
                <svg className="h-3.5 w-3.5 text-[var(--warning)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
                </svg>
                {(details?.rating ?? loc.rating)!.toFixed(1)}
                {details?.userRatingCount ? (
                  <span className="text-xs text-[var(--muted-foreground)]">
                    ({details.userRatingCount.toLocaleString()})
                  </span>
                ) : null}
              </span>
            ) : null}
            {loc.estimatedDuration && (
              <>
                {(details?.rating ?? loc.rating) ? <span className="text-[var(--muted-foreground)]">&middot;</span> : null}
                <span className="text-[var(--muted-foreground)]">{loc.estimatedDuration}</span>
              </>
            )}
            {loc.priceLevel !== undefined && loc.priceLevel !== null && (
              <>
                <span className="text-[var(--muted-foreground)]">&middot;</span>
                <span className="text-[var(--muted-foreground)] text-xs font-medium">
                  {loc.priceLevel === 0 ? "Free" : "¥".repeat(loc.priceLevel)}
                </span>
              </>
            )}
            <span className="text-[var(--muted-foreground)]">&middot;</span>
            <span className="text-[var(--muted-foreground)]">{loc.city}, {loc.region}</span>
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={handleToggleSave}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
              isSaved
                ? "bg-[var(--primary)] text-white"
                : "bg-white text-[var(--foreground)]"
            }`}
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <svg
              aria-hidden="true"
              className={`h-4 w-4 transition-colors ${
                isSaved ? "fill-white stroke-white" : "fill-none stroke-current"
              } ${heartAnimating ? "animate-heart-pulse" : ""}`}
              viewBox="0 0 24 24"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19.5 13.572a24.064 24.064 0 0 1-7.5 7.178 24.064 24.064 0 0 1-7.5-7.178C3.862 12.334 3 10.478 3 8.52 3 5.989 5.014 4 7.5 4c1.54 0 2.994.757 4 1.955C12.506 4.757 13.96 4 15.5 4 17.986 4 20 5.989 20 8.52c0 1.958-.862 3.813-2.5 5.052Z" />
            </svg>
            {isSaved ? "Saved" : "Save for trip"}
          </button>

          {/* Description */}
          {description && (
            <section className="space-y-1.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                Overview
              </h3>
              <p className="text-sm leading-relaxed text-[var(--foreground-body)]">{description}</p>
            </section>
          )}

          {/* Local tips */}
          {tips.length > 0 && (
            <section className="space-y-2.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                Local tips
              </h3>
              <div className="space-y-2">
                {tips.map((tip) => (
                  <div
                    key={tip.id}
                    className="flex gap-2.5 rounded-2xl bg-[var(--surface)] p-4"
                  >
                    {tip.icon && <span className="text-sm shrink-0">{tip.icon}</span>}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--foreground)]">{tip.title}</p>
                      <p className="text-xs text-[var(--foreground-body)] mt-0.5 leading-relaxed">{tip.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Practical info */}
          {(loc.nearestStation || loc.cashOnly !== undefined || loc.reservationInfo || loc.dietaryOptions?.servesVegetarianFood || mealLabels || serviceLabels) && (
            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                Practical info
              </h3>
              <dl className="space-y-1.5 text-sm">
                {loc.nearestStation && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                    <dt className="text-[var(--muted-foreground)] shrink-0 sm:w-28">Nearest station</dt>
                    <dd className="text-[var(--foreground-body)]">{loc.nearestStation}</dd>
                  </div>
                )}
                {loc.cashOnly !== undefined && loc.cashOnly !== null && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                    <dt className="text-[var(--muted-foreground)] shrink-0 sm:w-28">Payment</dt>
                    <dd className="text-[var(--foreground-body)]">{loc.cashOnly ? "Cash only" : "Cards accepted"}</dd>
                  </div>
                )}
                {loc.reservationInfo && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                    <dt className="text-[var(--muted-foreground)] shrink-0 sm:w-28">Reservations</dt>
                    <dd className="text-[var(--foreground-body)]">{loc.reservationInfo}</dd>
                  </div>
                )}
                {loc.dietaryOptions?.servesVegetarianFood && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                    <dt className="text-[var(--muted-foreground)] shrink-0 sm:w-28">Dietary</dt>
                    <dd className="text-[var(--foreground-body)]">Vegetarian options</dd>
                  </div>
                )}
                {mealLabels && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                    <dt className="text-[var(--muted-foreground)] shrink-0 sm:w-28">Meals</dt>
                    <dd className="text-[var(--foreground-body)]">{mealLabels}</dd>
                  </div>
                )}
                {serviceLabels && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                    <dt className="text-[var(--muted-foreground)] shrink-0 sm:w-28">Service</dt>
                    <dd className="text-[var(--foreground-body)]">{serviceLabels}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Opening hours */}
          {status === "success" && (
            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                Opening hours
              </h3>
              <div className="rounded-xl bg-[var(--surface)] p-3.5">
                {hasOpeningHours ? (
                  <ul className="space-y-0.5 text-xs text-[var(--foreground-body)]">
                    {(details!.currentOpeningHours ?? details!.regularOpeningHours ?? []).map(
                      (entry) => <li key={entry}>{entry}</li>,
                    )}
                  </ul>
                ) : (
                  <p className="text-xs text-[var(--foreground-body)]">Open 24 hours or hours not listed</p>
                )}
              </div>
            </section>
          )}

          {/* Accessibility */}
          {accessibilityBadges.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                Accessibility
              </h3>
              <div className="flex flex-wrap gap-2">
                {accessibilityBadges.map((badge) => (
                  <span
                    key={badge.key}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--foreground-body)]"
                  >
                    <svg className="h-3 w-3 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                Good for
              </h3>
              <div className="flex flex-wrap gap-2">
                {goodForPills.map((pill) => (
                  <span
                    key={pill.key}
                    className="rounded-xl bg-white px-3 py-1 text-sm text-[var(--foreground-body)]"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    {pill.label}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Reviews */}
          {details?.reviews && details.reviews.length > 0 && (
            <section className="space-y-2.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                Reviews
              </h3>
              <div className="space-y-2">
                {details.reviews
                  .filter((r) => r.text && r.text.length > 20)
                  .slice(0, 3)
                  .map((review, i) => (
                    <div
                      key={i}
                      className="rounded-2xl bg-[var(--surface)] p-4"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {review.rating && (
                          <span className="flex items-center gap-0.5">
                            {Array.from({ length: review.rating }, (_, j) => (
                              <svg key={j} className="h-3 w-3 text-[var(--warning)]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
                              </svg>
                            ))}
                          </span>
                        )}
                        <span className="text-[11px] text-[var(--muted-foreground)]">{review.authorName}</span>
                        {review.relativePublishTimeDescription && (
                          <span className="text-[11px] text-[var(--muted-foreground)]">&middot; {review.relativePublishTimeDescription}</span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-[var(--foreground-body)] line-clamp-3">
                        {review.text}
                      </p>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Address */}
          {details?.formattedAddress && (
            <section className="space-y-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                Address
              </h3>
              <p className="text-sm text-[var(--foreground-body)]">{details.formattedAddress}</p>
            </section>
          )}

          {/* Links */}
          {hasLinks && (
            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                Links
              </h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                {details!.websiteUri && (
                  <a href={details!.websiteUri} target="_blank" rel="noreferrer" className="text-[var(--primary)] transition hover:underline">
                    Website
                  </a>
                )}
                {details!.websiteUri && details!.internationalPhoneNumber && (
                  <span className="text-[var(--muted-foreground)]">&middot;</span>
                )}
                {details!.internationalPhoneNumber && (
                  <span className="text-[var(--foreground-body)]">{details!.internationalPhoneNumber}</span>
                )}
                {(details!.websiteUri || details!.internationalPhoneNumber) && details!.googleMapsUri && (
                  <span className="text-[var(--muted-foreground)]">&middot;</span>
                )}
                {details!.googleMapsUri && (
                  <a href={details!.googleMapsUri} target="_blank" rel="noreferrer" className="text-[var(--primary)] transition hover:underline">
                    Google Maps
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Loading indicator */}
          {status === "loading" && (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
              Loading details...
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
