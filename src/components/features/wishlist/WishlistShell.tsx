"use client";

import Link from "next/link";

import { LocationCard } from "@/components/features/explore/LocationCard";
import { AddToItineraryButton } from "@/components/features/wishlist/AddToItineraryButton";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SplitText } from "@/components/ui/SplitText";
import { Magnetic } from "@/components/ui/Magnetic";
import { useWishlist } from "@/context/WishlistContext";
import { useWishlistLocations } from "@/hooks/useWishlistLocations";

export default function WishlistShell() {
  const { wishlist } = useWishlist();
  const { data: savedLocations = [], isLoading, error } = useWishlistLocations(wishlist);

  // Show loading state
  if (isLoading && wishlist.length > 0) {
    return (
      <section className="bg-background py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: Math.min(wishlist.length, 8) }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-64 animate-pulse rounded-xl bg-surface/50" />
                <div className="h-10 animate-pulse rounded bg-surface/50" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Show error state
  if (error) {
    return (
      <section className="bg-background py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-32 text-center text-destructive">
            <p>Couldn&apos;t load your favorites — try refreshing.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 inline-block font-medium text-brand-primary hover:text-brand-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {savedLocations.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            {/* Dashed circle with heart icon */}
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-border">
              <svg
                className="h-10 w-10 text-stone/50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
            </div>

            <SplitText
              as="h2"
              className="mt-8 justify-center font-serif text-2xl text-foreground sm:text-3xl"
              splitBy="word"
              animation="clipY"
              staggerDelay={0.06}
            >
              No favorites yet
            </SplitText>

            <ScrollReveal delay={0.3} distance={15}>
              <p className="mt-4 max-w-sm text-base text-foreground-secondary">
                Explore Japan&apos;s hidden gems and save the places that speak to you.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.5} distance={10}>
              <Magnetic>
                <Link
                  href="/explore"
                  className="mt-8 inline-flex items-center justify-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                >
                  Start exploring
                </Link>
              </Magnetic>
            </ScrollReveal>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {savedLocations.map((loc, i) => (
              <ScrollReveal key={loc.id} delay={i * 0.05} distance={20}>
                <div className="space-y-3">
                  <LocationCard location={loc} />
                  <AddToItineraryButton location={loc} />
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
