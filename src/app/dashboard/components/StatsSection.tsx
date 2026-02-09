"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

type StatsSectionProps = {
  favoritesCount: number;
  guideBookmarksCount: number;
};

export function StatsSection({ favoritesCount, guideBookmarksCount }: StatsSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <ScrollReveal delay={0} distance={20}>
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-xs uppercase tracking-wide text-stone">Favorites</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-foreground">{favoritesCount}</p>
          <Link
            href={favoritesCount > 0 ? "/favorites" : "/explore"}
            className="mt-3 inline-block min-h-[44px] text-sm text-sage hover:text-sage/80 transition"
          >
            {favoritesCount > 0 ? "View favorites \u2192" : "Explore places \u2192"}
          </Link>
        </div>
      </ScrollReveal>
      <ScrollReveal delay={0.08} distance={20}>
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-xs uppercase tracking-wide text-stone">Bookmarked Guides</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-foreground">{guideBookmarksCount}</p>
          <Link href="/guides/bookmarks" className="mt-3 inline-block min-h-[44px] text-sm text-sage hover:text-sage/80 transition">
            View bookmarks &rarr;
          </Link>
        </div>
      </ScrollReveal>
    </div>
  );
}
