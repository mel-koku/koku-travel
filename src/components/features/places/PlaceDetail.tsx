"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { easeReveal, durationBase } from "@/lib/motion";
import type { Location } from "@/types/location";
import { useLocationDetailsQuery } from "@/hooks/useLocationDetailsQuery";
import { useNearbyLocationsQuery } from "@/hooks/useLocationsQuery";
import { useSaved } from "@/context/SavedContext";
import { useFirstSaveToast } from "@/hooks/useFirstSaveToast";
import { useExperiencePeople } from "@/hooks/useExperiencePeople";
import { getLocationDisplayName } from "@/lib/locationNameUtils";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { fetchGuidanceForLocation } from "@/lib/tips/guidanceService";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import type { TravelGuidance } from "@/types/travelGuidance";
import { HeartIcon, LocationCard } from "./LocationCard";

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durationBase, ease: [...easeReveal] as [number, number, number, number] },
  },
};

const sectionReveal = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" as const },
  transition: { duration: durationBase, ease: [...easeReveal] as [number, number, number, number] },
};


const DESC_CLAMP_THRESHOLD = 120; // words — only clamp if over this

function OverviewSection({
  summary,
  description,
  sectionReveal,
}: {
  summary?: string;
  description?: string;
  sectionReveal: Record<string, unknown>;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsClamp =
    !!description && description.trim().split(/\s+/).length > DESC_CLAMP_THRESHOLD;

  return (
    <motion.section {...sectionReveal} className="space-y-2">
      <h2 className="eyebrow-editorial">Overview</h2>
      {summary && (
        <p className="text-sm font-medium leading-relaxed text-foreground">
          {summary}
        </p>
      )}
      {description && (
        <div>
          <p
            className={cn(
              "text-base leading-relaxed text-foreground-secondary",
              needsClamp && !expanded && "line-clamp-5"
            )}
          >
            {description}
          </p>
          {needsClamp && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-sm font-medium text-brand-primary hover:underline"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}
    </motion.section>
  );
}

type PlaceDetailProps = {
  initialLocation: Location;
};

export function PlaceDetail({ initialLocation }: PlaceDetailProps) {
  const router = useRouter();
  const { status, details, fetchedLocation } = useLocationDetailsQuery(initialLocation.id);
  const location = fetchedLocation ?? initialLocation;
  const people = useExperiencePeople(location.sanitySlug, location.id);
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
      router.push("/places");
    }
  }, [router]);

  const hasOpeningHours =
    (details?.currentOpeningHours?.length ?? 0) >= 3 ||
    (details?.regularOpeningHours?.length ?? 0) >= 3;
  const hasLinks = details?.websiteUri || details?.internationalPhoneNumber || details?.googleMapsUri;

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Hero image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/9] lg:aspect-[21/9]">
        <Image
          src={allPhotos[activePhotoIndex] || "/placeholder.jpg"}
          alt={displayName}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 scrim-70" />
      </div>

      {/* Sticky back bar */}
      <div className="sticky z-30 border-b border-border bg-background/95 backdrop-blur-sm" style={{ top: 0 }}>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 flex items-center gap-3 h-12">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:text-foreground transition shrink-0"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Places
          </button>
          <span className="text-border">|</span>
          <p className="text-sm text-stone truncate">{displayName}</p>
        </div>
      </div>

      {/* Title section */}
      <motion.div
        className="mx-auto max-w-4xl px-6 py-8 sm:py-12"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.p variants={fadeUp} className="eyebrow-editorial capitalize">
          {location.category}
        </motion.p>

        <motion.h1
          variants={fadeUp}
          className={cn(typography({ intent: "editorial-h1" }), "mt-3")}
        >
          {displayName}
        </motion.h1>

        {location.nameJapanese && (
          <motion.p variants={fadeUp} className="mt-1 text-base text-foreground-secondary">
            {location.nameJapanese}
          </motion.p>
        )}

        {/* Metadata row */}
        <motion.div variants={fadeUp} className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
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
          {location.priceLevel !== undefined && location.priceLevel !== null && (
            <span className="text-stone font-mono text-xs">
              {location.priceLevel === 0 ? "Free" : "¥".repeat(location.priceLevel)}
            </span>
          )}
          <span className="text-stone">{location.city}, {location.region}</span>
        </motion.div>

        {/* JTA + Hidden Gem badges */}
        <motion.div variants={fadeUp} className="mt-3 flex flex-wrap gap-2">
          {location.jtaApproved && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-secondary/40 px-3 py-1 text-xs font-medium uppercase tracking-wide text-brand-secondary">
              JTA Approved
            </span>
          )}
          {location.isHiddenGem && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-sage/40 px-3 py-1 text-xs font-medium uppercase tracking-wide text-sage">
              Hidden Gem
            </span>
          )}
          {location.isUnescoSite && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent border border-accent/30 px-3 py-1 rounded-md">
              UNESCO World Heritage Site
            </span>
          )}
        </motion.div>

        {/* Save button */}
        <motion.div variants={fadeUp} className="mt-5">
          <button
            type="button"
            onClick={handleToggleSave}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]",
              isSaved
                ? "bg-brand-primary text-white"
                : "bg-surface text-foreground hover:bg-border/50"
            )}
          >
            <HeartIcon active={isSaved} animating={heartAnimating} variant="inline" />
            {isSaved ? "Saved" : "Save for trip"}
          </button>
        </motion.div>
      </motion.div>

      {/* Photo gallery */}
      {allPhotos.length > 1 && (
        <div className="mx-auto max-w-4xl px-6 pb-6">
          <div className="flex gap-1.5 overflow-x-auto overscroll-contain snap-x snap-mandatory scrollbar-hide">
            {allPhotos.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActivePhotoIndex(i)}
                className={cn(
                  "relative h-16 w-16 shrink-0 snap-start overflow-hidden rounded-lg transition",
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
        </div>
      )}

      {/* Content sections */}
      <div className="mx-auto max-w-3xl px-6 space-y-8 pb-8">
        {/* Description */}
        {(summary || description) && (
          <OverviewSection
            summary={summary}
            description={description}
            sectionReveal={sectionReveal}
          />
        )}

        {/* Artisan / Guide profile */}
        {people.length > 0 && (
          <motion.section {...sectionReveal} className="space-y-3">
            <h2 className="eyebrow-editorial">
              {people[0]!.type === "guide" ? "Your Guide" : people[0]!.type === "interpreter" ? "Your Interpreter" : "Meet the Artisan"}
            </h2>
            {people.map((person) => (
              <div
                key={person.id}
                className="flex items-start gap-4 rounded-lg bg-surface p-4"
              >
                {person.photo_url && (
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={person.photo_url}
                      alt={person.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{person.name}</p>
                    {person.name_japanese && (
                      <span className="text-xs text-foreground-secondary">{person.name_japanese}</span>
                    )}
                  </div>
                  {person.bio && (
                    <p className="mt-1 text-xs leading-relaxed text-foreground-secondary line-clamp-3">
                      {person.bio}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {person.years_experience && (
                      <span className="text-[11px] text-stone">
                        {person.years_experience}+ years
                      </span>
                    )}
                    {person.specialties.length > 0 && person.specialties.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground-secondary"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  {person.languages.length > 0 && (
                    <p className="mt-1.5 text-[11px] text-stone">
                      Speaks {person.languages.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </motion.section>
        )}

        {/* Local tips */}
        {tips.length > 0 && (
          <motion.section {...sectionReveal} className="space-y-3">
            <h2 className="eyebrow-editorial">Local tips</h2>
            <div className="space-y-2">
              {tips.map((tip) => (
                <div
                  key={tip.id}
                  className="flex gap-2.5 rounded-lg bg-sage/5 border border-sage/10 p-3"
                >
                  {tip.icon && <span className="text-base shrink-0">{tip.icon}</span>}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{tip.title}</p>
                    <p className="text-xs text-foreground-secondary mt-0.5">{tip.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Insider Tip */}
        {location.insiderTip && (
          <motion.section {...sectionReveal}>
            <div className="rounded-lg bg-yuzu-tint p-4">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-foreground-secondary">
                Insider tip
              </p>
              <p className="text-sm leading-relaxed text-foreground-body">
                {location.insiderTip}
              </p>
            </div>
          </motion.section>
        )}

        {/* Practical info */}
        {(location.nameJapanese || location.nearestStation || location.cashOnly !== undefined || location.reservationInfo || location.dietaryOptions?.servesVegetarianFood || mealLabels || serviceLabels) && (
          <motion.section {...sectionReveal} className="space-y-3">
            <h2 className="eyebrow-editorial">Practical info</h2>
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
              {location.dietaryOptions?.servesVegetarianFood && (
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
          </motion.section>
        )}

        {/* Accessibility */}
        {accessibilityBadges.length > 0 && (
          <motion.section {...sectionReveal} className="space-y-2">
            <h2 className="eyebrow-editorial">Accessibility</h2>
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
          </motion.section>
        )}

        {/* Good for */}
        {goodForPills.length > 0 && (
          <motion.section {...sectionReveal} className="space-y-2">
            <h2 className="eyebrow-editorial">Good for</h2>
            <div className="flex flex-wrap gap-1.5">
              {goodForPills.map((pill) => (
                <span
                  key={pill.key}
                  className="rounded-lg bg-surface px-3 py-1 text-sm text-foreground-secondary"
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
            <h2 className="eyebrow-editorial">Reviews</h2>
            <div className="space-y-3">
              {details.reviews
                .filter((r) => r.text && r.text.length > 20)
                .slice(0, 3)
                .map((review, i) => (
                  <div key={i} className="rounded-lg bg-surface p-3">
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
          </motion.section>
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
          <motion.section {...sectionReveal} className="space-y-1">
            <h2 className="eyebrow-editorial">Address</h2>
            <p className="text-sm text-foreground-secondary">{details.formattedAddress}</p>
          </motion.section>
        )}

        {/* Opening hours */}
        {status === "success" && (
          <motion.section {...sectionReveal} className="space-y-2">
            <h2 className="eyebrow-editorial">Opening hours</h2>
            {hasOpeningHours ? (
              <ul className="space-y-1 text-sm text-foreground-secondary">
                {(details!.currentOpeningHours ?? details!.regularOpeningHours ?? []).map(
                  (entry) => <li key={entry}>{entry}</li>,
                )}
              </ul>
            ) : (
              <p className="text-sm text-foreground-secondary">Open 24 hours or hours not listed</p>
            )}
          </motion.section>
        )}

        {/* Links */}
        {hasLinks && (
          <motion.section {...sectionReveal} className="space-y-2">
            <h2 className="eyebrow-editorial">Links</h2>
            <ul className="space-y-1 text-sm text-brand-primary">
              {details?.websiteUri && (
                <li>
                  <a href={details.websiteUri} target="_blank" rel="noreferrer" className="transition hover:underline">
                    Official website
                  </a>
                </li>
              )}
              {details?.internationalPhoneNumber && (
                <li className="text-foreground-secondary">{details.internationalPhoneNumber}</li>
              )}
              {details?.googleMapsUri && (
                <li>
                  <a href={details.googleMapsUri} target="_blank" rel="noreferrer" className="transition hover:underline">
                    View on Google Maps
                  </a>
                </li>
              )}
            </ul>
          </motion.section>
        )}
      </div>

      {/* Trip Builder CTA */}
      <section className="py-12 sm:py-16 lg:py-20 text-center">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <p className="text-foreground-secondary text-sm mb-4">
            Want to visit {location.name}?
          </p>
          <a
            href={`/trip-builder?city=${encodeURIComponent(location.city)}`}
            className="btn-koku inline-flex items-center gap-2 rounded-lg bg-brand-primary px-6 h-11 text-sm font-semibold uppercase tracking-wider text-white shadow-[var(--shadow-elevated)] hover:bg-brand-primary/90 active:scale-[0.98]"
          >
            Build a trip to {location.city}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </section>

      {/* Explore Nearby */}
      {nearbyLocations.length > 0 && (
        <section className="bg-canvas py-12 sm:py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: durationBase, ease: [...easeReveal] as [number, number, number, number] }}
              className={cn(typography({ intent: "editorial-h2" }), "text-center mb-10")}
            >
              Explore Nearby
            </motion.h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {nearbyLocations.map((nearby) => (
                <LocationCard
                  key={nearby.id}
                  location={nearby}
                  onSelect={(loc) => router.push(`/places/${loc.id}`)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Back to all places */}
      <div className="py-12 sm:py-16 text-center">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-primary hover:underline transition"
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
