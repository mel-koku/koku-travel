"use client";

import { useEffect, useState, type RefObject } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { durationFast, easeReveal } from "@/lib/motion";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { getCategoryColorScheme } from "@/lib/itinerary/activityColors";
import { PracticalBadges } from "@/components/ui/PracticalBadges";
import type { Location } from "@/types/location";

type ArticleFloatingCTAProps = {
  contentType: "guide" | "experience";
  slug: string;
  title: string;
  locationIds: string[];
  locations: Location[];
  city?: string;
  region?: string;
  contentRef: RefObject<HTMLDivElement | null>;
  bottomCtaRef: RefObject<HTMLDivElement | null>;
};

const CONTENT_CONTEXT_KEY = "koku:content-context";
const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const MAX_PILL_AVATARS = 4;

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`shrink-0 text-foreground-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="h-3 w-3 shrink-0 text-brand-secondary" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1.5l2 4.1 4.5.6-3.3 3.2.8 4.5L8 11.6l-4 2.3.8-4.5L1.5 6.2 6 5.6z" />
    </svg>
  );
}

export function ArticleFloatingCTA({
  contentType,
  slug,
  title,
  locationIds,
  locations,
  city,
  region,
  contentRef,
  bottomCtaRef,
}: ArticleFloatingCTAProps) {
  const router = useRouter();
  const prefersReduced = useReducedMotion();
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [isBottomCtaVisible, setIsBottomCtaVisible] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Mobile pill visibility observers
  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setIsContentVisible(entry.isIntersecting);
      },
      { rootMargin: "-80px 0px 0px 0px" },
    );
    observer.observe(contentEl);
    return () => observer.disconnect();
  }, [contentRef]);

  useEffect(() => {
    const bottomEl = bottomCtaRef.current;
    if (!bottomEl) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setIsBottomCtaVisible(entry.isIntersecting);
    });
    observer.observe(bottomEl);
    return () => observer.disconnect();
  }, [bottomCtaRef]);

  const showPill = isContentVisible && !isBottomCtaVisible;

  function handleClick() {
    const contentContext = {
      type: contentType,
      slug,
      title,
      locationIds,
      city,
      region,
    };
    localStorage.setItem(CONTENT_CONTEXT_KEY, JSON.stringify(contentContext));
    router.push("/trip-builder");
  }

  const locationCount = locationIds.length;
  const eyebrow =
    contentType === "guide" ? "Places in this guide" : "Places in this experience";
  const noMotion = prefersReduced ? { duration: 0 } : undefined;

  const pillLocations = locations.slice(0, MAX_PILL_AVATARS);

  return (
    <>
      {/* ── Desktop sticky sidebar — xl+, rendered as grid child ── */}
      <aside className="hidden pt-[calc(3rem+5rem)] sm:pt-[calc(5rem+5rem)] lg:pt-[calc(7rem+5rem)] xl:block">
        <div className="sticky top-24">
          <p className="eyebrow-editorial">{eyebrow}</p>

          {/* Location accordion */}
          {locations.length > 0 && (
            <div className="mt-3 divide-y divide-border/40">
              {locations.map((loc) => {
                const isOpen = expandedId === loc.id;
                const imgSrc =
                  resizePhotoUrl(loc.primaryPhotoUrl || loc.image, 600) ||
                  FALLBACK_IMAGE;
                const colors = getCategoryColorScheme(loc.category);
                return (
                  <div key={loc.id}>
                    {/* Accordion header */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isOpen ? null : loc.id)
                      }
                      className="flex w-full items-center gap-2 py-3 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold leading-tight text-foreground">
                          {loc.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-foreground-secondary">
                          {loc.city}
                          {loc.region &&
                            loc.city !== loc.region &&
                            ` \u00b7 ${loc.region}`}
                        </p>
                      </div>
                      <ChevronIcon open={isOpen} />
                    </button>

                    {/* Accordion body — itinerary-style card */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={
                            noMotion ?? {
                              height: { duration: 0.3, ease: [...easeReveal] },
                              opacity: { duration: 0.2 },
                            }
                          }
                          className="overflow-hidden"
                        >
                          <div className="pb-3">
                            <div className="overflow-hidden rounded-2xl bg-background shadow-sm">
                              {/* Image */}
                              <div className="relative aspect-video">
                                <Image
                                  src={imgSrc}
                                  alt={loc.name}
                                  fill
                                  className="object-cover"
                                  sizes="(min-width: 1280px) 25vw, 300px"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-charcoal/20 to-transparent" />
                              </div>

                              {/* Info */}
                              <div className="p-3">
                                {/* Category + duration badges */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`inline-block rounded-xl px-2 py-0.5 text-[11px] font-medium capitalize ${colors.badge} ${colors.badgeText}`}
                                  >
                                    {loc.category}
                                  </span>
                                  {loc.estimatedDuration && (
                                    <span className="inline-block rounded-xl bg-sage/10 px-2 py-0.5 font-mono text-[11px] font-medium text-sage">
                                      {loc.estimatedDuration}
                                    </span>
                                  )}
                                </div>

                                {/* Rating */}
                                {loc.rating != null && loc.rating > 0 && (
                                  <div className="mt-2 flex items-center gap-1">
                                    <StarIcon />
                                    <span className="font-mono text-[11px] font-medium text-foreground">
                                      {loc.rating.toFixed(1)}
                                    </span>
                                    {loc.reviewCount != null && loc.reviewCount > 0 && (
                                      <span className="font-mono text-[11px] text-stone">
                                        ({Intl.NumberFormat("en", { notation: "compact" }).format(loc.reviewCount)})
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Practical badges */}
                                <div className="mt-2">
                                  <PracticalBadges location={loc} showOpenStatus={false} max={3} />
                                </div>

                                {/* Short description */}
                                {loc.shortDescription && (
                                  <p className="mt-2.5 text-xs leading-relaxed text-foreground-secondary line-clamp-2">
                                    {loc.shortDescription}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={handleClick}
            className="mt-5 w-full rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-primary/90 hover:shadow-xl active:scale-[0.98]"
          >
            Start Planning
          </button>
        </div>
      </aside>

      {/* ── Mobile/tablet pill — below xl, fixed overlay ── */}
      <AnimatePresence>
        {showPill && (
          <motion.div
            key="floating-cta-mobile"
            className="fixed inset-x-0 bottom-0 z-30 xl:hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={
              noMotion ?? { duration: durationFast, ease: easeReveal }
            }
          >
            <div className="mx-4 mr-20 pb-4 pb-[env(safe-area-inset-bottom)]">
              <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-surface/95 px-4 py-3 shadow-lg backdrop-blur-sm">
                {pillLocations.length > 0 && (
                  <div className="flex shrink-0 -space-x-2">
                    {pillLocations.map((loc) => {
                      const imgSrc =
                        resizePhotoUrl(
                          loc.primaryPhotoUrl || loc.image,
                          80,
                        ) || FALLBACK_IMAGE;
                      return (
                        <div
                          key={loc.id}
                          className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-surface"
                        >
                          <Image
                            src={imgSrc}
                            alt={loc.name}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    Build My Itinerary
                  </p>
                  {locationCount > 0 && (
                    <p className="text-xs text-foreground-secondary">
                      {locationCount} place{locationCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClick}
                  className="shrink-0 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary/90 active:scale-[0.98]"
                >
                  Plan
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
