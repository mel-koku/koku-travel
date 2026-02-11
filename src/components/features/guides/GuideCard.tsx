"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";

import type { GuideSummary } from "@/types/guide";
import { easeCinematicCSS } from "@/lib/motion";

type GuideCardProps = {
  guide: GuideSummary;
};

const GUIDE_TYPE_LABELS: Record<GuideSummary["guideType"], string> = {
  itinerary: "Itinerary",
  listicle: "Top Picks",
  deep_dive: "Deep Dive",
  seasonal: "Seasonal",
};

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export const GuideCard = memo(function GuideCard({ guide }: GuideCardProps) {
  const imageSrc = guide.thumbnailImage || guide.featuredImage || FALLBACK_IMAGE;
  const typeLabel = GUIDE_TYPE_LABELS[guide.guideType];
  const location = guide.city || guide.region || "";

  return (
    <article className="group relative">
      <Link
        href={`/guides/${guide.id}`}
        className="block overflow-hidden rounded-xl border border-border/50 bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(196,80,79,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      >
        {/* Image */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface">
          <Image
            src={imageSrc}
            alt={guide.title}
            fill
            className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]"
            style={{ transitionTimingFunction: easeCinematicCSS }}
            sizes="(min-width:1280px) 25vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
            priority={false}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent" />

          {/* Type badge */}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center rounded-xl bg-surface/90 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
              {typeLabel}
            </span>
          </div>

          {/* Reading time */}
          {guide.readingTimeMinutes && (
            <div className="absolute bottom-3 right-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-surface/80 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
                <ClockIcon className="h-3.5 w-3.5" />
                {guide.readingTimeMinutes} min read
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          {/* Location badge */}
          {location && (
            <div className="flex items-center gap-1.5 text-sm text-stone">
              <MapPinIcon className="h-3.5 w-3.5" />
              <span>{location}</span>
            </div>
          )}

          {/* Title */}
          <h3 className="font-semibold text-foreground line-clamp-2 transition-colors group-hover:text-brand-primary">
            {guide.title}
          </h3>

          {/* Subtitle */}
          {guide.subtitle && (
            <p className="text-sm text-stone line-clamp-1">{guide.subtitle}</p>
          )}

          {/* Summary */}
          <p className="text-sm text-stone line-clamp-2">{guide.summary}</p>

          {/* Tags */}
          {guide.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {guide.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs text-foreground-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
});

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
      />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
