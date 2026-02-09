"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { Guide } from "@/types/guide";

type GuidePreambleProps = {
  guide: Guide;
  user: { id: string } | null;
  bookmarked: boolean;
  isToggling: boolean;
  onToggleBookmark: () => void;
};

export function GuidePreamble({
  guide,
  user,
  bookmarked,
  isToggling,
  onToggleBookmark,
}: GuidePreambleProps) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-2xl px-6">
        {/* Summary */}
        <ScrollReveal distance={30} delay={0.1}>
          <p className="font-serif italic text-xl leading-relaxed text-foreground sm:text-2xl">
            {guide.summary}
          </p>
        </ScrollReveal>

        {/* Decorative rule */}
        <ScrollReveal distance={10} delay={0.2}>
          <div className="my-8 h-px w-12 bg-brand-primary/40" />
        </ScrollReveal>

        {/* Author + date + bookmark */}
        <ScrollReveal distance={15} delay={0.3}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="font-mono text-xs uppercase tracking-wide text-stone">
                {guide.author}
                {guide.publishedAt && (
                  <>
                    {" \u00b7 "}
                    {new Date(guide.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </>
                )}
              </p>
            </div>

            {/* Bookmark icon button */}
            <button
              type="button"
              onClick={onToggleBookmark}
              disabled={isToggling || !user}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                bookmarked
                  ? "border-sage/50 text-sage"
                  : "border-border/50 text-stone hover:border-sage/50 hover:text-sage"
              } ${!user ? "opacity-50 cursor-not-allowed" : ""}`}
              title={
                !user
                  ? "Sign in to bookmark"
                  : bookmarked
                    ? "Remove bookmark"
                    : "Bookmark this guide"
              }
            >
              <svg
                className="h-4 w-4"
                fill={bookmarked ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>
          </div>
        </ScrollReveal>

        {/* Tags */}
        {guide.tags.length > 0 && (
          <ScrollReveal distance={10} delay={0.4}>
            <div className="mt-6 flex flex-wrap gap-2">
              {guide.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-xl border border-border/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-stone"
                >
                  {tag}
                </span>
              ))}
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
}
