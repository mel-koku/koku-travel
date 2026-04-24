"use client";

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
          <h2
            className="mb-8 font-serif font-medium text-foreground text-balance"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.005em",
            }}
          >
            Built for travelers who want the trip, not the logistics.
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.16}>
          <p
            className="font-serif text-foreground-body"
            style={{ fontSize: "clamp(1.125rem, 1.6vw, 1.375rem)", lineHeight: 1.55 }}
          >
            Guidebooks get you a list. Apps get you a route. Neither one will call the
            ryokan in Hakone when there&rsquo;s a typhoon rolling in, or hold a table at
            a counter kaiseki that doesn&rsquo;t take email.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.22}>
          <p
            className="mt-5 font-serif text-foreground-body"
            style={{ fontSize: "clamp(1.125rem, 1.6vw, 1.375rem)", lineHeight: 1.55 }}
          >
            Yuku Concierge does. You bring the dates, the vibe, and the people you&rsquo;re
            bringing with you. We handle the rest.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.3}>
          <div aria-hidden="true" className="mx-auto mt-10 h-px w-12 bg-brand-primary" />
        </ScrollReveal>
      </div>
    </section>
  );
}
