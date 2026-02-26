"use client";

import Image from "next/image";
import Link from "next/link";
import type { ExperienceType } from "@/types/experience";
import type { ExperienceSummary } from "@/types/experience";

const EXPERIENCE_TYPE_LABELS: Record<ExperienceType, string> = {
  workshop: "Workshop",
  cruise: "Cruise",
  tour: "Tour",
  experience: "Experience",
  adventure: "Adventure",
  rental: "Rental",
};

type ExperienceFooterProps = {
  authorName: string;
  publishedAt?: string;
  relatedExperiences: ExperienceSummary[];
};

export function ExperienceFooter({
  authorName,
  publishedAt,
  relatedExperiences,
}: ExperienceFooterProps) {
  return (
    <footer className="pb-12 sm:pb-20 lg:pb-28">
      {/* Sign-off */}
      <div className="mx-auto max-w-2xl px-6">
        <div className="border-t border-border/50 pt-8">
          <p className="font-mono text-xs uppercase tracking-wide text-stone">
            Written by {authorName}
            {publishedAt && (
              <>
                {" \u00b7 "}
                {new Date(publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Related experiences */}
      {relatedExperiences.length > 0 && (
        <div className="mx-auto mt-16 max-w-5xl px-6">
          <p className="mb-6 font-mono text-xs uppercase tracking-wide text-stone">
            More Like This
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedExperiences.map((related) => (
              <Link
                key={related._id}
                href={`/experiences/${related.slug}`}
                className="group relative block overflow-hidden rounded-xl"
              >
                <div className="relative aspect-[4/3] w-full bg-charcoal">
                  {related.featuredImage?.url && (
                    <Image
                      src={related.featuredImage.url}
                      alt={related.title}
                      fill
                      className="object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.04]"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-charcoal/20 to-transparent transition-opacity duration-500 group-hover:opacity-50" />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/10 via-transparent to-transparent" />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="mb-1.5 font-mono text-[10px] uppercase tracking-ultra text-white/50">
                    {EXPERIENCE_TYPE_LABELS[related.experienceType]}
                    {related.city && ` \u00b7 ${related.city}`}
                    {related.duration && ` \u00b7 ${related.duration}`}
                  </p>
                  <h3 className="font-serif text-lg italic text-white sm:text-xl transition-colors group-hover:text-brand-primary">
                    {related.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Back to experiences */}
      <div className="mx-auto mt-12 max-w-2xl px-6 text-center">
        <Link
          href="/experiences"
          className="link-reveal inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-stone transition-colors hover:text-foreground"
          aria-label="Back to all experiences"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          All Experiences
        </Link>
      </div>
    </footer>
  );
}
