"use client";

import { useAppState } from "@/state/AppState";
import { useBookmarks } from "@/hooks/useBookmarksQuery";
import type { Guide } from "@/types/guide";
import type { Location } from "@/types/location";

import { GuideHero } from "./GuideHero";
import { GuideContent } from "./GuideContent";
import { LinkedLocations } from "./LinkedLocations";

type GuideDetailClientProps = {
  guide: Guide;
  locations: Location[];
};

export function GuideDetailClient({ guide, locations }: GuideDetailClientProps) {
  const { user } = useAppState();
  const { isBookmarked, toggleBookmark, isToggling } = useBookmarks(user?.id);
  const bookmarked = isBookmarked(guide.id);

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <GuideHero guide={guide} />

      {/* Content area */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Action bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            {/* Author */}
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-sage/30 flex items-center justify-center">
                <span className="text-sm font-medium text-sage">
                  {guide.author.charAt(0)}
                </span>
              </div>
              <span className="text-sm text-stone">{guide.author}</span>
            </div>

            {/* Tags */}
            {guide.tags.length > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-border">|</span>
                {guide.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-xl bg-sand/50 px-2.5 py-0.5 text-xs font-medium text-foreground-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bookmark button */}
          <button
            type="button"
            onClick={() => toggleBookmark(guide.id)}
            disabled={isToggling || !user}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              bookmarked
                ? "bg-sage text-white hover:bg-sage/90"
                : "bg-surface border border-border text-foreground hover:border-sage hover:text-sage"
            } ${!user ? "opacity-50 cursor-not-allowed" : ""}`}
            title={!user ? "Sign in to bookmark" : bookmarked ? "Remove bookmark" : "Bookmark this guide"}
          >
            <BookmarkIcon filled={bookmarked} className="h-4 w-4" />
            <span>{bookmarked ? "Saved" : "Save"}</span>
          </button>
        </div>

        {/* Summary */}
        <p className="text-lg text-foreground-secondary mb-8 leading-relaxed">
          {guide.summary}
        </p>

        {/* Article body */}
        <GuideContent body={guide.body} />

        {/* Linked locations */}
        <LinkedLocations locations={locations} />

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-stone text-center">
            Written by <span className="font-medium">{guide.author}</span>
            {guide.publishedAt && (
              <>
                {" "}
                · Published{" "}
                {new Date(guide.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function BookmarkIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className}
      fill={filled ? "currentColor" : "none"}
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
  );
}
