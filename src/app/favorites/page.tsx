"use client";

import WishlistShell from "@/components/features/wishlist/WishlistShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useWishlist } from "@/context/WishlistContext";

export default function FavoritesPage() {
  const { wishlist } = useWishlist();
  const count = wishlist.length;

  return (
    <div className="min-h-screen bg-surface">
      <PageHeader
        variant="rich"
        eyebrow="Your Collection"
        title="Favorites"
        subtitle={
          count > 0
            ? `${count} handpicked ${count === 1 ? "location" : "locations"} waiting for your next adventure.`
            : "Save the places that inspire you most."
        }
        imageUrl="/images/regions/kyushu-hero.jpg"
      />
      <WishlistShell />
    </div>
  );
}
