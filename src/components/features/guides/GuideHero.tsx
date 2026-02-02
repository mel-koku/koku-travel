"use client";

import Image from "next/image";
import Link from "next/link";

import type { Guide } from "@/types/guide";

type GuideHeroProps = {
  guide: Guide;
};

const GUIDE_TYPE_LABELS: Record<Guide["guideType"], string> = {
  itinerary: "Itinerary",
  listicle: "Top Picks",
  deep_dive: "Deep Dive",
  seasonal: "Seasonal",
};

export function GuideHero({ guide }: GuideHeroProps) {
  const typeLabel = GUIDE_TYPE_LABELS[guide.guideType];
  const location = guide.city || guide.region || "";

  return (
    <div className="relative">
      {/* Hero image */}
      <div className="relative h-[40vh] min-h-[300px] max-h-[500px] w-full overflow-hidden">
        <Image
          src={guide.featuredImage}
          alt={guide.title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 pb-8 pt-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-4">
            <ol className="flex items-center gap-2 text-sm text-white/80">
              <li>
                <Link
                  href="/guides"
                  className="hover:text-white transition-colors"
                >
                  Guides
                </Link>
              </li>
              <li className="text-white/60">/</li>
              <li className="text-white">{typeLabel}</li>
            </ol>
          </nav>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
              {typeLabel}
            </span>
            {location && (
              <span className="inline-flex items-center gap-1.5 text-sm text-white/90">
                <MapPinIcon className="h-4 w-4" />
                {location}
              </span>
            )}
            {guide.readingTimeMinutes && (
              <span className="inline-flex items-center gap-1.5 text-sm text-white/90">
                <ClockIcon className="h-4 w-4" />
                {guide.readingTimeMinutes} min read
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            {guide.title}
          </h1>

          {/* Subtitle */}
          {guide.subtitle && (
            <p className="mt-3 text-lg text-white/90 sm:text-xl">
              {guide.subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

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
