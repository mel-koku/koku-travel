"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { PagesContent } from "@/types/sanitySiteContent";

type ExploreIntroProps = {
  totalCount: number;
  content?: PagesContent;
};

export function ExploreIntro({ totalCount, content }: ExploreIntroProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-2 sm:pt-20 sm:pb-3 lg:pt-24 text-center">
      <p className="font-mono text-xs uppercase tracking-ultra text-stone">
        {totalCount.toLocaleString()} places across Japan
      </p>

      <ScrollReveal delay={0.1} distance={20} duration={0.5}>
        <h1 className="mt-4 font-serif italic text-[clamp(2rem,4vw,3rem)] leading-[1.1] text-foreground max-w-3xl mx-auto">
          {content?.exploreHeading ?? "Temples, backstreets, and the restaurants your guidebook missed."}
        </h1>
      </ScrollReveal>

      <ScrollReveal delay={0.2} distance={20} duration={0.5}>
        <p className="text-base text-foreground-secondary max-w-2xl mx-auto mt-6 leading-relaxed">
          {content?.exploreSubtitle ?? "Search by name, refine by category and region, or ask Koku for personalized picks."}
        </p>
      </ScrollReveal>
    </section>
  );
}
