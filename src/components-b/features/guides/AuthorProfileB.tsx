"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { SanityAuthorFull } from "@/types/sanityGuide";
import type { GuideType } from "@/types/guide";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const GUIDE_TYPE_LABELS: Record<GuideType, string> = {
  itinerary: "Itinerary",
  listicle: "Top Picks",
  deep_dive: "Deep Dive",
  seasonal: "Seasonal",
};

type AuthorProfileBProps = {
  author: SanityAuthorFull;
};

export function AuthorProfileB({ author }: AuthorProfileBProps) {
  return (
    <div className="min-h-[100dvh]">
      {/* Header */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-32 lg:pt-36 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: bEase }}
          className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-8"
        >
          {/* Avatar */}
          {author.photo?.url ? (
            <div className="relative mb-6 h-24 w-24 shrink-0 overflow-hidden rounded-full sm:mb-0">
              <Image
                src={author.photo.url}
                alt={author.name}
                fill
                className="object-cover"
                sizes="96px"
                priority
              />
            </div>
          ) : (
            <div className="mb-6 flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--primary)]">
              <span className="text-4xl font-bold">
                {author.name.charAt(0)}
              </span>
            </div>
          )}

          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)] sm:text-4xl tracking-[-0.04em]">
              {author.name}
            </h1>
            {author.city && (
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                Based in {author.city}
              </p>
            )}
            {author.bio && (
              <p className="mt-4 text-base leading-relaxed text-[var(--foreground-body)]">
                {author.bio}
              </p>
            )}

            {/* Social links */}
            {author.socialLinks && (
              <div className="mt-4 flex items-center gap-4 justify-center sm:justify-start">
                {author.socialLinks.twitter && (
                  <a
                    href={author.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                  >
                    Twitter
                  </a>
                )}
                {author.socialLinks.instagram && (
                  <a
                    href={author.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                  >
                    Instagram
                  </a>
                )}
                {author.socialLinks.website && (
                  <a
                    href={author.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                  >
                    Website
                  </a>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </section>

      {/* Guides */}
      {author.guides.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 lg:pb-32">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: bEase }}
            className="text-2xl font-bold text-[var(--foreground)] mb-8 tracking-[-0.02em]"
          >
            Published Guides
          </motion.h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {author.guides.map((guide, i) => (
              <motion.div
                key={guide._id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.6,
                  delay: 0.1 + i * 0.08,
                  ease: bEase,
                }}
                whileHover={{
                  y: -3,
                  transition: {
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  },
                }}
              >
                <Link
                  href={`/b/guides/${guide.slug}`}
                  className="group block overflow-hidden rounded-2xl bg-white transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  {guide.featuredImage && (
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <Image
                        src={guide.featuredImage}
                        alt={guide.title}
                        fill
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                        sizes="(min-width: 640px) 50vw, 100vw"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                      {GUIDE_TYPE_LABELS[guide.guideType]}
                      {guide.city && ` · ${guide.city}`}
                      {guide.readingTimeMinutes &&
                        ` · ${guide.readingTimeMinutes} min`}
                    </p>
                    <h3 className="text-base font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors duration-200">
                      {guide.title}
                    </h3>
                    {guide.summary && (
                      <p className="mt-2 text-sm text-[var(--foreground-body)] line-clamp-2">
                        {guide.summary}
                      </p>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Back link */}
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 pb-20 text-center">
        <Link
          href="/b/guides/authors"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          All Authors
        </Link>
      </div>
    </div>
  );
}
