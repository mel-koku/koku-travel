"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { PlacesCardB } from "@/components-b/features/places/PlacesCardB";
import { useSaved } from "@/context/SavedContext";
import { useSavedLocations } from "@/hooks/useSavedLocations";
import type { PagesContent } from "@/types/sanitySiteContent";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

type SavedClientBProps = {
  content?: PagesContent;
};

export function SavedClientB({ content }: SavedClientBProps) {
  const { saved } = useSaved();
  const { data: savedLocations = [], isLoading, error } = useSavedLocations(saved);
  const count = saved.length;

  // Loading
  if (isLoading && count > 0) {
    return (
      <div className="min-h-[100dvh] pt-32 lg:pt-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-64 animate-pulse rounded-2xl bg-[var(--border)]" />
                <div className="h-10 animate-pulse rounded-xl bg-[var(--border)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-[100dvh] pt-32 lg:pt-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center py-32">
          <p className="text-[var(--error)]">Your saved places didn&apos;t load. Try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm font-medium text-[var(--primary)] hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh]">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 lg:pt-36 pb-4 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: bEase }}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
        >
          {content?.savedEyebrow ?? "Saved"}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: bEase, delay: 0.1 }}
          className="mt-4 text-3xl font-bold text-[var(--foreground)] sm:text-4xl"
        >
          {content?.savedTitle ?? "Saved Places"}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: bEase, delay: 0.2 }}
          className="mt-3 text-base text-[var(--foreground-body)]"
        >
          {count > 0
            ? (content?.savedSubtitleWithCount ?? `{count} ${count === 1 ? "place" : "places"} on your list.`).replace("{count}", String(count))
            : content?.savedSubtitleEmpty ?? "Bookmark the places that catch your eye."}
        </motion.p>
      </section>

      {/* Count strip */}
      {count > 0 && (
        <section className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <div className="flex items-baseline gap-2">
                <AnimatedNumber
                  value={count}
                  className="text-3xl font-bold text-[var(--primary)]"
                />
                <span className="text-sm text-[var(--muted-foreground)]">
                  {count === 1 ? "place" : "places"} saved
                </span>
              </div>
              <div className="h-6 w-px bg-[var(--border)]" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                Your Collection
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Content */}
      <section className="pb-16 sm:pb-24 lg:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {savedLocations.length === 0 ? (
            <div className="flex flex-col items-center py-24 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--surface)]">
                <svg
                  className="h-8 w-8 text-[var(--muted-foreground)]"
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
              <h2 className="mt-6 text-xl font-bold text-[var(--foreground)]">
                No saved places yet
              </h2>
              <p className="mt-2 max-w-sm text-sm text-[var(--muted-foreground)]">
                Explore Japan&apos;s hidden gems and save the places that speak to you.
              </p>
              <Link
                href="/b/places"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-6 text-sm font-medium text-white active:scale-[0.98] transition-shadow hover:shadow-[var(--shadow-elevated)]"
              >
                Start exploring
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {savedLocations.map((loc) => (
                <PlacesCardB key={loc.id} location={loc} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
