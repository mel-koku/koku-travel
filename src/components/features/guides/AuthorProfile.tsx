"use client";

import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { SanityAuthorFull } from "@/types/sanityGuide";
import type { GuideType } from "@/types/guide";

const GUIDE_TYPE_LABELS: Record<GuideType, string> = {
  itinerary: "Itinerary",
  listicle: "Top Picks",
  deep_dive: "Deep Dive",
  seasonal: "Seasonal",
};

type AuthorProfileProps = {
  author: SanityAuthorFull;
};

export function AuthorProfile({ author }: AuthorProfileProps) {
  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <section className="pb-16 pt-32 sm:pt-40">
        <div className="mx-auto max-w-3xl px-6">
          <ScrollReveal distance={30}>
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-8">
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
                <div className="mb-6 flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary sm:mb-0">
                  <span className="font-serif text-4xl italic">
                    {author.name.charAt(0)}
                  </span>
                </div>
              )}

              <div>
                <h1 className="font-serif text-3xl italic text-foreground sm:text-4xl">
                  {author.name}
                </h1>
                {author.city && (
                  <p className="mt-2 font-mono text-xs uppercase tracking-wide text-stone">
                    Based in {author.city}
                  </p>
                )}
                {author.bio && (
                  <p className="mt-4 text-lg leading-relaxed text-foreground-secondary">
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
                        className="text-stone hover:text-foreground transition-colors"
                      >
                        <span className="font-mono text-xs uppercase tracking-wide">Twitter</span>
                      </a>
                    )}
                    {author.socialLinks.instagram && (
                      <a
                        href={author.socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-stone hover:text-foreground transition-colors"
                      >
                        <span className="font-mono text-xs uppercase tracking-wide">Instagram</span>
                      </a>
                    )}
                    {author.socialLinks.website && (
                      <a
                        href={author.socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-stone hover:text-foreground transition-colors"
                      >
                        <span className="font-mono text-xs uppercase tracking-wide">Website</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Guides */}
      {author.guides.length > 0 && (
        <section className="pb-12 sm:pb-20 lg:pb-28">
          <div className="mx-auto max-w-5xl px-6">
            <ScrollReveal distance={20}>
              <h2 className="font-serif text-2xl italic text-foreground mb-8">
                Published Guides
              </h2>
            </ScrollReveal>

            <div className="grid gap-6 sm:grid-cols-2">
              {author.guides.map((guide, i) => (
                <ScrollReveal key={guide._id} distance={30} delay={i * 0.08}>
                  <Link
                    href={`/guides/${guide.slug}`}
                    className="group block overflow-hidden rounded-xl border border-border/50 bg-surface transition-all hover:border-brand-primary/30 hover:shadow-lg"
                  >
                    {guide.featuredImage && (
                      <div className="relative aspect-[16/9] overflow-hidden">
                        <Image
                          src={guide.featuredImage}
                          alt={guide.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                          sizes="(min-width: 640px) 50vw, 100vw"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-ultra text-stone">
                        {GUIDE_TYPE_LABELS[guide.guideType]}
                        {guide.city && ` · ${guide.city}`}
                        {guide.readingTimeMinutes &&
                          ` · ${guide.readingTimeMinutes} min`}
                      </p>
                      <h3 className="font-serif text-lg italic text-foreground group-hover:text-brand-primary transition-colors">
                        {guide.title}
                      </h3>
                      {guide.summary && (
                        <p className="mt-2 text-sm text-foreground-secondary line-clamp-2">
                          {guide.summary}
                        </p>
                      )}
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Back link */}
      <div className="mx-auto max-w-2xl px-6 pb-20 text-center">
        <Link
          href="/guides/authors"
          className="link-reveal inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-stone transition-colors hover:text-foreground"
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
