"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { PagesContent } from "@/types/sanitySiteContent";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";

type PlacesIntroProps = {
  totalCount?: number;
  content?: PagesContent;
  children?: React.ReactNode;
  /** Click handler for the search-button affordance. Opens the search modal. */
  onSearchClick?: () => void;
};

const ROTATING_HINTS = [
  "Quiet temple morning in Kyoto",
  "Rainy day cafes in Osaka",
  "Sunrise viewpoint near Hakone",
  "Late-night ramen Tokyo",
];

export function PlacesIntro({ content, children, totalCount, onSearchClick }: PlacesIntroProps) {
  const placeholderHint = ROTATING_HINTS[0];

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-4 sm:pt-12 sm:pb-6 lg:pt-16 text-center">
      <ScrollReveal delay={0.1} distance={20} duration={0.5}>
        <h1 className={cn(typography({ intent: "editorial-h1" }), "text-[clamp(2rem,4vw,3rem)] max-w-3xl mx-auto")}>
          {content?.placesHeading ?? "Every place worth knowing about, in one collection."}
        </h1>
      </ScrollReveal>

      {totalCount && totalCount > 0 ? (
        <ScrollReveal delay={0.12} distance={16} duration={0.45}>
          <p className="mt-3 font-mono text-xs uppercase tracking-wide text-foreground-secondary">
            {totalCount.toLocaleString()}+ places · 47 prefectures
          </p>
        </ScrollReveal>
      ) : null}

      {onSearchClick && (
        <ScrollReveal delay={0.18} distance={20} duration={0.5}>
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={onSearchClick}
              className="group flex w-full max-w-xl items-center gap-3 rounded-full border border-border bg-surface/80 px-5 py-3.5 text-left shadow-[var(--shadow-card)] transition hover:bg-surface hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              aria-label="Open search"
            >
              <SearchGlyph className="h-4 w-4 shrink-0 text-stone" />
              <span className="flex-1 truncate text-sm text-stone">{placeholderHint}</span>
              <kbd className="hidden rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-foreground-secondary sm:inline-flex">
                /
              </kbd>
            </button>
          </div>
        </ScrollReveal>
      )}

      {children && (
        <ScrollReveal delay={0.22} distance={20} duration={0.5}>
          <div className="mt-6">{children}</div>
        </ScrollReveal>
      )}
    </section>
  );
}

function SearchGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.167 15a5.833 5.833 0 1 0 0-11.666 5.833 5.833 0 0 0 0 11.666Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="m14.167 14.167 2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
