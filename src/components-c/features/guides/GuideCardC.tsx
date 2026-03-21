"use client";

import Image from "next/image";
import Link from "next/link";
import type { GuideSummary } from "@/types/guide";
import { getCurrentSeason } from "@/lib/utils/seasonUtils";

const GUIDE_TYPE_LABELS: Record<GuideSummary["guideType"], string> = {
  itinerary: "Itinerary",
  listicle: "Top Picks",
  deep_dive: "Deep Dive",
  seasonal: "Seasonal",
  activity: "Activity",
  blog: "Blog",
};

const SEASON_LABELS: Record<string, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};

function getGuideSeasonLabel(seasons?: string[]): string | null {
  if (!seasons || seasons.length === 0) return null;
  const current = getCurrentSeason();
  const dbCurrent = current === "fall" ? "autumn" : current;
  if (seasons.includes(dbCurrent)) {
    return SEASON_LABELS[dbCurrent] ?? null;
  }
  return null;
}

type GuideCardCProps = {
  guide: GuideSummary;
  index: number;
  eager?: boolean;
};

export function GuideCardC({ guide, index: _index, eager = false }: GuideCardCProps) {
  const imageSrc = guide.thumbnailImage || guide.featuredImage || "";
  const seasonLabel = getGuideSeasonLabel(guide.seasons);

  const metaParts = [
    GUIDE_TYPE_LABELS[guide.guideType],
    guide.readingTimeMinutes ? `${guide.readingTimeMinutes} min read` : null,
  ].filter(Boolean);

  return (
    <article className="group bg-[var(--background)]">
      <Link href={`/c/guides/${guide.id}`} className="block">
        {/* Image */}
        <div className="relative aspect-[3/2] overflow-hidden">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={guide.title}
              fill
              priority={eager}
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[var(--surface)]">
              <span className="text-sm text-[var(--muted-foreground)]">
                No image
              </span>
            </div>
          )}
          {seasonLabel && (
            <div className="absolute top-0 left-0 z-10">
              <span
                className="inline-flex items-center bg-[var(--background)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--foreground)]"
              >
                {seasonLabel}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 lg:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            {guide.region || guide.city
              ? [guide.region || guide.city, ...metaParts].join(" / ")
              : metaParts.join(" / ")}
          </p>

          <h3
            className="mt-2 text-base font-bold leading-snug text-[var(--foreground)] transition-colors duration-200 group-hover:text-[var(--primary)] lg:text-lg"
            style={{ letterSpacing: "-0.01em" }}
          >
            {guide.title}
          </h3>

          {guide.summary && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
              {guide.summary}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
