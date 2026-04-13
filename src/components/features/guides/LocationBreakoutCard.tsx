"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { getCategoryColorScheme } from "@/lib/itinerary/activityColors";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import { useSaved } from "@/context/SavedContext";
import { HeartIcon } from "@/components/features/places/LocationCard";
import { useFirstSaveToast } from "@/hooks/useFirstSaveToast";
import { useGuideLocations } from "./GuideLocationsContext";
import type { Location } from "@/types/location";

type LocationBreakoutCardProps = {
  location: Location;
  layout?: "left" | "right";
  index?: number;
};

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function StarIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-brand-secondary"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M8 1.5l2 4.1 4.5.6-3.3 3.2.8 4.5L8 11.6l-4 2.3.8-4.5L1.5 6.2 6 5.6z" />
    </svg>
  );
}

export function LocationBreakoutCard({
  location,
  layout = "left",
  index: _index = 0,
}: LocationBreakoutCardProps) {
  const imgSrc =
    resizePhotoUrl(location.primaryPhotoUrl || location.image, 800) ||
    FALLBACK_IMAGE;
  const colors = getCategoryColorScheme(location.category);
  const isRight = layout === "right";

  const { onSelectLocation } = useGuideLocations();
  const { isInSaved, toggleSave } = useSaved();
  const active = isInSaved(location.id);
  const [heartAnimating, setHeartAnimating] = useState(false);
  const wasSaved = useRef(active);
  const showFirstSaveToast = useFirstSaveToast();

  useEffect(() => {
    if (active && !wasSaved.current) {
      setHeartAnimating(true);
      const timer = setTimeout(() => setHeartAnimating(false), 500);
      return () => clearTimeout(timer);
    }
    wasSaved.current = active;
  }, [active]);

  return (
    <div data-location-id={location.id}>
      <ScrollReveal
        className="mx-auto my-16 max-w-5xl px-4 sm:my-20"
        distance={30}
        delay={0.05}
      >
        <div
        onClick={() => onSelectLocation(location)}
        className="group block w-full cursor-pointer overflow-hidden rounded-lg bg-surface text-left shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]"
      >
        <div
          className={cn(
            "grid grid-cols-1 md:grid-cols-2",
            isRight && "md:[&>*:first-child]:order-2"
          )}
        >
          {/* Image */}
          <div className="relative aspect-[16/9] md:aspect-auto md:min-h-[280px]">
            <Image
              src={imgSrc}
              alt={location.name}
              fill
              className="object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.04]"
              sizes="(min-width: 1024px) 50vw, 95vw"
              loading="lazy"
            />
            <div className="absolute inset-0 scrim-20 transition-opacity duration-500 group-hover:opacity-0" />

            {/* Save button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!active) showFirstSaveToast();
                toggleSave(location.id);
              }}
              aria-label={active ? "Unsave" : "Save for trip"}
              className="pointer-events-auto absolute right-3 top-3 flex h-10 items-center gap-1.5 rounded-full bg-surface/90 px-3 shadow-[var(--shadow-elevated)] backdrop-blur-md transition-all hover:bg-surface hover:scale-105 active:scale-[0.98] opacity-0 group-hover:opacity-100 touch-visible"
            >
              <HeartIcon active={active} animating={heartAnimating} variant="overlay" />
              <span className="text-xs font-medium text-foreground">
                {active ? "Saved" : "Save"}
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col justify-center p-6 sm:p-8">
            {/* Category + duration */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-block rounded-md px-2.5 py-0.5 text-[11px] font-medium capitalize ${colors.badge} ${colors.badgeText}`}
              >
                {location.category}
              </span>
              {location.estimatedDuration && (
                <span className="inline-block rounded-md bg-sage/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-sage">
                  {location.estimatedDuration}
                </span>
              )}
            </div>

            {/* Name */}
            <h3
              className={cn(
                typography({ intent: "editorial-h3" }),
                "mt-3 transition-colors duration-300 group-hover:text-brand-primary"
              )}
            >
              {location.name}
            </h3>

            {/* City */}
            <p className="mt-1 font-mono text-xs uppercase tracking-wide text-stone">
              {location.city}
              {location.region &&
                location.city !== location.region &&
                ` \u00b7 ${location.region}`}
            </p>

            {/* Rating */}
            {location.rating != null && location.rating > 0 && (
              <div className="mt-3 flex items-center gap-1.5">
                <StarIcon />
                <span className="font-mono text-sm font-medium text-foreground">
                  {location.rating.toFixed(1)}
                </span>
                {location.reviewCount != null && location.reviewCount > 0 && (
                  <span className="font-mono text-xs text-stone">
                    (
                    {Intl.NumberFormat("en", { notation: "compact" }).format(
                      location.reviewCount
                    )}
                    )
                  </span>
                )}
              </div>
            )}

            {/* Description */}
            {location.shortDescription && (
              <p className="mt-3 text-sm leading-relaxed text-foreground-secondary line-clamp-3">
                {location.shortDescription}
              </p>
            )}

            {/* View details — keyboard-accessible entry point */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectLocation(location);
              }}
              className="mt-4 inline-flex items-center text-left text-sm font-medium text-brand-primary transition-colors hover:text-brand-secondary group-hover:text-brand-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:rounded-sm"
            >
              View details
              <span className="ml-1 inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                &rarr;
              </span>
            </button>
          </div>
        </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
