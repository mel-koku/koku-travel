"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";

import type { GuideSummary } from "@/types/guide";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useCursor } from "@/hooks/useCursor";
import { easeCinematicCSS } from "@/lib/motion";

const GUIDE_TYPE_LABELS: Record<GuideSummary["guideType"], string> = {
  itinerary: "Itinerary",
  listicle: "Top Picks",
  deep_dive: "Deep Dive",
  seasonal: "Seasonal",
};

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

type GuideEditorialRowProps = {
  guide: GuideSummary;
  index: number;
  flip: boolean;
};

export const GuideEditorialRow = memo(function GuideEditorialRow({
  guide,
  index,
  flip,
}: GuideEditorialRowProps) {
  const { setCursorState } = useCursor();
  const imageSrc = guide.thumbnailImage || guide.featuredImage || FALLBACK_IMAGE;
  const typeLabel = GUIDE_TYPE_LABELS[guide.guideType];
  const location = guide.city || guide.region || "";
  const metaParts = [typeLabel, location, guide.readingTimeMinutes ? `${guide.readingTimeMinutes} min read` : ""].filter(Boolean);

  return (
    <ScrollReveal distance={30}>
      <Link
        href={`/guides/${guide.id}`}
        className="group block"
        onMouseEnter={() => setCursorState("read")}
        onMouseLeave={() => setCursorState("default")}
      >
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
          {/* Image */}
          <div
            className={`relative aspect-[3/2] overflow-hidden rounded-xl ${
              flip ? "lg:order-2" : ""
            }`}
          >
            <Image
              src={imageSrc}
              alt={guide.title}
              fill
              className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.02]"
              style={{ transitionTimingFunction: easeCinematicCSS }}
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
            {/* Index number */}
            <div className="absolute bottom-4 left-4 lg:bottom-auto lg:left-auto lg:right-4 lg:top-4">
              <span className="font-mono text-sm text-foreground-secondary/30">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* Text */}
          <div className={flip ? "lg:order-1" : ""}>
            {/* Metadata */}
            <p className="font-mono text-xs uppercase tracking-wide text-stone">
              {metaParts.join(" · ")}
            </p>

            {/* Title */}
            <h3 className="mt-3 font-serif text-2xl sm:text-3xl text-foreground transition-colors duration-300 group-hover:text-brand-primary">
              {guide.title}
            </h3>

            {/* Summary */}
            <p className="mt-3 text-sm text-foreground-secondary line-clamp-2 max-w-md">
              {guide.summary}
            </p>

            {/* CTA */}
            <span className="link-reveal mt-6 inline-block text-sm font-medium text-foreground">
              Read guide →
            </span>
          </div>
        </div>
      </Link>
    </ScrollReveal>
  );
});
