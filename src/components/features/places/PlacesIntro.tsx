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
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary">
        {totalCount.toLocaleString()} places across Japan
      </p>

      <ScrollReveal delay={0.1} distance={20} duration={0.5}>
        <h1 className="mt-4 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.1] text-foreground max-w-3xl mx-auto">
          {content?.placesHeading ?? "Every place worth knowing about, in one collection."}
        </h1>
      </ScrollReveal>

      <ScrollReveal delay={0.2} distance={20} duration={0.5}>
        <p className="text-base text-foreground-secondary max-w-2xl mx-auto mt-6 leading-relaxed">
          {content?.placesSubtitle ?? "Temples, restaurants, hidden gems \u2014 searched, filtered, and saved for your trip."}
        </p>
      </ScrollReveal>
    </section>
  );
}
