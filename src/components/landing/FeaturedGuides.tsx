"use client";

import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/cn";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { GuideSummary } from "@/types/guide";
import { staggerItem } from "@/lib/motion";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type FeaturedGuidesProps = {
  guides: GuideSummary[];
  content?: LandingPageContent;
};

const GUIDE_TYPE_LABELS: Record<GuideSummary["guideType"], string> = {
  itinerary: "Itinerary",
  listicle: "Top Picks",
  deep_dive: "Deep Dive",
  seasonal: "Seasonal",
};

export function FeaturedGuides({ guides, content }: FeaturedGuidesProps) {
  if (guides.length === 0) {
    return null;
  }

  const featured = guides[0]!;
  const rest = guides.slice(1, 3);

  return (
    <section className="bg-background py-12 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <div className="mb-10 flex flex-col gap-6 sm:mb-16 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow-editorial text-brand-primary">
              {content?.featuredGuidesEyebrow ?? "Travel Guides"}
            </p>
            <h2 className="mt-4 font-serif italic text-3xl tracking-heading text-foreground sm:text-4xl">
              {content?.featuredGuidesHeading ?? "The guides the locals wrote"}
            </h2>
            <p className="mt-4 max-w-md text-base text-foreground-secondary">
              {content?.featuredGuidesDescription ?? "Local insights, seasonal tips, and itineraries — written by people who live there."}
            </p>
          </div>
          <Link
            href="/guides"
            className="link-reveal group inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-foreground transition-colors hover:text-brand-primary"
          >
            {content?.featuredGuidesCtaText ?? "Browse guides"}
            <ArrowRightIcon />
          </Link>
        </div>

        {/* Asymmetric Grid */}
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:grid-rows-2">
          {/* Featured guide: spans 2 rows */}
          <ScrollReveal delay={0.15} distance={50} className="lg:row-span-2">
            <GuideCard guide={featured} index={0} featured />
          </ScrollReveal>

          {/* Stacked guides */}
          {rest.map((guide, idx) => (
            <ScrollReveal key={guide.id} delay={0.25 + idx * staggerItem} distance={50}>
              <GuideCard guide={guide} index={idx + 1} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function GuideCard({
  guide,
  index,
  featured = false,
}: {
  guide: GuideSummary;
  index: number;
  featured?: boolean;
}) {
  const imageSrc = guide.thumbnailImage || guide.featuredImage;
  const typeLabel = GUIDE_TYPE_LABELS[guide.guideType];
  const location = guide.city || guide.region || "";
  return (
    <Link
      href={`/guides/${guide.id}`}
      className="group relative block h-full overflow-hidden rounded-xl"
    >
      <div
        className={cn(
          "relative h-full",
          featured ? "aspect-[3/2] lg:aspect-auto" : "aspect-[4/3]"
        )}
      >
        <Image
          src={imageSrc || "/placeholder.jpg"}
          alt={guide.title}
          fill
          className="object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.02] group-active:scale-[1.02]"
          sizes={
            featured
              ? "(min-width: 1024px) 66vw, 100vw"
              : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          }
        />
        {/* Gradient overlay — recedes on hover to reveal more image */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/20 to-transparent transition-opacity duration-500 group-hover:opacity-50" />

        {/* Index number */}
        <div className="absolute right-4 top-4">
          <span className="font-mono text-sm text-white/70">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Type badge */}
        <div className="absolute left-4 top-4">
          <span className="inline-flex items-center rounded-xl bg-surface/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
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
          <p
            className={cn(
              "mt-1 font-serif italic text-white transition-transform duration-500 group-hover:-translate-y-1",
              featured ? "text-xl sm:text-2xl lg:text-3xl" : "text-xl sm:text-2xl"
            )}
          >
            {guide.title}
          </p>
          {guide.summary && featured && (
            <p className="mt-2 hidden text-sm text-white/80 line-clamp-2 lg:block">
              {guide.summary}
            </p>
          )}
          {guide.readingTimeMinutes && (
            <div className="mt-3 flex items-center gap-1.5 text-white/70">
              <ClockIcon />
              <span className="text-xs">
                {guide.readingTimeMinutes} min read
              </span>
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
      />
    </svg>
  );
}
