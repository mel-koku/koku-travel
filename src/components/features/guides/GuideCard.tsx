"use client";

import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { GuideSummary } from "@/types/guide";
import { getCurrentSeason } from "@/lib/utils/seasonUtils";

const GUIDE_TYPE_LABELS: Record<GuideSummary["guideType"], string> = {
  itinerary: "Itinerary",
  listicle: "Top Picks",
  deep_dive: "Deep Dive",
  seasonal: "Seasonal",
};

const SEASON_LABELS: Record<string, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};

function getGuideSeasonLabel(seasons?: string[]): string | null {
  if (!seasons || seasons.length === 0) return null;
  // Map internal "fall" to DB "autumn"
  const current = getCurrentSeason();
  const dbCurrent = current === "fall" ? "autumn" : current;
  // Only show badge if guide matches current season
  if (seasons.includes(dbCurrent)) {
    return SEASON_LABELS[dbCurrent] ?? null;
  }
  return null;
}

type GuideCardProps = {
  guide: GuideSummary;
  index: number;
  eager?: boolean;
};

export function GuideCard({ guide, index, eager = false }: GuideCardProps) {
  const imageSrc = guide.thumbnailImage || guide.featuredImage || "";
  const seasonLabel = getGuideSeasonLabel(guide.seasons);

  const metaParts = [
    GUIDE_TYPE_LABELS[guide.guideType],
    guide.city || guide.region,
    guide.readingTimeMinutes ? `${guide.readingTimeMinutes} min read` : null,
  ].filter(Boolean);

  const Wrapper = eager ? "div" : ScrollReveal;
  const wrapperProps = eager ? {} : { delay: index * 0.08, distance: 30 };

  return (
    <Wrapper {...wrapperProps}>
      <Link
        href={`/guides/${guide.id}`}
        className="group block"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={guide.title}
              fill
              priority={eager}
              className="object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.04]"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-surface">
              <span className="text-stone">No image</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          {seasonLabel && (
            <div className="absolute top-2.5 left-2.5 z-10">
              <span className="inline-flex items-center rounded-xl bg-brand-secondary/90 px-2 py-0.5 text-[10px] font-medium text-charcoal shadow-sm">
                {seasonLabel}
              </span>
            </div>
          )}
        </div>

        {/* Meta line */}
        <p className="mt-4 font-mono text-xs uppercase tracking-ultra text-stone">
          {metaParts.join(" \u00b7 ")}
        </p>

        {/* Title */}
        <p className="mt-1.5 font-serif text-lg italic text-foreground transition-colors group-hover:text-brand-primary sm:text-xl">
          {guide.title}
        </p>

        {/* Summary */}
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground-secondary">
          {guide.summary}
        </p>
      </Link>
    </Wrapper>
  );
}
