"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAppState } from "@/state/AppState";
import { useBookmarks } from "@/hooks/useBookmarksQuery";
import { PortableTextBodyC } from "./PortableTextBodyC";
import { GuideContentC } from "./GuideContentC";
import { GuideCardC } from "./GuideCardC";
import { fadeUp } from "@c/ui/motionC";
import type { Guide, GuideSummary } from "@/types/guide";
import type { SanityGuide, SanityAuthor } from "@/types/sanityGuide";
import type { Location } from "@/types/location";

const GUIDE_TYPE_LABELS: Record<string, string> = {
  itinerary: "Itinerary",
  listicle: "Top Picks",
  deep_dive: "Deep Dive",
  seasonal: "Seasonal",
  activity: "Activity",
  blog: "Blog",
};

type GuideDetailClientCProps =
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

export function GuideDetailClientC(props: GuideDetailClientCProps) {
  const { locations, relatedGuide = null, source } = props;
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
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
  const authorSlug = typeof author !== "string" ? author.slug : undefined;
  const authorPhoto = typeof author !== "string" ? author.photo?.url : undefined;

  const dateLabel = publishedAt
    ? new Date(publishedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
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
      router.push("/c/guides");
    }
  }, [router]);

  return (
    <article className="min-h-[100dvh] bg-[var(--background)]">
      {/* Hero */}
      <div className="relative w-full overflow-hidden" style={{ height: "clamp(320px, 55vh, 560px)" }}>
        {featuredImage ? (
          <Image
            src={featuredImage}
            alt={title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="h-full w-full bg-[var(--surface)]" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Hero content */}
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-[1400px] px-6 lg:px-10 pb-10">
            <motion.p
              initial={prefersReducedMotion ? undefined : "hidden"}
              animate="visible"
              variants={fadeUp(0)}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70"
            >
              {metaParts.join(" / ")}
            </motion.p>
            <motion.h1
              initial={prefersReducedMotion ? undefined : "hidden"}
              animate="visible"
              variants={fadeUp(0.1)}
              className="mt-4 max-w-3xl text-white"
              style={{
                fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                fontSize: "clamp(1.75rem, 4vw, 3.5rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}
            >
              {title}
            </motion.h1>
          </div>
        </div>
      </div>

      {/* Sticky back bar */}
      <div
        className="sticky z-30 border-b border-[var(--border)] bg-[var(--background)]"
        style={{ top: "var(--header-h)" }}
      >
        <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-3 px-6 lg:px-10">
          <button
            type="button"
            onClick={handleBack}
            className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--primary)] transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Guides
          </button>
          <div className="h-4 w-px bg-[var(--border)]" />
          <p className="truncate text-sm text-[var(--muted-foreground)]">{title}</p>
        </div>
      </div>

      {/* Preamble */}
      <motion.section
        initial={prefersReducedMotion ? undefined : "hidden"}
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp(0)}
        className="border-b border-[var(--border)] bg-[var(--background)]"
      >
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="max-w-2xl space-y-5">
              {/* Summary */}
              <p className="text-base leading-relaxed text-[var(--muted-foreground)] lg:text-lg">
                {summary}
              </p>

              {/* Author + date row */}
              <div className="flex items-center gap-3">
                {authorPhoto && (
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={authorPhoto}
                      alt={authorName || "Author"}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--muted-foreground)]">
                  {authorName && (
                    <span>
                      By{" "}
                      {authorSlug ? (
                        <Link
                          href={`/c/guides/authors/${authorSlug}`}
                          className="font-bold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
                        >
                          {authorName}
                        </Link>
                      ) : (
                        <span className="font-bold text-[var(--foreground)]">{authorName}</span>
                      )}
                    </span>
                  )}
                  {dateLabel && (
                    <>
                      <div className="h-3.5 w-px bg-[var(--border)]" />
                      <span>{dateLabel}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Bookmark button */}
            <button
              type="button"
              onClick={() => toggleBookmark(guideId)}
              disabled={isToggling}
              className={`flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 ${
                bookmarked
                  ? "bg-[var(--primary)] text-white"
                  : "border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--surface)]"
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
      <section className="bg-[var(--background)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-16">
          {isSanity ? (
            <PortableTextBodyC body={sg!.body} />
          ) : (
            <GuideContentC body={g!.body || ""} />
          )}
        </div>
      </section>

      {/* Linked locations */}
      {locations.length > 0 && (
        <section className="border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-16">
            <motion.h2
              initial={prefersReducedMotion ? undefined : "hidden"}
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp(0)}
              className="text-xl font-bold text-[var(--foreground)]"
              style={{ letterSpacing: "-0.03em" }}
            >
              Places in this guide
            </motion.h2>
            <div className="mt-8 grid gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2">
              {locations.map((loc, i) => (
                <motion.div
                  key={loc.id}
                  initial={prefersReducedMotion ? undefined : "hidden"}
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  variants={fadeUp(Math.min(i, 5) * 0.06)}
                >
                  <Link
                    href={`/c/places/${loc.id}`}
                    className="flex items-center gap-4 bg-[var(--background)] p-4 transition-colors hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
                  >
                    {(loc.primaryPhotoUrl || loc.image) && (
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-[var(--border)]">
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
                      <p className="text-sm font-bold text-[var(--foreground)] truncate">
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
        <motion.section
          initial={prefersReducedMotion ? undefined : "hidden"}
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp(0)}
          className="border-t border-[var(--border)] bg-[var(--background)]"
        >
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-16">
            <h2
              className="text-2xl font-bold text-[var(--foreground)]"
              style={{ letterSpacing: "-0.03em" }}
            >
              Build a trip from this guide
            </h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Turn these locations into a personalized itinerary.
            </p>
            <Link
              href={`/c/trip-builder?from=guide&slug=${slug}`}
              className="mt-6 inline-flex h-11 items-center justify-center bg-[var(--primary)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            >
              Build My Itinerary
            </Link>
          </div>
        </motion.section>
      )}

      {/* Related guide */}
      {relatedGuide && (
        <section className="border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-16">
            <motion.p
              initial={prefersReducedMotion ? undefined : "hidden"}
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp(0)}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]"
            >
              Read next
            </motion.p>
            <motion.div
              initial={prefersReducedMotion ? undefined : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp(0.1)}
              className="mt-6 max-w-lg"
            >
              <div className="border border-[var(--border)] bg-[var(--background)]">
                <GuideCardC guide={relatedGuide} index={0} eager={false} />
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Footer */}
      <section className="border-t border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-10">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--muted-foreground)]">
              Written by{" "}
              {authorSlug ? (
                <Link
                  href={`/c/guides/authors/${authorSlug}`}
                  className="font-bold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
                >
                  {authorName}
                </Link>
              ) : (
                <span className="font-bold text-[var(--foreground)]">{authorName}</span>
              )}
              {dateLabel ? ` / Published ${dateLabel}` : ""}
            </p>
            <Link
              href="/c/guides"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--primary)] transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              All Guides
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
