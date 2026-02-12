"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/cn";
import { SplitText } from "@/components/ui/SplitText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ExperienceCard } from "./ExperienceCard";
import type { ExperienceSummary, ExperienceType } from "@/types/experience";

type ExperiencesPageClientProps = {
  experiences: ExperienceSummary[];
};

const EXPERIENCE_TYPE_OPTIONS: { value: ExperienceType; label: string }[] = [
  { value: "workshop", label: "Workshop" },
  { value: "cruise", label: "Cruise" },
  { value: "tour", label: "Tour" },
  { value: "experience", label: "Experience" },
  { value: "adventure", label: "Adventure" },
  { value: "rental", label: "Rental" },
];

export function ExperiencesPageClient({ experiences }: ExperiencesPageClientProps) {
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
          Experiences are on the way
        </p>
        <p className="mt-2 text-sm text-stone text-center max-w-sm">
          We&apos;re curating immersive Japan experiences. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Editorial Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 pb-4 sm:pt-36 sm:pb-6">
        <p className="font-mono text-xs uppercase tracking-ultra text-stone mb-4">
          {experiences.length} experiences across Japan
        </p>

        <SplitText
          as="h1"
          className="font-serif italic text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] text-foreground max-w-4xl"
          splitBy="word"
          animation="clipY"
          staggerDelay={0.04}
          duration={0.5}
          delay={0.1}
        >
          The workshops, cruises, and cultural immersions that leave a mark.
        </SplitText>

        <ScrollReveal delay={0.3} distance={20} duration={0.5}>
          <p className="text-base text-foreground-secondary max-w-2xl mt-6">
            Hands-on moments you won&apos;t find in a guidebook. Filter by type and find your next adventure.
          </p>
        </ScrollReveal>
      </section>

      {/* Filter Bar — underline tabs matching Places & Guides */}
      {filterTypes.length > 1 && (
        <div className="sticky top-20 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
              className="overflow-x-auto scrollbar-hide overscroll-contain py-3"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <div className="flex gap-1 sm:gap-2 min-w-max">
                <button
                  type="button"
                  onClick={() => setSelectedType(null)}
                  className={cn(
                    "px-3 py-2.5 min-h-[44px] text-sm font-medium tracking-wide whitespace-nowrap border-b-2 transition-all",
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
                      "px-3 py-2.5 min-h-[44px] text-sm font-medium tracking-wide whitespace-nowrap border-b-2 transition-all",
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
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 sm:gap-10">
            {filteredExperiences.map((exp, i) => (
              <ExperienceCard key={exp._id} experience={exp} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="font-serif italic text-lg text-foreground">
              Nothing here yet
            </p>
            <p className="mt-2 text-sm text-stone">
              Try selecting a different category above.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
