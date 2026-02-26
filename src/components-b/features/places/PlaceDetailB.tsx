"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import type { Location, LocationDetails } from "@/types/location";
import { useLocationDetailsQuery } from "@/hooks/useLocationDetailsQuery";
import { useNearbyLocationsQuery } from "@/hooks/useLocationsQuery";
import { useSaved } from "@/context/SavedContext";
import { useFirstSaveToast } from "@/hooks/useFirstSaveToast";
import { getLocationDisplayName } from "@/lib/locationNameUtils";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { fetchGuidanceForLocation } from "@/lib/tips/guidanceService";
import type { TravelGuidance } from "@/types/travelGuidance";
import { PlacesCardB } from "./PlacesCardB";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: bEase },
  },
};

const sectionReveal = {
  initial: { opacity: 0, y: 10 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" as const },
  transition: { duration: 0.5, ease: bEase },
};

function getBestDescription(location: Location, details: LocationDetails | null): string | undefined {
  const candidates = [
    location.description,
    location.shortDescription,
    details?.editorialSummary,
  ].filter((d): d is string => Boolean(d?.trim()));

  if (candidates.length === 0) return undefined;
  const complete = candidates.filter((d) => /[.!?]$/.test(d.trim()));
  if (complete.length > 0) return complete.reduce((a, b) => (a.length > b.length ? a : b));
  return candidates.reduce((a, b) => (a.length > b.length ? a : b));
}

type PlaceDetailBProps = {
  initialLocation: Location;
};

export function PlaceDetailB({ initialLocation }: PlaceDetailBProps) {
  const router = useRouter();
  const { status, details, fetchedLocation } = useLocationDetailsQuery(initialLocation.id);
  const location = fetchedLocation ?? initialLocation;
  const { isInSaved, toggleSave } = useSaved();
  const showFirstSaveToast = useFirstSaveToast();

  const isSaved = isInSaved(location.id);
  const [heartAnimating, setHeartAnimating] = useState(false);
  const wasSaved = useRef(isSaved);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Nearby locations
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

  // Photos
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

  const displayName = useMemo(
    () => getLocationDisplayName(details?.displayName, location),
    [location, details],
  );
  const description = useMemo(
    () => getBestDescription(location, details),
    [location, details],
  );

  // Meal / service labels
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

  // Guidance tips
  const [tips, setTips] = useState<TravelGuidance[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchGuidanceForLocation(location)
      .then((result) => { if (!cancelled) setTips(result.slice(0, 3)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [location]);

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
    toggleSave(location.id);
  }, [location.id, toggleSave, isSaved, showFirstSaveToast]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/b/places");
    }
  }, [router]);

  const hasOpeningHours =
    (details?.currentOpeningHours?.length ?? 0) >= 3 ||
    (details?.regularOpeningHours?.length ?? 0) >= 3;
  const hasLinks = details?.websiteUri || details?.internationalPhoneNumber || details?.googleMapsUri;

  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      {/* Hero image */}
      <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden">
        <motion.div
          className="absolute inset-0"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image
            src={allPhotos[activePhotoIndex] || "/placeholder.jpg"}
            alt={displayName}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--charcoal)]/60 via-[var(--charcoal)]/20 to-transparent" />

      </div>

      {/* Sticky back bar */}
      <div
        className="sticky z-30 border-b border-[var(--border)] bg-white/85 backdrop-blur-xl"
        style={{ top: "var(--header-h)" }}
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 flex items-center gap-3 h-12">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:text-[var(--foreground)] transition shrink-0"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Places
          </button>
          <span className="text-[var(--border)]">|</span>
          <p className="text-sm text-[var(--muted-foreground)] truncate">{displayName}</p>
        </div>
      </div>

      {/* Title section */}
      <motion.div
        className="mx-auto max-w-4xl px-6 py-8 sm:py-12"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          variants={fadeUp}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
        >
          {location.category}
        </motion.p>

        <motion.h1
          variants={fadeUp}
          className="mt-3 font-semibold leading-tight text-[var(--foreground)]"
          style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)" }}
        >
          {displayName}
        </motion.h1>

        {location.nameJapanese && (
          <motion.p variants={fadeUp} className="mt-1 text-base text-[var(--muted-foreground)]">
            {location.nameJapanese}
          </motion.p>
        )}

        {/* Metadata row */}
        <motion.div variants={fadeUp} className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {(details?.rating ?? location.rating) ? (
            <span className="flex items-center gap-1 text-[var(--foreground)]">
              <svg className="h-3.5 w-3.5 text-[var(--warning)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
              </svg>
              {(details?.rating ?? location.rating)!.toFixed(1)}
              {details?.userRatingCount ? (
                <span className="text-xs text-[var(--muted-foreground)]">
                  ({details.userRatingCount.toLocaleString()})
                </span>
              ) : null}
            </span>
          ) : null}
          {location.estimatedDuration && (
            <>
              {(details?.rating ?? location.rating) ? (
                <span className="text-[var(--muted-foreground)]">&middot;</span>
              ) : null}
              <span className="text-[var(--muted-foreground)]">{location.estimatedDuration}</span>
            </>
          )}
          {location.priceLevel !== undefined && location.priceLevel !== null && (
            <>
              <span className="text-[var(--muted-foreground)]">&middot;</span>
              <span className="text-[var(--muted-foreground)] text-xs font-medium">
                {location.priceLevel === 0 ? "Free" : "¥".repeat(location.priceLevel)}
              </span>
            </>
          )}
          <span className="text-[var(--muted-foreground)]">&middot;</span>
          <span className="text-[var(--muted-foreground)]">{location.city}, {location.region}</span>
        </motion.div>

        {/* Save button */}
        <motion.div variants={fadeUp} className="mt-5">
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
        </motion.div>
      </motion.div>

      {/* Photo gallery */}
      {allPhotos.length > 1 && (
        <div className="mx-auto max-w-4xl px-6 pb-6">
          <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
            {allPhotos.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActivePhotoIndex(i)}
                title={`Photo ${i + 1}`}
                aria-label={`View photo ${i + 1}`}
                className={`relative h-14 w-20 shrink-0 snap-start overflow-hidden rounded-xl transition-all duration-200 ${
                  i === activePhotoIndex ? "opacity-100" : "opacity-50 hover:opacity-80"
                }`}
                style={i === activePhotoIndex ? { boxShadow: "var(--shadow-card)" } : undefined}
              >
                <Image
                  src={resizePhotoUrl(src, 128) || src}
                  alt={`${displayName} photo ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content sections */}
      <div className="mx-auto max-w-3xl px-6 space-y-10 pb-8">
        {/* Description */}
        {description && (
          <motion.section {...sectionReveal} className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              Overview
            </h2>
            <p className="text-base leading-relaxed text-[var(--foreground-body)]">{description}</p>
          </motion.section>
        )}

        {/* Local tips */}
        {tips.length > 0 && (
          <motion.section {...sectionReveal} className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              Local tips
            </h2>
            <div className="space-y-2.5">
              {tips.map((tip, i) => (
                <motion.div
                  key={tip.id}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08, ease: bEase }}
                  className="flex gap-2.5 rounded-2xl bg-white p-5"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  {tip.icon && <span className="text-base shrink-0">{tip.icon}</span>}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)]">{tip.title}</p>
                    <p className="text-xs text-[var(--foreground-body)] mt-0.5">{tip.summary}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Practical info */}
        {(location.nameJapanese || location.nearestStation || location.cashOnly !== undefined || location.reservationInfo || location.dietaryOptions?.servesVegetarianFood || mealLabels || serviceLabels) && (
          <motion.section {...sectionReveal} className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              Practical info
            </h2>
            <dl className="space-y-2 text-sm">
              {location.nameJapanese && (
                <div className="flex gap-2">
                  <dt className="text-[var(--muted-foreground)] shrink-0 w-28">Japanese name</dt>
                  <dd className="text-[var(--foreground-body)]">{location.nameJapanese}</dd>
                </div>
              )}
              {location.nearestStation && (
                <div className="flex gap-2">
                  <dt className="text-[var(--muted-foreground)] shrink-0 w-28">Nearest station</dt>
                  <dd className="text-[var(--foreground-body)]">{location.nearestStation}</dd>
                </div>
              )}
              {location.cashOnly !== undefined && location.cashOnly !== null && (
                <div className="flex gap-2">
                  <dt className="text-[var(--muted-foreground)] shrink-0 w-28">Payment</dt>
                  <dd className="text-[var(--foreground-body)]">{location.cashOnly ? "Cash only" : "Cards accepted"}</dd>
                </div>
              )}
              {location.reservationInfo && (
                <div className="flex gap-2">
                  <dt className="text-[var(--muted-foreground)] shrink-0 w-28">Reservations</dt>
                  <dd className="text-[var(--foreground-body)]">{location.reservationInfo}</dd>
                </div>
              )}
              {location.dietaryOptions?.servesVegetarianFood && (
                <div className="flex gap-2">
                  <dt className="text-[var(--muted-foreground)] shrink-0 w-28">Dietary</dt>
                  <dd className="text-[var(--foreground-body)]">Vegetarian options</dd>
                </div>
              )}
              {mealLabels && (
                <div className="flex gap-2">
                  <dt className="text-[var(--muted-foreground)] shrink-0 w-28">Meals</dt>
                  <dd className="text-[var(--foreground-body)]">{mealLabels}</dd>
                </div>
              )}
              {serviceLabels && (
                <div className="flex gap-2">
                  <dt className="text-[var(--muted-foreground)] shrink-0 w-28">Service</dt>
                  <dd className="text-[var(--foreground-body)]">{serviceLabels}</dd>
                </div>
              )}
            </dl>
          </motion.section>
        )}

        {/* Accessibility */}
        {accessibilityBadges.length > 0 && (
          <motion.section {...sectionReveal} className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              Accessibility
            </h2>
            <div className="flex flex-wrap gap-2">
              {accessibilityBadges.map((badge) => (
                <span
                  key={badge.key}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--foreground-body)]"
                  style={{ boxShadow: "var(--shadow-sm)" }}
                >
                  <svg className="h-3 w-3 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
          <motion.section {...sectionReveal} className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              Good for
            </h2>
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
          </motion.section>
        )}

        {/* Reviews */}
        {details?.reviews && details.reviews.length > 0 && (
          <motion.section {...sectionReveal} className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              Reviews
            </h2>
            <div className="space-y-3">
              {details.reviews
                .filter((r) => r.text && r.text.length > 20)
                .slice(0, 3)
                .map((review, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-white p-4"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {review.rating && (
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: review.rating }, (_, j) => (
                            <svg key={j} className="h-3 w-3 text-[var(--warning)]" viewBox="0 0 24 24" fill="currentColor">
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
                    <p className="text-sm leading-relaxed text-[var(--foreground-body)] line-clamp-3">
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
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
            Loading details...
          </div>
        )}

        {/* Address */}
        {details?.formattedAddress && (
          <motion.section {...sectionReveal} className="space-y-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              Address
            </h2>
            <p className="text-sm text-[var(--foreground-body)]">{details.formattedAddress}</p>
          </motion.section>
        )}

        {/* Opening hours */}
        {status === "success" && (
          <motion.section {...sectionReveal} className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              Opening hours
            </h2>
            <div className="rounded-2xl bg-[var(--surface)] p-4">
              {hasOpeningHours ? (
                <ul className="space-y-1 text-sm text-[var(--foreground-body)]">
                  {(details!.currentOpeningHours ?? details!.regularOpeningHours ?? []).map(
                    (entry) => <li key={entry}>{entry}</li>,
                  )}
                </ul>
              ) : (
                <p className="text-sm text-[var(--foreground-body)]">Open 24 hours or hours not listed</p>
              )}
            </div>
          </motion.section>
        )}

        {/* Links */}
        {hasLinks && (
          <motion.section {...sectionReveal} className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              Links
            </h2>
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
          </motion.section>
        )}
      </div>

      {/* Explore Nearby */}
      {nearbyLocations.length > 0 && (
        <section className="bg-[var(--surface)] py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, ease: bEase }}
              className="text-2xl font-bold text-[var(--foreground)] text-center mb-10"
            >
              Explore Nearby
            </motion.h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {nearbyLocations.map((nearby, i) => (
                <motion.div
                  key={nearby.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: bEase }}
                >
                  <PlacesCardB location={nearby} eager={i < 3} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Back to all places */}
      <div className="py-12 sm:py-16 text-center">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline transition"
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
