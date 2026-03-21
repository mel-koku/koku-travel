"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Location } from "@/types/location";
import { useLocationDetailsQuery } from "@/hooks/useLocationDetailsQuery";
import { useNearbyLocationsQuery } from "@/hooks/useLocationsQuery";
import { useSaved } from "@/context/SavedContext";
import { useFirstSaveToast } from "@/hooks/useFirstSaveToast";
import { getLocationDisplayName } from "@/lib/locationNameUtils";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { fetchGuidanceForLocation } from "@/lib/tips/guidanceService";
import type { TravelGuidance } from "@/types/travelGuidance";
import { cEase, fadeUp } from "@c/ui/motionC";
import { PlacesCardC } from "./PlacesCardC";

/* ------------------------------------------------------------------ */
/*  Motion variants                                                    */
/* ------------------------------------------------------------------ */

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const sectionReveal = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" as const },
  transition: { duration: 0.5, ease: cEase },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

type PlaceDetailCProps = {
  initialLocation: Location;
};

export function PlaceDetailC({ initialLocation }: PlaceDetailCProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const { status, details, fetchedLocation } = useLocationDetailsQuery(initialLocation.id);
  const location = fetchedLocation ?? initialLocation;
  const { isInSaved, toggleSave } = useSaved();
  const showFirstSaveToast = useFirstSaveToast();

  const isSaved = isInSaved(location.id);
  const [heartAnimating, setHeartAnimating] = useState(false);
  const wasSaved = useRef(isSaved);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [backBarSolid, setBackBarSolid] = useState(false);

  /* ---- Nearby locations ---- */
  const lat = location.coordinates?.lat ?? null;
  const lng = location.coordinates?.lng ?? null;
  const { data: nearbyData } = useNearbyLocationsQuery(lat, lng, {
    radius: 3,
    limit: 6,
    openNow: false,
  });
  const nearbyLocations = useMemo(
    () => (nearbyData?.data ?? []).filter((n) => n.id !== location.id).slice(0, 6),
    [nearbyData, location.id],
  );

  /* ---- Photos ---- */
  const allPhotos = useMemo(() => {
    const hero = resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 800);
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
  }, [location.primaryPhotoUrl, location.image, details?.photos]);

  /* ---- Display helpers ---- */
  const displayName = useMemo(
    () => getLocationDisplayName(details?.displayName, location),
    [location, details],
  );

  const { summary, description } = useMemo(() => {
    const short = location.shortDescription?.trim() || undefined;
    const full =
      location.description?.trim() ||
      details?.editorialSummary?.trim() ||
      undefined;

    if (!full && !short) return { summary: undefined, description: undefined };
    if (!full) return { summary: undefined, description: short };
    if (!short) return { summary: undefined, description: full };

    const isDifferent = !full.toLowerCase().startsWith(short.toLowerCase().slice(0, 60));
    return isDifferent
      ? { summary: short, description: full }
      : { summary: undefined, description: full };
  }, [location, details]);

  /* ---- Meal / service labels ---- */
  const mealLabels = useMemo(() => {
    const m = location.mealOptions;
    if (!m) return null;
    const parts: string[] = [];
    if (m.servesBreakfast) parts.push("Breakfast");
    if (m.servesBrunch) parts.push("Brunch");
    if (m.servesLunch) parts.push("Lunch");
    if (m.servesDinner) parts.push("Dinner");
    return parts.length > 0 ? parts.join(", ") : null;
  }, [location.mealOptions]);

  const serviceLabels = useMemo(() => {
    const s = location.serviceOptions;
    if (!s) return null;
    const parts: string[] = [];
    if (s.dineIn) parts.push("Dine-in");
    if (s.takeout) parts.push("Takeout");
    if (s.delivery) parts.push("Delivery");
    return parts.length > 0 ? parts.join(", ") : null;
  }, [location.serviceOptions]);

  const accessibilityBadges = useMemo(() => {
    const a = location.accessibilityOptions;
    if (!a) return [];
    const badges: { key: string; label: string }[] = [];
    if (a.wheelchairAccessibleEntrance) badges.push({ key: "entrance", label: "Wheelchair entrance" });
    if (a.wheelchairAccessibleParking) badges.push({ key: "parking", label: "Wheelchair parking" });
    if (a.wheelchairAccessibleRestroom) badges.push({ key: "restroom", label: "Wheelchair restroom" });
    if (a.wheelchairAccessibleSeating) badges.push({ key: "seating", label: "Wheelchair seating" });
    return badges;
  }, [location.accessibilityOptions]);

  const goodForPills = useMemo(() => {
    const pills: { key: string; label: string }[] = [];
    if (location.goodForChildren) pills.push({ key: "children", label: "Families" });
    if (location.goodForGroups) pills.push({ key: "groups", label: "Groups" });
    return pills;
  }, [location.goodForChildren, location.goodForGroups]);

  /* ---- Guidance tips ---- */
  const [tips, setTips] = useState<TravelGuidance[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchGuidanceForLocation(location)
      .then((result) => { if (!cancelled) setTips(result.slice(0, 3)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [location]);

  /* ---- Heart animation ---- */
  useEffect(() => {
    if (isSaved && !wasSaved.current) {
      setHeartAnimating(true);
      const timer = setTimeout(() => setHeartAnimating(false), 500);
      return () => clearTimeout(timer);
    }
    wasSaved.current = isSaved;
  }, [isSaved]);

  /* ---- Sticky back bar scroll listener ---- */
  useEffect(() => {
    const handleScroll = () => {
      setBackBarSolid(window.scrollY > 120);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleToggleSave = useCallback(() => {
    if (!isSaved) showFirstSaveToast();
    toggleSave(location.id);
  }, [location.id, toggleSave, isSaved, showFirstSaveToast]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/c/places");
    }
  }, [router]);

  const hasOpeningHours =
    (details?.currentOpeningHours?.length ?? 0) >= 3 ||
    (details?.regularOpeningHours?.length ?? 0) >= 3;
  const hasLinks = details?.websiteUri || details?.internationalPhoneNumber || details?.googleMapsUri;

  /* Gate motion props for reduced-motion users */
  const motionProps = prefersReducedMotion
    ? { initial: { opacity: 1, y: 0 }, whileInView: { opacity: 1, y: 0 } }
    : sectionReveal;

  const containerMotion = prefersReducedMotion
    ? { initial: "visible", animate: "visible" }
    : { initial: "hidden" as const, animate: "visible" as const, variants: staggerContainer };

  const itemMotion = prefersReducedMotion
    ? {}
    : { variants: fadeUp() };

  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      {/* ---- Hero image ---- */}
      <div className="relative w-full overflow-hidden aspect-[4/3] sm:aspect-[16/9]">
        <Image
          src={allPhotos[activePhotoIndex] || "/placeholder.jpg"}
          alt={displayName}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        {/* Bottom gradient for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--foreground)]/50 via-transparent to-transparent" />

        {/* Photo counter badge */}
        {allPhotos.length > 1 && (
          <div className="absolute bottom-4 right-6 flex items-center gap-1.5 bg-[var(--foreground)]/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--background)]">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="0" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            {activePhotoIndex + 1} / {allPhotos.length}
          </div>
        )}
      </div>

      {/* ---- Sticky back bar ---- */}
      <div
        className="sticky z-30 border-b border-[var(--border)] transition-colors duration-200"
        style={{
          top: "var(--header-h)",
          backgroundColor: backBarSolid ? "var(--background)" : "transparent",
        }}
      >
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10 flex items-center gap-3 h-12">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--primary)] hover:text-[var(--foreground)] transition shrink-0 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Places
          </button>
          <span className="text-[var(--border)]">|</span>
          <p className="text-xs text-[var(--muted-foreground)] truncate">{displayName}</p>
        </div>
      </div>

      {/* ---- Title section ---- */}
      <motion.div
        className="mx-auto max-w-[1400px] px-6 lg:px-10 py-10 sm:py-14"
        {...containerMotion}
      >
        {/* Eyebrow: category */}
        <motion.p
          {...itemMotion}
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]"
        >
          {location.category}
        </motion.p>

        {/* Name */}
        <motion.h1
          {...itemMotion}
          className="mt-3 leading-tight text-[var(--foreground)]"
          style={{
            fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            fontSize: "clamp(1.75rem, 4vw, 3rem)",
          }}
        >
          {displayName}
        </motion.h1>

        {location.nameJapanese && (
          <motion.p {...itemMotion} className="mt-1 text-base text-[var(--muted-foreground)]">
            {location.nameJapanese}
          </motion.p>
        )}

        {/* Metadata row */}
        <motion.div
          {...itemMotion}
          className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
        >
          <span className="text-[var(--muted-foreground)]">{location.city}, {location.region}</span>

          {(details?.rating ?? location.rating) ? (
            <>
              <span className="text-[var(--border)]">&middot;</span>
              <span className="flex items-center gap-1 text-[var(--foreground)]">
                <svg className="h-3.5 w-3.5 text-[var(--primary)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
                </svg>
                {(details?.rating ?? location.rating)!.toFixed(1)}
                {details?.userRatingCount ? (
                  <span className="text-xs text-[var(--muted-foreground)]">
                    ({details.userRatingCount.toLocaleString()})
                  </span>
                ) : null}
              </span>
            </>
          ) : null}

          {location.estimatedDuration && (
            <>
              <span className="text-[var(--border)]">&middot;</span>
              <span className="text-[var(--muted-foreground)]">{location.estimatedDuration}</span>
            </>
          )}

          {location.priceLevel !== undefined && location.priceLevel !== null && (
            <>
              <span className="text-[var(--border)]">&middot;</span>
              <span className="text-[var(--muted-foreground)] text-xs font-bold">
                {location.priceLevel === 0 ? "Free" : "\u00A5".repeat(location.priceLevel)}
              </span>
            </>
          )}
        </motion.div>

        {/* JTA Approved badge */}
        {location.jtaApproved && (
          <motion.div {...itemMotion} className="mt-3">
            <span className="inline-flex items-center gap-1.5 border border-[var(--primary)]/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--primary)]">
              JTA Approved
            </span>
          </motion.div>
        )}

        {/* Save button */}
        <motion.div {...itemMotion} className="mt-6">
          <button
            type="button"
            onClick={handleToggleSave}
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] transition-all active:scale-[0.98] ${
              isSaved
                ? "bg-[var(--primary)] text-white"
                : "border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
            }`}
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
        </motion.div>
      </motion.div>

      {/* ---- Photo gallery (gap-px grid) ---- */}
      {allPhotos.length > 1 && (
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10 pb-8">
          <div className="flex gap-px bg-[var(--border)] overflow-x-auto snap-x snap-mandatory scrollbar-hide">
            {allPhotos.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActivePhotoIndex(i)}
                title={`Photo ${i + 1}`}
                aria-label={`View photo ${i + 1}`}
                className={`relative h-16 w-24 shrink-0 snap-start overflow-hidden transition-opacity duration-200 ${
                  i === activePhotoIndex
                    ? "opacity-100 ring-2 ring-[var(--primary)]"
                    : "opacity-50 hover:opacity-80"
                }`}
              >
                <Image
                  src={resizePhotoUrl(src, 128) || src}
                  alt={`${displayName} photo ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- Content sections ---- */}
      <div className="mx-auto max-w-[900px] px-6 lg:px-10 space-y-12 pb-10">

        {/* Description */}
        {(summary || description) && (
          <motion.section {...motionProps} className="space-y-3">
            <SectionHeading>Overview</SectionHeading>
            {summary && (
              <p
                className="text-sm font-medium leading-relaxed text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}
              >
                {summary}
              </p>
            )}
            {description && (
              <p className="text-base leading-relaxed text-[var(--muted-foreground)]">
                {description}
              </p>
            )}
          </motion.section>
        )}

        {/* Local tips */}
        {tips.length > 0 && (
          <motion.section {...motionProps} className="space-y-4">
            <SectionHeading>Local tips</SectionHeading>
            <div className="space-y-0 border border-[var(--border)]">
              {tips.map((tip, i) => (
                <motion.div
                  key={tip.id}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
                  whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={prefersReducedMotion ? undefined : { duration: 0.4, delay: i * 0.08, ease: cEase }}
                  className={`flex gap-3 p-5 ${
                    i < tips.length - 1 ? "border-b border-[var(--border)]" : ""
                  }`}
                >
                  {tip.icon && <span className="text-base shrink-0">{tip.icon}</span>}
                  <div className="min-w-0">
                    <p
                      className="text-sm leading-snug text-[var(--foreground)]"
                      style={{
                        fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                        fontWeight: 700,
                      }}
                    >
                      {tip.title}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{tip.summary}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Practical info */}
        {(location.nameJapanese || location.nearestStation || location.cashOnly !== undefined || location.reservationInfo || location.dietaryOptions?.servesVegetarianFood || mealLabels || serviceLabels) && (
          <motion.section {...motionProps} className="space-y-4">
            <SectionHeading>Practical info</SectionHeading>
            <dl className="border border-[var(--border)] divide-y divide-[var(--border)]">
              {location.nameJapanese && (
                <InfoRow label="Japanese name" value={location.nameJapanese} />
              )}
              {location.nearestStation && (
                <InfoRow label="Nearest station" value={location.nearestStation} />
              )}
              {location.cashOnly !== undefined && location.cashOnly !== null && (
                <InfoRow label="Payment" value={location.cashOnly ? "Cash only" : "Cards accepted"} />
              )}
              {location.reservationInfo && (
                <InfoRow label="Reservations" value={location.reservationInfo} />
              )}
              {location.dietaryOptions?.servesVegetarianFood && (
                <InfoRow label="Dietary" value="Vegetarian options" />
              )}
              {mealLabels && (
                <InfoRow label="Meals" value={mealLabels} />
              )}
              {serviceLabels && (
                <InfoRow label="Service" value={serviceLabels} />
              )}
            </dl>
          </motion.section>
        )}

        {/* Accessibility */}
        {accessibilityBadges.length > 0 && (
          <motion.section {...motionProps} className="space-y-4">
            <SectionHeading>Accessibility</SectionHeading>
            <div className="flex flex-wrap gap-2">
              {accessibilityBadges.map((badge) => (
                <span
                  key={badge.key}
                  className="inline-flex items-center gap-1 border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--foreground)]"
                >
                  <svg className="h-3 w-3 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {badge.label}
                </span>
              ))}
            </div>
          </motion.section>
        )}

        {/* Good for */}
        {goodForPills.length > 0 && (
          <motion.section {...motionProps} className="space-y-4">
            <SectionHeading>Good for</SectionHeading>
            <div className="flex flex-wrap gap-2">
              {goodForPills.map((pill) => (
                <span
                  key={pill.key}
                  className="border border-[var(--border)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--foreground)]"
                >
                  {pill.label}
                </span>
              ))}
            </div>
          </motion.section>
        )}

        {/* Reviews */}
        {details?.reviews && details.reviews.length > 0 && (
          <motion.section {...motionProps} className="space-y-4">
            <SectionHeading>Reviews</SectionHeading>
            <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
              {details.reviews
                .filter((r) => r.text && r.text.length > 20)
                .slice(0, 3)
                .map((review, i) => (
                  <div key={i} className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      {review.rating && (
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: review.rating }, (_, j) => (
                            <svg key={j} className="h-3 w-3 text-[var(--primary)]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
                            </svg>
                          ))}
                        </span>
                      )}
                      <span className="text-xs text-[var(--muted-foreground)]">{review.authorName}</span>
                      {review.relativePublishTimeDescription && (
                        <span className="text-xs text-[var(--muted-foreground)]">&middot; {review.relativePublishTimeDescription}</span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-[var(--muted-foreground)] line-clamp-3">
                      {review.text}
                    </p>
                  </div>
                ))}
            </div>
          </motion.section>
        )}

        {/* Loading indicator */}
        {status === "loading" && (
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <div className="h-4 w-4 animate-spin border-2 border-[var(--border)] border-t-[var(--primary)]" />
            Loading details...
          </div>
        )}

        {/* Address */}
        {details?.formattedAddress && (
          <motion.section {...motionProps} className="space-y-2">
            <SectionHeading>Address</SectionHeading>
            <p className="text-sm text-[var(--muted-foreground)]">{details.formattedAddress}</p>
          </motion.section>
        )}

        {/* Opening hours */}
        {status === "success" && (
          <motion.section {...motionProps} className="space-y-4">
            <SectionHeading>Opening hours</SectionHeading>
            <div className="border border-[var(--border)] p-5">
              {hasOpeningHours ? (
                <ul className="space-y-1 text-sm text-[var(--muted-foreground)]">
                  {(details!.currentOpeningHours ?? details!.regularOpeningHours ?? []).map(
                    (entry) => <li key={entry}>{entry}</li>,
                  )}
                </ul>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">Open 24 hours or hours not listed</p>
              )}
            </div>
          </motion.section>
        )}

        {/* Links */}
        {hasLinks && (
          <motion.section {...motionProps} className="space-y-4">
            <SectionHeading>Links</SectionHeading>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {details!.websiteUri && (
                <a
                  href={details!.websiteUri}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--primary)] font-bold text-[11px] uppercase tracking-[0.1em] transition hover:underline"
                >
                  Website
                </a>
              )}
              {details!.websiteUri && details!.internationalPhoneNumber && (
                <span className="text-[var(--border)]">&middot;</span>
              )}
              {details!.internationalPhoneNumber && (
                <span className="text-sm text-[var(--muted-foreground)]">{details!.internationalPhoneNumber}</span>
              )}
              {(details!.websiteUri || details!.internationalPhoneNumber) && details!.googleMapsUri && (
                <span className="text-[var(--border)]">&middot;</span>
              )}
              {details!.googleMapsUri && (
                <a
                  href={details!.googleMapsUri}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--primary)] font-bold text-[11px] uppercase tracking-[0.1em] transition hover:underline"
                >
                  Google Maps
                </a>
              )}
            </div>
          </motion.section>
        )}
      </div>

      {/* ---- Trip Builder CTA ---- */}
      <section
        className="border-t border-b border-[var(--border)] py-16 sm:py-20"
      >
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10 text-center">
          <p className="text-[var(--muted-foreground)] text-sm mb-5">
            Want to visit {location.name}?
          </p>
          <Link
            href={`/c/trip-builder?city=${encodeURIComponent(location.city)}`}
            className="inline-flex items-center gap-2 bg-[var(--primary)] px-7 h-11 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition hover:brightness-110 active:scale-[0.98]"
          >
            Build a trip to {location.city}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ---- Explore Nearby ---- */}
      {nearbyLocations.length > 0 && (
        <section className="py-24 sm:py-32 lg:py-48">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
            <motion.div
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 14 }}
              whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={prefersReducedMotion ? undefined : { duration: 0.6, ease: cEase }}
              className="mb-10"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-2">
                Nearby
              </p>
              <h2
                className="text-2xl text-[var(--foreground)]"
                style={{
                  fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                }}
              >
                Explore the area
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--border)]">
              {nearbyLocations.map((nearby, i) => (
                <motion.div
                  key={nearby.id}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, y: 14 }}
                  whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={prefersReducedMotion ? undefined : { duration: 0.5, delay: i * 0.06, ease: cEase }}
                >
                  <PlacesCardC location={nearby} eager={i < 3} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---- Back to all places ---- */}
      <div className="border-t border-[var(--border)] py-14 sm:py-20 text-center">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--primary)] hover:underline transition active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to all places
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Consistent section heading eyebrow */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
      {children}
    </h2>
  );
}

/** Practical info row inside definition list */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-3.5 sm:flex-row sm:gap-4">
      <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)] shrink-0 sm:w-32">
        {label}
      </dt>
      <dd className="text-sm text-[var(--foreground)]">{value}</dd>
    </div>
  );
}
