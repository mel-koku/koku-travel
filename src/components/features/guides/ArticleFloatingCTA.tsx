"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import { durationFast, easeReveal } from "@/lib/motion";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { cn } from "@/lib/cn";
import { useSaved } from "@/context/SavedContext";
import { HeartIcon } from "@/components/features/places/LocationCard";
import { useFirstSaveToast } from "@/hooks/useFirstSaveToast";
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

const CONTENT_CONTEXT_KEY = "yuku:content-context";
const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const MAX_PILL_AVATARS = 4;

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

  const { isInSaved, toggleSave } = useSaved();
  const showFirstSaveToast = useFirstSaveToast();

  const unsavedIds = useMemo(
    () => locationIds.filter((id) => !isInSaved(id)),
    [locationIds, isInSaved]
  );
  const allSaved = unsavedIds.length === 0 && locationIds.length > 0;

  function handleSaveAll() {
    if (allSaved) return;
    if (unsavedIds.length === locationIds.length) showFirstSaveToast();
    for (const id of unsavedIds) {
      toggleSave(id);
    }
  }

  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setIsContentVisible(entry.isIntersecting);
      },
      { rootMargin: "-80px 0px 0px 0px" }
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
    // localStorage throws in iOS Safari Private mode (0 quota) and when
    // full. Catch so the navigation still happens.
    try {
      localStorage.setItem(CONTENT_CONTEXT_KEY, JSON.stringify(contentContext));
    } catch {
      // Best-effort — proceed without seed context
    }
    router.push("/trip-builder");
  }

  const locationCount = locations.length;
  const noMotion = prefersReduced ? { duration: 0 } : undefined;
  const pillLocations = locations.slice(0, MAX_PILL_AVATARS);

  return (
    <AnimatePresence>
      {showPill && (
        <m.div
          key="floating-cta-mobile"
          className="fixed inset-x-0 bottom-0 z-30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={
            noMotion ?? { duration: durationFast, ease: easeReveal }
          }
        >
          <div className="flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="inline-flex items-center gap-3 rounded-lg border border-border/50 bg-surface/95 px-4 py-3 shadow-[var(--shadow-elevated)] backdrop-blur-sm">
              {pillLocations.length > 0 && (
                <div className="flex shrink-0 -space-x-2">
                  {pillLocations.map((loc) => {
                    const imgSrc =
                      resizePhotoUrl(
                        loc.primaryPhotoUrl || loc.image,
                        80
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
                  Build my itinerary
                </p>
                {locationCount > 0 && (
                  <p className="text-xs text-foreground-secondary">
                    {locationCount} place{locationCount !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={allSaved}
                aria-label={allSaved ? "All places saved" : "Save all places"}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition active:scale-[0.98]",
                  allSaved
                    ? "border-sage/30 text-sage"
                    : "border-border/50 text-foreground hover:border-sage/50 hover:text-sage"
                )}
              >
                <HeartIcon
                  active={allSaved}
                  className="h-4 w-4"
                  variant="inline"
                />
                {allSaved ? "Saved" : "Save All"}
              </button>
              <button
                type="button"
                onClick={handleClick}
                className="shrink-0 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary/90 active:scale-[0.98]"
              >
                Plan
              </button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
