"use client";

import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { SanityAuthor } from "@/types/sanityGuide";

type GuidePreambleProps = {
  summary: string;
  author: string | SanityAuthor;
  publishedAt?: string;
  tags: string[];
  user: { id: string } | null;
  bookmarked: boolean;
  isToggling: boolean;
  onToggleBookmark: () => void;
};

export function GuidePreamble({
  summary,
  author,
  publishedAt,
  tags,
  user,
  bookmarked,
  isToggling,
  onToggleBookmark,
}: GuidePreambleProps) {
  const isAuthorObject = typeof author !== "string";
  const authorName = isAuthorObject ? author.name : author;
  const authorPhoto = isAuthorObject ? author.photo?.url : undefined;
  const authorSlug = isAuthorObject ? author.slug : undefined;

  return (
    <section className="bg-canvas py-12 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-2xl px-6">
        {/* Summary */}
        <ScrollReveal distance={30} delay={0.1}>
          <p className="serif-body text-xl leading-relaxed text-foreground-body sm:text-2xl">
            {summary}
          </p>
        </ScrollReveal>

        {/* Decorative rule */}
        <div className="my-8 h-px w-12 bg-brand-primary/40" />

        {/* Author + date + bookmark */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Author avatar (Sanity authors only) */}
            {authorPhoto && (
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
                <Image
                  src={authorPhoto}
                  alt={authorName}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
            )}

            <p className="font-mono text-xs uppercase tracking-wide text-stone">
              {authorSlug ? (
                <Link
                  href={`/guides/authors/${authorSlug}`}
                  className="link-reveal hover:text-foreground transition-colors"
                >
                  {authorName}
                </Link>
              ) : (
                authorName
              )}
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

          {/* Bookmark icon button */}
          <button
            type="button"
            onClick={onToggleBookmark}
            disabled={isToggling || !user}
            className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all ${
              bookmarked
                ? "border-sage/50 text-sage"
                : "border-border/50 text-stone hover:border-sage/50 hover:text-sage"
            } ${!user ? "opacity-50 cursor-not-allowed" : ""}`}
            aria-label={
              !user
                ? "Sign in to bookmark"
                : bookmarked
                  ? "Remove bookmark"
                  : "Save"
            }
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

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-xl border border-border/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-stone"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
