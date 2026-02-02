import Image from "next/image";
import Link from "next/link";

import type { GuideSummary } from "@/types/guide";

type FeaturedGuidesProps = {
  guides: GuideSummary[];
};

const GUIDE_TYPE_LABELS: Record<GuideSummary["guideType"], string> = {
  itinerary: "Itinerary",
  listicle: "Top Picks",
  deep_dive: "Deep Dive",
  seasonal: "Seasonal",
};

export function FeaturedGuides({ guides }: FeaturedGuidesProps) {
  if (guides.length === 0) {
    return null;
  }

  return (
    <section className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <div className="mb-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-earthy-sage">
              Travel Guides
            </p>
            <h2 className="mt-4 font-serif text-4xl font-medium text-earthy-charcoal sm:text-5xl">
              Start planning
            </h2>
          </div>
          <Link
            href="/guides"
            className="group flex items-center gap-2 text-earthy-charcoal transition-colors hover:text-earthy-sage"
          >
            <span className="text-sm font-medium uppercase tracking-wider">
              View all guides
            </span>
            <ArrowRightIcon />
          </Link>
        </div>

        {/* Guides Grid - 3 columns */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {guides.slice(0, 3).map((guide) => (
            <FeaturedGuideCard key={guide.id} guide={guide} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedGuideCard({ guide }: { guide: GuideSummary }) {
  const imageSrc = guide.thumbnailImage || guide.featuredImage;
  const typeLabel = GUIDE_TYPE_LABELS[guide.guideType];
  const location = guide.city || guide.region || "";

  return (
    <Link
      href={`/guides/${guide.id}`}
      className="group relative block overflow-hidden rounded-xl"
    >
      <div className="relative aspect-[4/3]">
        <Image
          src={imageSrc || "/placeholder.jpg"}
          alt={guide.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Type badge */}
        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-earthy-charcoal backdrop-blur-sm">
            {typeLabel}
          </span>
        </div>

        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-6">
          {location && (
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">
              {location}
            </p>
          )}
          <h3 className="mt-1 font-serif text-xl text-white sm:text-2xl">
            {guide.title}
          </h3>
          {guide.summary && (
            <p className="mt-2 text-sm text-white/80 line-clamp-2">
              {guide.summary}
            </p>
          )}
          {guide.readingTimeMinutes && (
            <div className="mt-3 flex items-center gap-1.5 text-white/70">
              <ClockIcon />
              <span className="text-xs">{guide.readingTimeMinutes} min read</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function ClockIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
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

function ArrowRightIcon() {
  return (
    <svg
      className="h-4 w-4 transition-transform group-hover:translate-x-1"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
