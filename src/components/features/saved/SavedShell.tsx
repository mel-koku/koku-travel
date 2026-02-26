"use client";

import Image from "next/image";
import Link from "next/link";

import { LocationCard } from "@/components/features/places/LocationCard";
import { AddToItineraryButton } from "@/components/features/saved/AddToItineraryButton";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useSaved } from "@/context/SavedContext";
import { useSavedLocations } from "@/hooks/useSavedLocations";

export default function SavedShell() {
  const { saved } = useSaved();
  const { data: savedLocations = [], isLoading, error } = useSavedLocations(saved);

  // Show loading state
  if (isLoading && saved.length > 0) {
    return (
      <section className="bg-background py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: Math.min(saved.length, 8) }).map((_, i) => (
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
      <section className="bg-background py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-32 text-center text-destructive">
            <p>Your saved places didn&apos;t load. Give it another shot.</p>
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
    <section className="relative bg-background py-12 sm:py-16 lg:py-20">
      {/* Grid grain texture */}
      <div className="texture-grain pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {savedLocations.length === 0 ? (
          /* Atmospheric empty state */
          <div className="relative overflow-hidden rounded-xl">
            {/* Background image */}
            <div className="absolute inset-0">
              <Image
                src="https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1920&q=80"
                alt=""
                fill
                className="object-cover opacity-15"
                sizes="100vw"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-charcoal/70" />
            </div>
            <div className="texture-grain pointer-events-none absolute inset-0" />

            <div className="relative flex flex-col items-center py-24 text-center px-6">
              {/* Dashed circle with heart icon */}
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-white/20">
                <svg
                  className="h-10 w-10 text-white/40"
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

              <h2 className="mt-8 font-serif italic text-2xl text-white sm:text-3xl">
                No saved places
              </h2>

              <ScrollReveal delay={0.3} distance={15}>
                <p className="mt-4 max-w-sm text-base text-white/70">
                  Heart the places you want in your trip. We&apos;ll include them.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.5} distance={10}>
                <Link
                  href="/places"
                  className="relative mt-8 inline-flex items-center justify-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                >
                  <span className="absolute inset-0 rounded-xl bg-brand-primary/20 blur-xl" />
                  <span className="relative">Start exploring</span>
                </Link>
              </ScrollReveal>
            </div>
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
