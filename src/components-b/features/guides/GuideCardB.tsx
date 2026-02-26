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

type GuideCardBProps = {
  guide: GuideSummary;
  index: number;
  eager?: boolean;
};

export function GuideCardB({ guide, index: _index, eager = false }: GuideCardBProps) {
  const imageSrc = guide.thumbnailImage || guide.featuredImage || "";
  const seasonLabel = getGuideSeasonLabel(guide.seasons);

  const metaParts = [
    GUIDE_TYPE_LABELS[guide.guideType],
    guide.city || guide.region,
    guide.readingTimeMinutes ? `${guide.readingTimeMinutes} min read` : null,
  ].filter(Boolean);

  return (
    <article className="group animate-card-in">
      <Link
        href={`/b/guides/${guide.id}`}
        className="block w-full overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={guide.title}
              fill
              priority={eager}
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[var(--surface)]">
              <span className="text-[var(--muted-foreground)]">No image</span>
            </div>
          )}
          {seasonLabel && (
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center rounded-xl bg-white/90 px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)] shadow-[var(--shadow-sm)]">
                {seasonLabel}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
            {metaParts.join(" · ")}
          </p>

          <h3 className="text-sm font-semibold text-[var(--foreground)] line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
            {guide.title}
          </h3>

          <p className="text-xs text-[var(--foreground-body)] line-clamp-2 leading-relaxed">
            {guide.summary}
          </p>
        </div>
      </Link>
    </article>
  );
}
