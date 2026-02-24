"use client";

import Link from "next/link";

import { ExperienceCard } from "@/components/features/experiences/ExperienceCard";
import type { ExperienceSummary } from "@/types/experience";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type FeaturedExperiencesProps = {
  experiences: ExperienceSummary[];
  content?: LandingPageContent;
};

export function FeaturedExperiences({
  experiences,
  content,
}: FeaturedExperiencesProps) {
  if (experiences.length === 0) {
    return null;
  }

  return (
    <section className="bg-canvas py-12 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <div className="mb-10 flex flex-col gap-6 sm:mb-16 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow-editorial text-brand-primary">
              {content?.featuredExperiencesEyebrow ?? "Experiences"}
            </p>
            <h2 className="mt-4 font-serif italic text-3xl tracking-heading text-foreground sm:text-4xl">
              {content?.featuredExperiencesHeading ?? "Go beyond sightseeing"}
            </h2>
            <p className="mt-4 max-w-md text-base text-foreground-secondary">
              {content?.featuredExperiencesDescription ??
                "Workshops, cruises, and adventures where you're a participant — not a tourist."}
            </p>
          </div>
          <Link
            href="/experiences"
            className="link-reveal group inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-foreground transition-colors hover:text-brand-primary"
          >
            {content?.featuredExperiencesCtaText ?? "Browse experiences"}
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>

        {/* Grid — show 2 on mobile, full set on sm+ */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {experiences.map((experience, idx) => (
            <div
              key={experience._id}
              className={idx >= 2 ? "hidden sm:block" : undefined}
            >
              <ExperienceCard
                experience={experience}
                index={idx}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
