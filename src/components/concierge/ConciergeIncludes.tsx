"use client";

import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const items = [
  {
    number: "01",
    title: "Full Yuku app access",
    body: "Trip Pass included. Use it to preview your itinerary before you leave, and for maps, timings, and transit while you travel.",
  },
  {
    number: "02",
    title: "Bespoke itinerary design",
    body: "Every day hand-built around your pace, interests, and group. Real transit times, tested alternates, and the small details that make a day land.",
  },
  {
    number: "03",
    title: "Japanese-native coordinator",
    body: "A coordinator on the ground in Japan, fluent in the language, the seasons, and the people. The difference between “we tried” and “done.”",
  },
  {
    number: "04",
    title: "Reservation bookings",
    body: "Ryokan, kaiseki, sushi counters, teamLab, reserved shinkansen seats, local experiences. We book, you arrive.",
  },
  {
    number: "05",
    title: "Priority support during your trip",
    body: "Daily check-ins and rapid responses while you travel. Weather shifts, missed trains, last-minute reservation changes. We pick up.",
  },
  {
    number: "06",
    title: "Direct line to the Yuku team",
    body: "Real humans you can email, message, or call. No ticketing queue, no help-desk scripts. The same people who designed your trip.",
  },
];

export function ConciergeIncludes() {
  return (
    <section
      id="includes"
      aria-label="What's included"
      className="bg-canvas px-6 py-12 sm:py-20 lg:py-28"
    >
      <div className="mx-auto max-w-[720px] text-center">
        <ScrollReveal>
          <p className="eyebrow-editorial mb-4 inline-block">What&rsquo;s Included</p>
        </ScrollReveal>
        <ScrollReveal delay={0.08}>
          <h2 className={cn(typography({ intent: "editorial-h2" }), "mb-14")}>
            Six things you don&rsquo;t have to worry about.
          </h2>
        </ScrollReveal>
      </div>
      <div className="mx-auto grid max-w-[1200px] gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
        {items.map((item, i) => (
          <ScrollReveal key={item.number} delay={0.08 + i * 0.05}>
            <article className="h-full rounded-lg border border-border bg-background p-7 shadow-[var(--shadow-card)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]">
              <p className="eyebrow-mono text-brand-primary">{item.number}</p>
              <h3 className={cn(typography({ intent: "editorial-h3" }), "mt-4")}>
                {item.title}
              </h3>
              <p className={cn(typography({ intent: "utility-body-muted" }), "mt-2")}>
                {item.body}
              </p>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
