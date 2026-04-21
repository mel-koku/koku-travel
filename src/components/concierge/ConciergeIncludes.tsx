"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";

const items = [
  {
    number: "01",
    title: "Full Yuku app access",
    body: "Trip Pass included for every traveler in your party. Use it before you leave to preview your itinerary, and during the trip for maps, timings, and transit.",
  },
  {
    number: "02",
    title: "Bespoke itinerary design",
    body: "Every day hand-built around your pace, interests, and group. Real transit times, tested alternates, and the small details that make a day land.",
  },
  {
    number: "03",
    title: "Japanese-native coordinator",
    body: "A coordinator on the ground in Japan — fluent in the language, the seasons, and the people. The difference between \u201Cwe tried\u201D and \u201Cdone.\u201D",
  },
  {
    number: "04",
    title: "Reservation bookings",
    body: "Ryokan, kaiseki, sushi counters, teamLab, reserved shinkansen seats, local experiences. We book, you arrive.",
  },
  {
    number: "05",
    title: "Priority support during your trip",
    body: "Daily check-ins and rapid responses while you travel. Weather shifts, missed trains, last-minute reservation changes — we pick up.",
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
      className="bg-secondary px-6 py-16 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-[720px] text-center">
        <ScrollReveal>
          <p
            className="mb-4 inline-block font-sans font-medium uppercase text-foreground-secondary"
            style={{ fontSize: "11px", letterSpacing: "0.2em" }}
          >
            What&rsquo;s Included
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.08}>
          <h2
            className="mb-14 font-serif font-medium text-foreground text-balance"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.005em",
            }}
          >
            Six things you don&rsquo;t have to worry about.
          </h2>
        </ScrollReveal>
      </div>
      <div className="mx-auto grid max-w-[1200px] gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <ScrollReveal key={item.number} delay={0.08 + i * 0.05}>
            <article className="h-full rounded-xl border border-border bg-card p-7 shadow-[var(--shadow-card)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
              <p
                className="font-mono font-medium text-brand-primary"
                style={{ fontSize: "11px", letterSpacing: "0.15em" }}
              >
                {item.number}
              </p>
              <h3
                className="mt-4 font-serif font-semibold text-foreground"
                style={{ fontSize: "1.35rem", lineHeight: 1.2, letterSpacing: "-0.005em" }}
              >
                {item.title}
              </h3>
              <p
                className="mt-2 text-foreground-secondary"
                style={{ fontSize: "0.95rem", lineHeight: 1.55 }}
              >
                {item.body}
              </p>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
