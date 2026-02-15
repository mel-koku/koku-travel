"use client";

import Image from "next/image";
import Link from "next/link";
import { useCursor } from "@/providers/CursorProvider";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { GuideSummary } from "@/types/guide";

const GUIDE_TYPE_LABELS: Record<GuideSummary["guideType"], string> = {
  itinerary: "Itinerary",
  listicle: "Top Picks",
  deep_dive: "Deep Dive",
  seasonal: "Seasonal",
};

type GuideCardProps = {
  guide: GuideSummary;
  index: number;
  eager?: boolean;
};

export function GuideCard({ guide, index, eager = false }: GuideCardProps) {
  const { setCursorState, isEnabled } = useCursor();
  const imageSrc = guide.thumbnailImage || guide.featuredImage || "";

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
        onMouseEnter={() => isEnabled && setCursorState("read")}
        onMouseLeave={() => isEnabled && setCursorState("default")}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={guide.title}
              fill
              className="object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.04]"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-surface">
              <span className="text-stone">No image</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>

        {/* Meta line */}
        <p className="mt-4 font-mono text-xs uppercase tracking-ultra text-stone">
          {metaParts.join(" \u00b7 ")}
        </p>

        {/* Title */}
        <h3 className="mt-1.5 font-serif text-lg italic text-foreground transition-colors group-hover:text-brand-primary sm:text-xl">
          {guide.title}
        </h3>

        {/* Summary */}
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground-secondary">
          {guide.summary}
        </p>
      </Link>
    </Wrapper>
  );
}
