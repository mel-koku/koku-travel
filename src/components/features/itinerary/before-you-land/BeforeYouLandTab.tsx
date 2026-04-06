"use client";

import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { CulturalBriefing } from "@/types/culturalBriefing";
import { PillarCard } from "./PillarCard";

type BeforeYouLandTabProps = {
  briefing: CulturalBriefing;
};

export function BeforeYouLandTab({ briefing }: BeforeYouLandTabProps) {
  return (
    <div className="space-y-6 py-6">
      <ScrollReveal>
        <div className="rounded-lg bg-canvas px-5 py-6">
          <p className="eyebrow-mono mb-2">Before You Land</p>
          <h2 className={cn(typography({ intent: "editorial-h2" }), "mb-3")}>
            The Japanese Way
          </h2>
          <p className={typography({ intent: "utility-body-muted" })}>
            {briefing.intro}
          </p>
        </div>
      </ScrollReveal>

      <div className="space-y-4">
        {briefing.pillars.map((pillar, index) => (
          <ScrollReveal key={pillar.slug} delay={index * 0.08}>
            <PillarCard
              pillar={pillar}
              defaultExpanded={index === 0}
            />
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
