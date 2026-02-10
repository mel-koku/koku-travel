"use client";

import Image from "next/image";
import Link from "next/link";
import { useCursor } from "@/providers/CursorProvider";
import { easeCinematicCSS } from "@/lib/motion";
import type { GuideType } from "@/types/guide";
import type { GuideSummary } from "@/types/guide";

const GUIDE_TYPE_LABELS: Record<GuideType, string> = {
  itinerary: "Itinerary",
  listicle: "Top Picks",
  deep_dive: "Deep Dive",
  seasonal: "Seasonal",
};

type GuideFooterProps = {
  authorName: string;
  publishedAt?: string;
  relatedGuide: GuideSummary | null;
};

export function GuideFooter({ authorName, publishedAt, relatedGuide }: GuideFooterProps) {
  const { setCursorState, isEnabled } = useCursor();

  return (
    <footer className="pb-12 sm:pb-20 lg:pb-28">
      {/* Sign-off */}
      <div className="mx-auto max-w-2xl px-6">
        <div className="border-t border-border/50 pt-8">
          <p className="font-mono text-xs uppercase tracking-wide text-stone">
            Written by {authorName}
            {publishedAt && (
              <>
                {" \u00b7 "}
                {new Date(publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Next guide card */}
      {relatedGuide && (
        <div className="mx-auto mt-16 max-w-5xl px-6">
          <p className="mb-4 font-mono text-xs uppercase tracking-wide text-stone">
            Next Guide
          </p>
          <Link
            href={`/guides/${relatedGuide.id}`}
            className="group relative block overflow-hidden rounded-xl"
            onMouseEnter={() => isEnabled && setCursorState("read")}
            onMouseLeave={() => isEnabled && setCursorState("default")}
          >
            <div className="relative aspect-[16/9] w-full sm:aspect-[5/2]">
              <Image
                src={relatedGuide.featuredImage}
                alt={relatedGuide.title}
                fill
                className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.02]"
                style={{ transitionTimingFunction: easeCinematicCSS }}
                sizes="(min-width: 1280px) 80vw, 95vw"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/30 to-transparent" />
            </div>

            {/* Overlay text */}
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-ultra text-white/50">
                {GUIDE_TYPE_LABELS[relatedGuide.guideType]}
                {relatedGuide.city && ` \u00b7 ${relatedGuide.city}`}
                {relatedGuide.readingTimeMinutes &&
                  ` \u00b7 ${relatedGuide.readingTimeMinutes} min`}
              </p>
              <h3 className="font-serif text-2xl italic text-white sm:text-3xl">
                {relatedGuide.title}
              </h3>
            </div>
          </Link>
        </div>
      )}

      {/* Back to guides */}
      <div className="mx-auto mt-12 max-w-2xl px-6 text-center">
        <Link
          href="/guides"
          className="link-reveal inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-stone transition-colors hover:text-foreground"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          All Guides
        </Link>
      </div>
    </footer>
  );
}
