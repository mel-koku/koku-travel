"use client";

import { useState, useMemo } from "react";
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
        <SplitText
          as="p"
          className="justify-center font-serif italic text-lg text-foreground"
          splitBy="word"
          animation="clipY"
          staggerDelay={0.06}
        >
          Experiences are on the way
        </SplitText>
        <ScrollReveal delay={0.3} distance={15}>
          <p className="mt-2 text-sm text-stone text-center max-w-sm">
            We&apos;re curating immersive Japan experiences. Check back soon.
          </p>
        </ScrollReveal>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <section className="py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <SplitText
            as="h1"
            className="justify-center font-serif text-4xl italic text-foreground sm:text-5xl lg:text-6xl"
            splitBy="word"
            animation="clipY"
            staggerDelay={0.06}
          >
            Experiences
          </SplitText>
          <ScrollReveal delay={0.3} distance={15}>
            <p className="mx-auto mt-4 max-w-xl text-lg text-foreground-secondary">
              Hands-on workshops, cultural immersions, and unforgettable moments across Japan.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Filter Bar */}
      {filterTypes.length > 1 && (
        <div className="sticky top-20 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setSelectedType(null)}
              className={`shrink-0 rounded-xl px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors ${
                selectedType === null
                  ? "bg-foreground text-background"
                  : "text-stone hover:text-foreground"
              }`}
            >
              All ({experiences.length})
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
                className={`shrink-0 rounded-xl px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors ${
                  selectedType === type.value
                    ? "bg-foreground text-background"
                    : "text-stone hover:text-foreground"
                }`}
              >
                {type.label} ({type.count})
              </button>
            ))}
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
