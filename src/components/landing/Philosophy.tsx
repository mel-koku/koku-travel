"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/utils";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type PhilosophyProps = {
  locationCount: number;
  content?: LandingPageContent;
};

export function Philosophy({ locationCount, content }: PhilosophyProps) {
  const stats = content?.philosophyStats;

  return (
    <section aria-label="Our philosophy" className="bg-canvas min-h-[50vh]">
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-12 sm:py-20 lg:py-28 text-center">
        {/* Eyebrow */}
        <p className="eyebrow-mono">
          {content?.philosophyEyebrow ?? "Locally sourced, locally verified"}
        </p>

        {/* Heading */}
        <ScrollReveal delay={0.1}>
          <h2 className={cn(typography({ intent: "editorial-h2" }), "mx-auto mt-6 max-w-2xl leading-snug")}>
            {content?.philosophyHeading ??
              "From years of living here. Not a desk."}
          </h2>
        </ScrollReveal>

        {/* Stats */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-y-8 gap-x-6 sm:gap-x-16 lg:gap-x-24">
          {/* Stat 1 — Places */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <AnimatedNumber
                value={locationCount}
                className={cn(typography({ intent: "utility-tabular" }), "text-3xl sm:text-4xl font-light leading-none")}
              />
              <span className="text-xl sm:text-2xl font-mono font-light text-foreground leading-none">
                +
              </span>
            </div>
            <p className="eyebrow-mono mt-3">
              {stats?.[0]?.label ?? "Places we\u2019ve spent time in"}
            </p>
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-16 w-px bg-border" />

          {/* Stat 2 — Prefectures */}
          <div className="text-center">
            <AnimatedNumber
              value={(() => {
                const parsed = stats?.[1]?.value ? parseInt(stats[1].value, 10) : 629;
                return isNaN(parsed) ? 629 : parsed;
              })()}
              className={cn(typography({ intent: "utility-tabular" }), "text-3xl sm:text-4xl font-light leading-none")}
            />
            <p className="eyebrow-mono mt-3">
              {stats?.[1]?.label ?? "People who know the ground"}
            </p>
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-16 w-px bg-border" />

          {/* Stat 3 — Local */}
          <div className="text-center">
            <span className={cn(typography({ intent: "utility-tabular" }), "text-3xl sm:text-4xl font-light leading-none")}>
              {stats?.[2]?.value ?? "90"}
              {stats?.[2]?.suffix ?? "+"}
            </span>
            <p className="eyebrow-mono mt-3">
              {stats?.[2]?.label ?? "Guides written on the ground"}
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
