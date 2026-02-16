"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/cn";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ExperienceCard } from "./ExperienceCard";
import type { ExperienceSummary, ExperienceType } from "@/types/experience";
import type { PagesContent } from "@/types/sanitySiteContent";

type ExperiencesPageClientProps = {
  experiences: ExperienceSummary[];
  content?: PagesContent;
};

const EXPERIENCE_TYPE_OPTIONS: { value: ExperienceType; label: string }[] = [
  { value: "workshop", label: "Workshop" },
  { value: "cruise", label: "Cruise" },
  { value: "tour", label: "Tour" },
  { value: "experience", label: "Cultural" },
  { value: "adventure", label: "Adventure" },
  { value: "rental", label: "Rental" },
];

export function ExperiencesPageClient({ experiences, content }: ExperiencesPageClientProps) {
  const [selectedType, setSelectedType] = useState<ExperienceType | null>(null);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    experiences.forEach((e) => {
      counts[e.experienceType] = (counts[e.experienceType] || 0) + 1;
    });
    return counts;
  }, [experiences]);

  const filterTypes = useMemo(
    () =>
      EXPERIENCE_TYPE_OPTIONS.filter((o) => (typeCounts[o.value] || 0) > 0).map(
        (o) => ({
          value: o.value,
          label: o.label,
          count: typeCounts[o.value] || 0,
        })
      ),
    [typeCounts]
  );

  const filteredExperiences = useMemo(() => {
    if (!selectedType) return experiences;
    return experiences.filter((e) => e.experienceType === selectedType);
  }, [experiences, selectedType]);

  if (experiences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4">
        <p className="font-serif italic text-lg text-foreground">
          {content?.experiencesEmptyHeading ?? "Experiences are in the works"}
        </p>
        <p className="mt-2 text-sm text-stone text-center max-w-sm">
          {content?.experiencesEmptyDescription ?? "We're putting these together now. Browse places while you wait."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Editorial Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-6 sm:pt-20 sm:pb-8 lg:pt-24 text-center">
        <p className="font-mono text-xs uppercase tracking-ultra text-stone mb-3">
          {experiences.length} experiences across Japan
        </p>

        <ScrollReveal delay={0.1} distance={20} duration={0.5}>
          <h1 className="font-serif italic text-[clamp(2rem,4vw,3rem)] leading-[1.1] text-foreground max-w-3xl mx-auto">
            {content?.experiencesHeading ?? "Workshops, cruises, and the kind of moments you'll talk about for years."}
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.2} distance={20} duration={0.5}>
          <p className="text-base text-foreground-secondary max-w-2xl mx-auto mt-5 leading-relaxed">
            {content?.experiencesDescription ?? "Hands-on moments you won't find in any guidebook."}
          </p>
        </ScrollReveal>
      </section>

      {/* Filter Bar — underline tabs matching Places & Guides */}
      {filterTypes.length > 1 && (
        <div className="sticky top-20 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
              className="overflow-x-auto scrollbar-hide scroll-fade-r overscroll-contain py-3"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <div className="flex gap-1 sm:gap-2 min-w-max">
                <button
                  type="button"
                  onClick={() => setSelectedType(null)}
                  className={cn(
                    "px-4 py-2.5 min-h-[44px] text-sm font-medium tracking-wide whitespace-nowrap border-b-2 transition-all",
                    selectedType === null
                      ? "border-brand-primary text-foreground"
                      : "border-transparent text-stone hover:text-foreground"
                  )}
                >
                  All
                  <span className="ml-1.5 text-xs text-stone">{experiences.length}</span>
                </button>
                {filterTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() =>
                      setSelectedType(
                        selectedType === type.value ? null : type.value
                      )
                    }
                    className={cn(
                      "px-4 py-2.5 min-h-[44px] text-sm font-medium tracking-wide whitespace-nowrap border-b-2 transition-all",
                      selectedType === type.value
                        ? "border-brand-primary text-foreground"
                        : "border-transparent text-stone hover:text-foreground"
                    )}
                  >
                    {type.label}
                    <span className="ml-1.5 text-xs text-stone">{type.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <section
        aria-label="Experiences"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-28"
      >
        {filteredExperiences.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
            {filteredExperiences.map((exp, i) => (
              <ExperienceCard key={exp._id} experience={exp} index={i} eager={i < 3} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="font-serif italic text-lg text-foreground">
              {content?.experiencesFilteredEmptyHeading ?? "No experiences of this type yet"}
            </p>
            <p className="mt-2 text-sm text-stone">
              {content?.experiencesFilteredEmptyDescription ?? "Try another filter, or see everything."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
