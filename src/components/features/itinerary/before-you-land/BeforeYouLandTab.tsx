"use client";

import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { CulturalBriefing } from "@/types/culturalBriefing";
import { PillarSection } from "./PillarSection";

function normalizeProse(s: string): string {
  return s.replace(/\s*(?:--|—)\s*/g, ". ");
}

type BeforeYouLandTabProps = {
  briefing: CulturalBriefing;
};

export function BeforeYouLandTab({ briefing }: BeforeYouLandTabProps) {
  const pillarCount = briefing.pillars.length;

  return (
    <article className="pb-20">
      {/* Hero lede */}
      <ScrollReveal>
        <header className="pt-4 pb-14">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground-secondary mb-6">
            A primer
          </div>
          <h1
            className={cn(
              typography({ intent: "editorial-hero" }),
              "mb-8 leading-[0.95]",
            )}
          >
            The Japanese
            <br />
            Way.
          </h1>
          <p
            className={cn(
              typography({ intent: "editorial-prose" }),
              "max-w-[54ch]",
            )}
          >
            {normalizeProse(briefing.intro)}
          </p>
        </header>
      </ScrollReveal>

      {/* Pillars — one editorial chapter each */}
      <div>
        {briefing.pillars.map((pillar, index) => (
          <PillarSection
            key={pillar.slug}
            pillar={pillar}
            index={index}
            total={pillarCount}
          />
        ))}
      </div>
    </article>
  );
}
