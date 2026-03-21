"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useEffect, useRef, useState } from "react";
import { useSaved } from "@/context/SavedContext";
import { useFirstSaveToast } from "@/hooks/useFirstSaveToast";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { LOCATION_EDITORIAL_SUMMARIES } from "@/data/locationEditorialSummaries";
import type { Location } from "@/types/location";
import { SeasonalBadgeC } from "./SeasonalBadgeC";

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

type PlacesCardCProps = {
  location: Location;
  isHighlighted?: boolean;
  onHover?: (locationId: string | null) => void;
  onSelect?: (location: Location) => void;
  eager?: boolean;
};

function getSummary(location: Location): string {
  const editorial = LOCATION_EDITORIAL_SUMMARIES[location.id]?.trim();
  if (editorial) return editorial;
  if (location.shortDescription?.trim()) return location.shortDescription.trim();
  if (location.description?.trim()) return location.description.trim();

  const city = location.city ? ` in ${location.city}` : "";
  return `Notable ${location.category}${city}.`;
}

export const PlacesCardC = memo(function PlacesCardC({
  location,
  isHighlighted,
  onHover,
  onSelect,
  eager = false,
}: PlacesCardCProps) {
  const { isInSaved, toggleSave } = useSaved();
  const active = isInSaved(location.id);
  const showFirstSaveToast = useFirstSaveToast();

  const imageSrc = resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 600);
  const summary = getSummary(location);

  const [heartAnimating, setHeartAnimating] = useState(false);
  const wasSaved = useRef(active);

  useEffect(() => {
    if (active && !wasSaved.current) {
      setHeartAnimating(true);
      const timer = setTimeout(() => setHeartAnimating(false), 500);
      return () => clearTimeout(timer);
    }
    wasSaved.current = active;
  }, [active]);

  return (
    <article
      className="group relative bg-[var(--background)]"
      data-location-id={location.id}
      onMouseEnter={() => onHover?.(location.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <Link
        href={`/c/places/${location.id}`}
        onClick={onSelect ? (e) => { e.preventDefault(); onSelect(location); } : undefined}
        className={`block w-full overflow-hidden transition-all duration-300 ${
          isHighlighted
            ? "ring-2 ring-[var(--primary)]"
            : ""
        }`}
      >
        {/* Image */}
        <div className="relative w-full overflow-hidden aspect-[4/3]">
          <Image
            src={imageSrc || FALLBACK_IMAGE}
            alt={location.name}
            fill
            priority={eager}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
          />

          {/* Seasonal badge */}
          <div className="absolute top-0 left-0 z-10">
            <SeasonalBadgeC tags={location.tags} />
          </div>

          {/* Save button */}
          <div className={`absolute top-0 right-0 z-10 sm:transition-opacity sm:duration-300 ${
            active ? "sm:opacity-100" : "sm:opacity-0 sm:group-hover:opacity-100"
          }`}>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!active) showFirstSaveToast();
                toggleSave(location.id);
              }}
              aria-label={active ? "Unsave" : "Save for trip"}
              className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-[11px] font-bold uppercase tracking-[0.1em] transition-transform hover:scale-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 ${
                active
                  ? "bg-[var(--primary)] text-white"
                  : "bg-white/90 text-[var(--foreground)]"
              }`}
            >
              <HeartIconC active={active} animating={heartAnimating} />
              {active ? "Saved" : "Save"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 lg:p-6 space-y-3">
          {/* Eyebrow: city + region */}
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            {location.city}, {location.region}
          </p>

          {/* Name + rating */}
          <div className="flex items-start justify-between gap-2">
            <h3
              className="text-sm leading-snug line-clamp-1 group-hover:text-[var(--primary)] transition-colors"
              style={{
                fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: "var(--foreground)",
              }}
            >
              {location.name}
            </h3>
            {location.rating ? (
              <span className="flex shrink-0 items-center gap-0.5 text-xs text-[var(--foreground)]">
                <svg className="h-3 w-3 text-[var(--primary)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
                </svg>
                {location.rating.toFixed(1)}
                {location.reviewCount ? (
                  <span className="text-[var(--muted-foreground)]">
                    ({location.reviewCount >= 1000
                      ? `${(location.reviewCount / 1000).toFixed(1)}k`
                      : location.reviewCount})
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>

          {/* Summary */}
          <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
            {summary}
          </p>

          {/* Category + duration + JTA badge */}
          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)] border border-[var(--border)] px-2.5 py-1.5">
              {location.category}
            </span>
            {location.jtaApproved && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--primary)] border border-[var(--primary)]/30 px-2.5 py-1.5">
                JTA
              </span>
            )}
            {location.estimatedDuration && (
              <>
                <span className="text-[var(--border)]">&middot;</span>
                <span className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" d="M12 6v6l4 2" />
                  </svg>
                  {location.estimatedDuration}
                </span>
              </>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
});

function HeartIconC({ active, animating }: { active: boolean; animating: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-3.5 w-3.5 transition-colors ${
        active ? "fill-white stroke-white" : "fill-none stroke-current"
      } ${animating ? "animate-heart-pulse" : ""}`}
      viewBox="0 0 24 24"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19.5 13.572a24.064 24.064 0 0 1-7.5 7.178 24.064 24.064 0 0 1-7.5-7.178C3.862 12.334 3 10.478 3 8.52 3 5.989 5.014 4 7.5 4c1.54 0 2.994.757 4 1.955C12.506 4.757 13.96 4 15.5 4 17.986 4 20 5.989 20 8.52c0 1.958-.862 3.813-2.5 5.052Z" />
    </svg>
  );
}
