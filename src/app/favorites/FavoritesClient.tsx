"use client";

import WishlistShell from "@/components/features/wishlist/WishlistShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { useWishlist } from "@/context/WishlistContext";
import type { PagesContent } from "@/types/sanitySiteContent";

type FavoritesClientProps = {
  content?: PagesContent;
};

export function FavoritesClient({ content }: FavoritesClientProps) {
  const { wishlist } = useWishlist();
  const count = wishlist.length;

  const subtitle =
    count > 0
      ? (content?.favoritesSubtitleWithCount ?? `{count} ${count === 1 ? "place" : "places"} on your list.`).replace("{count}", String(count))
      : content?.favoritesSubtitleEmpty ?? "Bookmark the places that catch your eye.";

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        eyebrow={content?.favoritesEyebrow ?? "Saved"}
        title={content?.favoritesTitle ?? "Favorites"}
        subtitle={subtitle}
        imageUrl={content?.favoritesBackgroundImage?.url ?? "/images/regions/kyushu-hero.jpg"}
      />

      {/* Collection count strip */}
      {count > 0 && (
        <section className="bg-background py-8 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 sm:gap-8">
              <ScrollReveal>
                <div className="flex items-baseline gap-2">
                  <AnimatedNumber
                    value={count}
                    className="font-mono text-3xl text-brand-secondary sm:text-4xl"
                  />
                  <span className="text-sm text-foreground-secondary">
                    {count === 1 ? "place" : "places"} saved
                  </span>
                </div>
              </ScrollReveal>
              <div className="h-8 w-px bg-border" />
              <ScrollReveal delay={0.1}>
                <p className="text-xs uppercase tracking-[0.3em] text-foreground-secondary">
                  Your Collection
                </p>
              </ScrollReveal>
            </div>
          </div>
        </section>
      )}

      <WishlistShell />
    </div>
  );
}
