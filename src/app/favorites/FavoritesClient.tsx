"use client";

import WishlistShell from "@/components/features/wishlist/WishlistShell";
import { PageHeader } from "@/components/ui/PageHeader";
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
      <WishlistShell />
    </div>
  );
}
