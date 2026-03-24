"use client";

import Link from "next/link";

import { ExperienceCard } from "@/components/features/experiences/ExperienceCard";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/utils";
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
    <section aria-label="Featured experiences" className="bg-canvas py-12 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <ScrollReveal direction="right">
          <div>
            <p className="eyebrow-editorial text-brand-primary">
              {content?.featuredExperiencesEyebrow ?? "Experiences"}
            </p>
            <h2 className={cn(typography({ intent: "editorial-h2" }), "mt-4")}>
              {content?.featuredExperiencesHeading ?? "Go beyond sightseeing"}
            </h2>
          </div>
        </ScrollReveal>

        {/* Grid — show 2 on mobile, full set on sm+ */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {experiences.map((experience, idx) => (
            <div
              key={experience._id}
              className={idx >= 2 ? "hidden sm:block" : undefined}
            >
              <ExperienceCard
                experience={experience}
                index={idx}
                compact
              />
            </div>
          ))}
        </div>

        {/* Section CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/guides?type=activity"
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
      </div>
    </section>
  );
}
