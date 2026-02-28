"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { motion } from "framer-motion";
import { useAppState } from "@/state/AppState";
import { useBookmarks } from "@/hooks/useBookmarksQuery";
import { PortableTextBodyB } from "./PortableTextBodyB";
import { GuideContentB } from "./GuideContentB";
import type { Guide, GuideSummary } from "@/types/guide";
import type { SanityGuide, SanityAuthor } from "@/types/sanityGuide";
import type { Location } from "@/types/location";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const sectionReveal = {
  initial: { opacity: 0, y: 10 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" as const },
  transition: { duration: 0.5, ease: bEase },
};

const GUIDE_TYPE_LABELS: Record<string, string> = {
  itinerary: "Itinerary",
  listicle: "Top Picks",
  deep_dive: "Deep Dive",
  seasonal: "Seasonal",
};

type GuideDetailClientBProps =
  | {
      source: "supabase";
      guide: Guide;
      sanityGuide?: never;
      locations: Location[];
      relatedGuide?: GuideSummary | null;
    }
  | {
      source: "sanity";
      sanityGuide: SanityGuide;
      guide?: never;
      locations: Location[];
      relatedGuide?: GuideSummary | null;
    };

export function GuideDetailClientB(props: GuideDetailClientBProps) {
  const { locations, relatedGuide = null, source } = props;
  const router = useRouter();
  const { user } = useAppState();
  const { isBookmarked, toggleBookmark, isToggling } = useBookmarks(user?.id);

  const isSanity = source === "sanity";
  const sg = isSanity ? props.sanityGuide : undefined;
  const g = !isSanity ? props.guide : undefined;

  const guideId = isSanity ? sg!.slug : g!.id;
  const bookmarked = isBookmarked(guideId);

  const title = isSanity ? sg!.title : g!.title;
  const summary = isSanity ? sg!.summary : g!.summary;
  const tags = isSanity ? sg!.tags || [] : g!.tags;
  const publishedAt = isSanity ? sg!.publishedAt : g!.publishedAt;
  const guideType = isSanity ? sg!.guideType : g!.guideType;
  const city = isSanity ? sg!.city : g!.city;
  const region = isSanity ? sg!.region : g!.region;
  const readingTimeMinutes = isSanity ? sg!.readingTimeMinutes : g!.readingTimeMinutes;
  const locationIds = isSanity ? sg!.locationIds || [] : g!.locationIds || [];
  const slug = isSanity ? sg!.slug : g!.id;
  const featuredImage = isSanity ? sg!.featuredImage?.url || "" : g!.featuredImage;
  const author: string | SanityAuthor = isSanity ? sg!.author : g!.author;
  const authorName = typeof author === "string" ? author : author.name;

  const dateLabel = publishedAt
    ? new Date(publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const metaParts = [
    GUIDE_TYPE_LABELS[guideType],
    city || region,
    readingTimeMinutes ? `${readingTimeMinutes} min read` : null,
  ].filter(Boolean);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/b/guides");
    }
  }, [router]);

  return (
    <article className="min-h-[100dvh]">
      {/* Hero */}
      <div className="relative w-full h-[50vh] min-h-[320px] max-h-[480px] overflow-hidden">
        {featuredImage ? (
          <motion.div
            className="absolute inset-0"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image
              src={featuredImage}
              alt={title}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
          </motion.div>
        ) : (
          <div className="h-full w-full bg-[var(--surface)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-charcoal/20 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 pb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              {metaParts.join(" \u00b7 ")}
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl lg:text-5xl leading-tight">
              {title}
            </h1>
          </div>
        </div>
      </div>

      {/* Sticky back bar */}
      <div
        className="sticky z-30 border-b border-[var(--border)] bg-white"
        style={{ top: "var(--header-h)" }}
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 flex items-center gap-3 h-12">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:text-[var(--foreground)] transition shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Guides
          </button>
          <span className="text-[var(--border)]">|</span>
          <p className="text-sm text-[var(--muted-foreground)] truncate">{title}</p>
        </div>
      </div>

      {/* Preamble */}
      <motion.section className="bg-white border-b border-[var(--border)]" {...sectionReveal}>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3 max-w-2xl">
              <p className="text-base text-[var(--foreground-body)] leading-relaxed">
                {summary}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted-foreground)]">
                {authorName && <span>By {authorName}</span>}
                {dateLabel && (
                  <>
                    <span className="text-[var(--border)]">&middot;</span>
                    <span>{dateLabel}</span>
                  </>
                )}
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Bookmark */}
            <button
              type="button"
              onClick={() => toggleBookmark(guideId)}
              disabled={isToggling}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 ${
                bookmarked
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--border)]"
              }`}
            >
              <svg
                className={`h-4 w-4 ${bookmarked ? "fill-white" : "fill-none stroke-current"}`}
                viewBox="0 0 24 24"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              {bookmarked ? "Bookmarked" : "Bookmark"}
            </button>
          </div>
        </div>
      </motion.section>

      {/* Body content */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
          {isSanity ? (
            <PortableTextBodyB body={sg!.body} />
          ) : (
            <GuideContentB body={g!.body || ""} />
          )}
        </div>
      </section>

      {/* Linked locations */}
      {locations.length > 0 && (
        <section className="border-t border-[var(--border)] bg-[var(--background)]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
            <motion.h2
              className="text-xl font-bold text-[var(--foreground)]"
              {...sectionReveal}
            >
              Places in this guide
            </motion.h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {locations.map((loc, i) => (
                <motion.div
                  key={loc.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.08, ease: bEase }}
                >
                  <Link
                    href={`/b/places/${loc.id}`}
                    className="flex items-center gap-4 rounded-2xl bg-white p-4 transition-shadow hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    {(loc.primaryPhotoUrl || loc.image) && (
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                        <Image
                          src={loc.primaryPhotoUrl || loc.image || ""}
                          alt={loc.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                        {loc.name}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {loc.city}{loc.region ? `, ${loc.region}` : ""}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Plan CTA */}
      {locationIds.length > 0 && (
        <motion.section className="bg-white border-t border-[var(--border)]" {...sectionReveal}>
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 text-center">
            <h2 className="text-2xl font-bold text-[var(--foreground)]">
              Build a trip from this guide
            </h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Turn these locations into a personalized itinerary.
            </p>
            <Link
              href={`/b/trip-builder?from=guide&slug=${slug}`}
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[var(--primary)] px-8 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-elevated)] hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            >
              Build My Itinerary
            </Link>
          </div>
        </motion.section>
      )}

      {/* Related guide */}
      {relatedGuide && (
        <section className="border-t border-[var(--border)] bg-[var(--background)]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
            <motion.p
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
              {...sectionReveal}
            >
              Read next
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: 0.1, ease: bEase }}
              whileHover={{ y: -3, transition: { type: "spring", stiffness: 300, damping: 20 } }}
            >
              <Link
                href={`/b/guides/${relatedGuide.id}`}
                className="group mt-4 flex items-center gap-6 rounded-2xl bg-white p-6 transition-shadow hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                {(relatedGuide.thumbnailImage || relatedGuide.featuredImage) && (
                  <div className="relative hidden h-24 w-36 shrink-0 overflow-hidden rounded-xl sm:block">
                    <Image
                      src={relatedGuide.thumbnailImage || relatedGuide.featuredImage || ""}
                      alt={relatedGuide.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      sizes="144px"
                    />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                    {relatedGuide.title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)] line-clamp-2">
                    {relatedGuide.summary}
                  </p>
                </div>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* Footer */}
      <section className="bg-white border-t border-[var(--border)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            Written by {authorName}
            {dateLabel ? ` \u00b7 Published ${dateLabel}` : ""}
          </p>
          <Link
            href="/b/guides"
            className="mt-4 inline-flex text-sm font-medium text-[var(--primary)] hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          >
            &larr; All guides
          </Link>
        </div>
      </section>
    </article>
  );
}
