"use client";

import { SplitText } from "@/components/ui/SplitText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { PagesContent } from "@/types/sanitySiteContent";

type ExploreIntroProps = {
  totalCount: number;
  content?: PagesContent;
};

export function ExploreIntro({ totalCount, content }: ExploreIntroProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 pb-4 sm:pt-36 sm:pb-6">
      <p className="font-mono text-xs uppercase tracking-ultra text-stone mb-4">
        {totalCount.toLocaleString()} places across Japan
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
        {content?.exploreHeading ?? "Every temple, backstreet, and the restaurants your guidebook missed."}
      </SplitText>

      <ScrollReveal delay={0.3} distance={20} duration={0.5}>
        <p className="text-base text-foreground-secondary max-w-2xl mt-6">
          {content?.exploreSubtitle ?? "Filter by what matters. Tap any place to learn more."}
        </p>
      </ScrollReveal>
    </section>
  );
}
