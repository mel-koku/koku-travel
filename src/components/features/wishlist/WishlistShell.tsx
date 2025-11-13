"use client";

import Link from "next/link";

import { LocationCard } from "@/components/features/explore/LocationCard";
import WishlistHeader from "@/components/features/wishlist/WishlistHeader";
import { AddToItineraryButton } from "@/components/features/wishlist/AddToItineraryButton";
import { useWishlist } from "@/context/WishlistContext";
import { MOCK_LOCATIONS } from "@/data/mockLocations";

export default function WishlistShell() {
  const { wishlist } = useWishlist();
  const savedLocations = MOCK_LOCATIONS.filter((loc) =>
    wishlist.includes(loc.id),
  );

  return (
    <section className="mx-auto max-w-7xl px-8">
      <WishlistHeader count={savedLocations.length} />

      {savedLocations.length === 0 ? (
        <div className="py-32 text-center text-gray-500">
          <p>You haven’t added any favorites yet.</p>
          <Link
            href="/explore"
            className="mt-4 inline-block font-medium text-indigo-600 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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

