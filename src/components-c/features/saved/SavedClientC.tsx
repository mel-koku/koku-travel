"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useSaved } from "@/context/SavedContext";
import { useSavedLocations } from "@/hooks/useSavedLocations";
import { cEase, fadeUp } from "@c/ui/motionC";
import type { PagesContent } from "@/types/sanitySiteContent";
import type { Location } from "@/types/location";

type SavedClientCProps = {
  content?: PagesContent;
};

export function SavedClientC({ content }: SavedClientCProps) {
  const { saved, toggleSave } = useSaved();
  const {
    data: savedLocations = [],
    isLoading,
    error,
  } = useSavedLocations(saved);
  const count = saved.length;
  const prefersReducedMotion = useReducedMotion();

  // Loading
  if (isLoading && count > 0) {
    return (
      <div className="min-h-[100dvh] pt-32 lg:pt-36">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
              <div key={i} className="bg-[var(--background)] p-5 lg:p-6">
                <div className="aspect-[4/3] animate-pulse bg-[var(--surface)]" />
                <div className="mt-4 h-3 w-20 animate-pulse bg-[var(--surface)]" />
                <div className="mt-2 h-5 w-40 animate-pulse bg-[var(--surface)]" />
                <div className="mt-2 h-3 w-24 animate-pulse bg-[var(--surface)]" />
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
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-32">
          <p className="text-[var(--primary)]">
            Your saved places didn&apos;t load. Try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--primary)] hover:opacity-70 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh]">
      {/* Header */}
      <section className="pt-32 lg:pt-36 pb-4">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <motion.p
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: cEase }}
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]"
          >
            {content?.savedEyebrow ?? "Saved"}
          </motion.p>

          <motion.h1
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: cEase, delay: 0.1 }}
            className="mt-4 leading-[1.1]"
            style={{
              fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
              fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--foreground)",
            }}
          >
            {content?.savedTitle ?? "Saved Places"}
          </motion.h1>

          <motion.p
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: cEase, delay: 0.2 }}
            className="mt-3 text-sm text-[var(--muted-foreground)] lg:text-[15px]"
          >
            {count > 0
              ? (
                  content?.savedSubtitleWithCount ??
                  `{count} ${count === 1 ? "place" : "places"} on your list.`
                ).replace("{count}", String(count))
              : content?.savedSubtitleEmpty ??
                "Bookmark the places that catch your eye."}
          </motion.p>
        </div>
      </section>

      {/* Count strip */}
      {count > 0 && (
        <section className="py-6">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
            <div className="flex items-center gap-4">
              <span
                className="text-2xl font-bold text-[var(--primary)]"
                style={{ letterSpacing: "-0.02em" }}
              >
                {count}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                {count === 1 ? "place" : "places"} saved
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Content */}
      <section className="pb-24 sm:pb-32 lg:pb-48">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          {savedLocations.length === 0 ? (
            <div className="py-24 sm:py-32">
              <div className="max-w-md">
                <div className="flex h-16 w-16 items-center justify-center border border-[var(--border)]">
                  <svg
                    className="h-7 w-7 text-[var(--muted-foreground)]"
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
                <h2
                  className="mt-6 text-xl font-bold text-[var(--foreground)]"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  No saved places yet
                </h2>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Browse places across Japan and save the ones that stand out.
                </p>
                <Link
                  href="/c/places"
                  className="mt-6 inline-flex h-11 items-center justify-center bg-[var(--primary)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
                >
                  Browse Places
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
              {savedLocations.map((loc, i) => (
                <SavedCardC
                  key={loc.id}
                  location={loc}
                  index={i}
                  onRemove={() => toggleSave(loc.id)}
                  noMotion={!!prefersReducedMotion}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

type SavedCardCProps = {
  location: Location;
  index: number;
  onRemove: () => void;
  noMotion: boolean;
};

function SavedCardC({ location, index, onRemove, noMotion }: SavedCardCProps) {
  return (
    <motion.article
      initial={noMotion ? undefined : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={fadeUp(index * 0.08)}
      className="group relative bg-[var(--background)]"
    >
      <Link href={`/c/places/${location.id}`} className="block">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {location.image ? (
            <Image
              src={location.image}
              alt={location.name}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[var(--surface)]">
              <span className="text-sm text-[var(--muted-foreground)]">
                No image
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 lg:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            {location.city ?? location.region}
          </p>
          <h3
            className="mt-2 text-base font-bold text-[var(--foreground)] transition-colors duration-200 group-hover:text-[var(--primary)] lg:text-lg"
            style={{ letterSpacing: "-0.01em" }}
          >
            {location.name}
          </h3>
          <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
            {location.category}
          </p>
        </div>
      </Link>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-0 right-0 z-10 flex h-9 w-9 items-center justify-center border border-[var(--border)] bg-white text-[var(--muted-foreground)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
        aria-label={`Remove ${location.name} from saved`}
      >
        <svg
          className="h-4 w-4"
          fill="currentColor"
          viewBox="0 0 24 24"
          stroke="none"
        >
          <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      </button>
    </motion.article>
  );
}
