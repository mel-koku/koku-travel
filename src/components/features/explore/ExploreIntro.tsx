"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { PagesContent } from "@/types/sanitySiteContent";

type ExploreIntroProps = {
  totalCount: number;
  content?: PagesContent;
};

export function ExploreIntro({ totalCount, content }: ExploreIntroProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-6 sm:pt-20 sm:pb-8 lg:pt-24 text-center">
      <p className="font-mono text-xs uppercase tracking-ultra text-stone mb-3">
        {totalCount.toLocaleString()} places across Japan
      </p>

      <ScrollReveal delay={0.1} distance={20} duration={0.5}>
        <h1 className="font-serif italic text-[clamp(2rem,4vw,3rem)] leading-[1.1] text-foreground max-w-3xl mx-auto">
          {content?.exploreHeading ?? "Temples, backstreets, and the restaurants your guidebook missed."}
        </h1>
      </ScrollReveal>

      <ScrollReveal delay={0.2} distance={20} duration={0.5}>
        <p className="text-base text-foreground-secondary max-w-2xl mx-auto mt-5 leading-relaxed">
          {content?.exploreSubtitle ?? "Not sure where to start? Ask Koku for recommendations — or filter by category and explore the map."}
        </p>
      </ScrollReveal>
    </section>
  );
}
