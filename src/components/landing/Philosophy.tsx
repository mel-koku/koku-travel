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
        {/* Heading — single clear statement */}
        <ScrollReveal direction="none">
          <h2 className={cn(typography({ intent: "editorial-h2" }), "mx-auto max-w-2xl leading-snug")}>
            {content?.philosophyHeading ??
              "From years of living here. Not a desk."}
          </h2>
        </ScrollReveal>

        {/* Stats — quiet, footnote-scale */}
        <ScrollReveal delay={0.2} direction="none">
          <div className="mt-10 flex flex-wrap items-center justify-center gap-y-6 gap-x-8 sm:gap-x-14 lg:gap-x-20">
            <div className="text-center">
              <div className="flex items-baseline justify-center gap-0.5">
                <AnimatedNumber
                  value={locationCount}
                  className="font-mono text-lg font-light leading-none text-foreground sm:text-xl"
                />
                <span className="font-mono text-base font-light text-foreground sm:text-lg">+</span>
              </div>
              <p className="mt-1.5 text-xs text-foreground-secondary">
                {stats?.[0]?.label ?? "places"}
              </p>
            </div>

            <div className="hidden sm:block h-10 w-px bg-border" />

            <div className="text-center">
              <AnimatedNumber
                value={(() => {
                  const parsed = stats?.[1]?.value ? parseInt(stats[1].value, 10) : 629;
                  return isNaN(parsed) ? 629 : parsed;
                })()}
                className="font-mono text-lg font-light leading-none text-foreground sm:text-xl"
              />
              <p className="mt-1.5 text-xs text-foreground-secondary">
                {stats?.[1]?.label ?? "local contributors"}
              </p>
            </div>

            <div className="hidden sm:block h-10 w-px bg-border" />

            <div className="text-center">
              <span className="font-mono text-lg font-light leading-none text-foreground sm:text-xl">
                {stats?.[2]?.value ?? "90"}
                {stats?.[2]?.suffix ?? "+"}
              </span>
              <p className="mt-1.5 text-xs text-foreground-secondary">
                {stats?.[2]?.label ?? "guides"}
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
