"use client";

import Link from "next/link";

import { LocationCard } from "@/components/features/explore/LocationCard";
import WishlistHeader from "@/components/features/wishlist/WishlistHeader";
import { AddToItineraryButton } from "@/components/features/wishlist/AddToItineraryButton";
import { useWishlist } from "@/context/WishlistContext";
import { useWishlistLocations } from "@/hooks/useWishlistLocations";

export default function WishlistShell() {
  const { wishlist } = useWishlist();
  const { data: savedLocations = [], isLoading, error } = useWishlistLocations(wishlist);

  // Show loading state
  if (isLoading && wishlist.length > 0) {
    return (
      <section className="mx-auto max-w-7xl px-8">
        <WishlistHeader count={wishlist.length} />
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: Math.min(wishlist.length, 8) }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-64 animate-pulse rounded-lg bg-surface" />
              <div className="h-10 animate-pulse rounded bg-surface" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Show error state
  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-8">
        <WishlistHeader count={0} />
        <div className="py-32 text-center text-destructive">
          <p>Failed to load your favorites. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-block font-medium text-brand-primary hover:text-brand-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-8">
      <WishlistHeader count={savedLocations.length} />

      {savedLocations.length === 0 ? (
        <div className="py-32 text-center text-stone">
          <p>You have not added any favorites yet.</p>
          <Link
            href="/explore"
            className="mt-4 inline-block font-medium text-brand-primary hover:text-brand-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            Browse locations →
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {savedLocations.map((loc) => (
            <div key={loc.id} className="space-y-3">
              <LocationCard location={loc} />
              <AddToItineraryButton location={loc} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
