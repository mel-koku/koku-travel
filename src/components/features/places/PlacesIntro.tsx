"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { PagesContent } from "@/types/sanitySiteContent";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";

type PlacesIntroProps = {
  totalCount?: number;
  content?: PagesContent;
  children?: React.ReactNode;
};

export function PlacesIntro({ content, children }: PlacesIntroProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-4 sm:pt-12 sm:pb-6 lg:pt-16 text-center">
      <ScrollReveal delay={0.1} distance={20} duration={0.5}>
        <h1 className={cn(typography({ intent: "editorial-h1" }), "text-[clamp(2rem,4vw,3rem)] max-w-3xl mx-auto")}>
          {content?.placesHeading ?? "Every place worth knowing about, in one collection."}
        </h1>
      </ScrollReveal>

      {children && (
        <ScrollReveal delay={0.15} distance={20} duration={0.5}>
          <div className="mt-6">{children}</div>
        </ScrollReveal>
      )}
    </section>
  );
}
