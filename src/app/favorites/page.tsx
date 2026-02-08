"use client";

import WishlistShell from "@/components/features/wishlist/WishlistShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useWishlist } from "@/context/WishlistContext";

export default function FavoritesPage() {
  const { wishlist } = useWishlist();
  const count = wishlist.length;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        eyebrow="Saved"
        title="Favorites"
        subtitle={
          count > 0
            ? `${count} ${count === 1 ? "place" : "places"} on your list.`
            : "Bookmark the places that catch your eye."
        }
        imageUrl="/images/regions/kyushu-hero.jpg"
      />
      <WishlistShell />
    </div>
  );
}
