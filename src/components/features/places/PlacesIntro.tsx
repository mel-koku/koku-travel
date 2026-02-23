"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { PagesContent } from "@/types/sanitySiteContent";

type PlacesIntroProps = {
  totalCount: number;
  content?: PagesContent;
};

export function PlacesIntro({ totalCount, content }: PlacesIntroProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-4 sm:pt-20 sm:pb-6 lg:pt-28 text-center">
      <p className="font-mono text-xs uppercase tracking-ultra text-stone">
        {totalCount.toLocaleString()} places across Japan
      </p>

      <ScrollReveal delay={0.1} distance={20} duration={0.5}>
        <h1 className="mt-4 font-serif italic text-[clamp(2rem,4vw,3rem)] leading-[1.1] text-foreground max-w-3xl mx-auto">
          {content?.placesHeading ?? "Temples, backstreets, and the restaurants your guidebook missed."}
        </h1>
      </ScrollReveal>

      <ScrollReveal delay={0.2} distance={20} duration={0.5}>
        <p className="text-base text-foreground-secondary max-w-2xl mx-auto mt-6 leading-relaxed">
          {content?.placesSubtitle ?? "Search by name, paste a YouTube, TikTok, or Instagram link to identify the place, refine by category and region, or ask Koku for recommendations."}
        </p>
      </ScrollReveal>
    </section>
  );
}
