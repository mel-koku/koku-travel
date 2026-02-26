"use client";

import Image from "next/image";
import Link from "next/link";
import { useAppState } from "@/state/AppState";
import { useBookmarks } from "@/hooks/useBookmarksQuery";
import { PortableTextBody } from "@/components/features/guides/PortableTextBody";
import type { SanityExperience } from "@/types/sanityExperience";
import type { ExperienceSummary } from "@/types/experience";
import type { Location } from "@/types/location";

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Easy",
  moderate: "Moderate",
  challenging: "Challenging",
};

type ExperienceDetailClientBProps = {
  experience: SanityExperience;
  relatedExperiences: ExperienceSummary[];
  locations?: Location[];
};

export function ExperienceDetailClientB({
  experience,
  relatedExperiences,
  locations = [],
}: ExperienceDetailClientBProps) {
  const { user } = useAppState();
  const { isBookmarked, toggleBookmark, isToggling } = useBookmarks(user?.id);

  const bookmarkId = `exp-${experience.slug}`;
  const bookmarked = isBookmarked(bookmarkId);
  const authorName = typeof experience.author === "string" ? experience.author : experience.author.name;
  const featuredImage = experience.featuredImage?.url || "";

  const dateLabel = experience.publishedAt
    ? new Date(experience.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const quickFacts = [
    experience.duration && { label: "Duration", value: experience.duration },
    (experience.groupSizeMin || experience.groupSizeMax) && {
      label: "Group size",
      value: experience.groupSizeMin && experience.groupSizeMax
        ? `${experience.groupSizeMin}–${experience.groupSizeMax}`
        : experience.groupSizeMax
          ? `Up to ${experience.groupSizeMax}`
          : `${experience.groupSizeMin}+`,
    },
    experience.difficulty && { label: "Difficulty", value: DIFFICULTY_LABELS[experience.difficulty] || experience.difficulty },
    experience.estimatedCost && { label: "Cost", value: experience.estimatedCost },
    experience.bestSeason && { label: "Best season", value: experience.bestSeason },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <article className="min-h-[100dvh]">
      {/* Hero */}
      <div className="relative w-full h-[50vh] min-h-[320px] max-h-[480px] overflow-hidden">
        {featuredImage ? (
          <Image
            src={featuredImage}
            alt={experience.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="h-full w-full bg-[var(--surface)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-charcoal/20 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 pb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              {experience.experienceType} {experience.city ? `· ${experience.city}` : ""}
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl lg:text-5xl leading-tight">
              {experience.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Quick Facts */}
      {quickFacts.length > 0 && (
        <section className="bg-white border-b border-[var(--border)]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-wrap gap-3 sm:gap-6">
              {quickFacts.map((fact) => (
                <div key={fact.label}>
                  <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                    {fact.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Preamble */}
      <section className="bg-white border-b border-[var(--border)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3 max-w-2xl">
              <p className="text-base text-[var(--foreground-body)] leading-relaxed">
                {experience.summary}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted-foreground)]">
                {authorName && <span>By {authorName}</span>}
                {dateLabel && (
                  <>
                    <span className="text-[var(--border)]">·</span>
                    <span>{dateLabel}</span>
                  </>
                )}
              </div>
              {experience.tags && experience.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {experience.tags.map((tag) => (
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

            <button
              type="button"
              onClick={() => toggleBookmark(bookmarkId)}
              disabled={isToggling}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-[0.98] ${
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
      </section>

      {/* Body */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
          <PortableTextBody body={experience.body} />
        </div>
      </section>

      {/* Practical info */}
      {(experience.whatsIncluded || experience.whatToBring || experience.meetingPoint || experience.nearestStation) && (
        <section className="border-t border-[var(--border)] bg-[var(--background)]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="text-xl font-bold text-[var(--foreground)]">Practical Information</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {experience.whatsIncluded && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]">What&apos;s included</p>
                  <p className="mt-2 text-sm text-[var(--foreground-body)]">{experience.whatsIncluded}</p>
                </div>
              )}
              {experience.whatToBring && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]">What to bring</p>
                  <p className="mt-2 text-sm text-[var(--foreground-body)]">{experience.whatToBring}</p>
                </div>
              )}
              {experience.meetingPoint && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]">Meeting point</p>
                  <p className="mt-2 text-sm text-[var(--foreground-body)]">{experience.meetingPoint}</p>
                </div>
              )}
              {experience.nearestStation && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]">Nearest station</p>
                  <p className="mt-2 text-sm text-[var(--foreground-body)]">{experience.nearestStation}</p>
                </div>
              )}
            </div>
            {experience.bookingUrl && (
              <a
                href={experience.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-6 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]"
              >
                Book this experience
              </a>
            )}
          </div>
        </section>
      )}

      {/* Linked locations */}
      {locations.length > 0 && (
        <section className="border-t border-[var(--border)] bg-white">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              Places featured
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {locations.map((loc) => (
                <Link
                  key={loc.id}
                  href={`/b/places/${loc.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-white p-4 transition-shadow hover:shadow-[var(--shadow-elevated)]"
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
                    <p className="text-sm font-semibold text-[var(--foreground)] truncate">{loc.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {loc.city}{loc.region ? `, ${loc.region}` : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Plan CTA */}
      {(experience.locationIds?.length ?? 0) > 0 && (
        <section className="bg-[var(--background)] border-t border-[var(--border)]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 text-center">
            <h2 className="text-2xl font-bold text-[var(--foreground)]">
              Build a trip from this experience
            </h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Turn these locations into a personalized itinerary.
            </p>
            <Link
              href={`/b/trip-builder?from=experience&slug=${experience.slug}`}
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[var(--primary)] px-8 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]"
            >
              Build My Itinerary
            </Link>
          </div>
        </section>
      )}

      {/* Related experiences */}
      {relatedExperiences.length > 0 && (
        <section className="border-t border-[var(--border)] bg-white">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
              More like this
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {relatedExperiences.map((exp) => (
                <Link
                  key={exp._id}
                  href={`/b/experiences/${exp.slug}`}
                  className="group block rounded-2xl bg-white overflow-hidden transition-shadow hover:shadow-[var(--shadow-elevated)]"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  {(exp.thumbnailImage?.url || exp.featuredImage?.url) && (
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <Image
                        src={exp.thumbnailImage?.url || exp.featuredImage?.url || ""}
                        alt={exp.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        sizes="(min-width: 640px) 33vw, 100vw"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                      {exp.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {exp.city} {exp.duration ? `· ${exp.duration}` : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <section className="bg-[var(--background)] border-t border-[var(--border)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            By {authorName}
            {dateLabel ? ` · Published ${dateLabel}` : ""}
          </p>
          <Link
            href="/b/experiences"
            className="mt-4 inline-flex text-sm font-medium text-[var(--primary)] hover:underline"
          >
            ← All experiences
          </Link>
        </div>
      </section>
    </article>
  );
}
