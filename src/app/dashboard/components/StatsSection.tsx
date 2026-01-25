"use client";

import Link from "next/link";

type StatsSectionProps = {
  favoritesCount: number;
  guideBookmarksCount: number;
};

export function StatsSection({ favoritesCount, guideBookmarksCount }: StatsSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4">
      <div className="rounded-xl border border-border p-4">
        <p className="text-xs uppercase text-stone">Favorites</p>
        <p className="mt-1 text-xl font-semibold text-charcoal sm:text-2xl">{favoritesCount}</p>
        <Link
          href={favoritesCount > 0 ? "/favorites" : "/explore"}
          className="mt-2 inline-block min-h-[44px] text-sm text-sage hover:text-sage/80"
        >
          {favoritesCount > 0 ? "View favorites \u2192" : "Explore places \u2192"}
        </Link>
      </div>
      <div className="rounded-xl border border-border p-4">
        <p className="text-xs uppercase text-stone">Bookmarked Guides</p>
        <p className="mt-1 text-xl font-semibold text-charcoal sm:text-2xl">{guideBookmarksCount}</p>
        <Link href="/guides/bookmarks" className="mt-2 inline-block min-h-[44px] text-sm text-sage hover:text-sage/80">
          View bookmarks \u2192
        </Link>
      </div>
    </div>
  );
}
