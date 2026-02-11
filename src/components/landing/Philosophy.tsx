"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type PhilosophyProps = {
  locationCount: number;
  content?: LandingPageContent;
};

export function Philosophy({ locationCount, content }: PhilosophyProps) {
  const stats = content?.philosophyStats;

  return (
    <section className="bg-canvas min-h-[50vh]">
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-12 sm:py-20 lg:py-28 text-center">
        {/* Eyebrow */}
        <p className="eyebrow-mono">
          {content?.philosophyEyebrow ?? "Locally sourced, locally verified"}
        </p>

        {/* Heading */}
        <ScrollReveal delay={0.1}>
          <h2 className="mx-auto mt-6 max-w-2xl font-serif italic text-2xl leading-snug tracking-heading text-foreground sm:text-3xl lg:text-4xl">
            {content?.philosophyHeading ??
              "Not from a desk, but from years of living here."}
          </h2>
        </ScrollReveal>

        {/* Stats */}
        <div className="mt-16 flex items-center justify-center gap-x-16 lg:gap-x-24">
          {/* Stat 1 — Places */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <AnimatedNumber
                value={locationCount}
                className="text-[clamp(4rem,10vw,8rem)] font-mono font-light text-foreground leading-none"
              />
              <span className="text-[clamp(2rem,5vw,4rem)] font-mono font-light text-foreground">
                +
              </span>
            </div>
            <p className="eyebrow-mono mt-3">
              {stats?.[0]?.label ?? "Places"}
            </p>
          </div>

          {/* Divider */}
          <div className="h-16 w-px bg-border/30" />

          {/* Stat 2 — Prefectures */}
          <div className="text-center">
            <AnimatedNumber
              value={stats?.[1]?.value ? parseInt(stats[1].value, 10) : 47}
              className="text-[clamp(4rem,10vw,8rem)] font-mono font-light text-foreground leading-none"
            />
            <p className="eyebrow-mono mt-3">
              {stats?.[1]?.label ?? "Prefectures"}
            </p>
          </div>

          {/* Divider */}
          <div className="h-16 w-px bg-border/30" />

          {/* Stat 3 — Local */}
          <div className="text-center">
            <span className="text-[clamp(4rem,10vw,8rem)] font-mono font-light text-foreground leading-none">
              {stats?.[2]?.value ?? "100"}
              {stats?.[2]?.suffix ?? "%"}
            </span>
            <p className="eyebrow-mono mt-3">
              {stats?.[2]?.label ?? "Local"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
