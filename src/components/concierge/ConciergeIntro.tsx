"use client";

import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export function ConciergeIntro() {
  return (
    <section
      aria-label="Why Concierge"
      className="bg-background px-6 py-12 sm:py-20 lg:py-28"
    >
      <div className="mx-auto max-w-[760px] text-center">
        <ScrollReveal>
          <p className="eyebrow-editorial mb-4 inline-block">Why Concierge</p>
        </ScrollReveal>
        <ScrollReveal delay={0.08}>
          <h2 className={cn(typography({ intent: "editorial-h2" }), "mb-8")}>
            Built for travelers who want the trip, not the logistics.
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.16}>
          <p className={typography({ intent: "editorial-prose" })}>
            We call the ryokan in Hakone when there&rsquo;s a typhoon rolling in. We hold
            the table at a counter kaiseki that doesn&rsquo;t take email. You bring the
            dates and the group. We handle the rest.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.3}>
          <div aria-hidden="true" className="mx-auto mt-10 h-px w-12 bg-brand-primary" />
        </ScrollReveal>
      </div>
    </section>
  );
}
