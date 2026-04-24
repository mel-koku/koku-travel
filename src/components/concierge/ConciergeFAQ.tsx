"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";

const items = [
  {
    q: "Who is this for?",
    a: "Travelers who'd rather invest their time in the trip than in the planning. Couples, families, and small groups heading to Japan who want a thoughtful, coordinated experience without piecing it together themselves.",
  },
  {
    q: "How is this different from the Yuku app?",
    a: "The app is self-serve: you build your own itinerary with our routing and tips. Concierge is hands-on: we build the itinerary, make the bookings, and stay on call while you travel. Both get you to a great trip. One puts the planning on you, one puts it on us.",
  },
  {
    q: "What if I've already started planning?",
    a: "Even better. We can pick up from whatever you have (a rough list, a few anchor reservations, or a full draft) and finish the rest. Bring what you've got when you reach out.",
  },
  {
    q: "When should I reach out?",
    a: "Ideally 3+ months before you travel, especially for peak seasons (cherry blossom, autumn foliage, Golden Week). We can work with shorter timelines, but early reach-outs unlock more of the places worth going.",
  },
  {
    q: "What does it cost?",
    a: "It depends on the trip: length, party size, pace, and what you want us to arrange. We'll share pricing once we understand what you're looking for.",
  },
];

export function ConciergeFAQ() {
  return (
    <section
      aria-label="Frequently asked questions"
      className="bg-canvas px-6 py-12 sm:py-20 lg:py-28"
    >
      <div className="mx-auto max-w-[720px] text-center">
        <ScrollReveal>
          <p className="eyebrow-editorial mb-4 inline-block">Questions</p>
        </ScrollReveal>
        <ScrollReveal delay={0.08}>
          <h2
            className="mb-12 font-serif font-medium text-foreground text-balance"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.005em",
            }}
          >
            A few things people ask first.
          </h2>
        </ScrollReveal>
      </div>

      <div className="mx-auto max-w-[760px]">
        <ScrollReveal delay={0.12}>
          <ul className="border-b border-border">
            {items.map((item) => (
              <li key={item.q} className="border-t border-border">
                <details className="group py-6">
                  <summary
                    className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif font-semibold text-foreground transition-colors hover:text-brand-primary [&amp;::-webkit-details-marker]:hidden"
                    style={{ fontSize: "1.2rem", lineHeight: 1.3 }}
                  >
                    <span>{item.q}</span>
                    <span
                      aria-hidden="true"
                      className="font-serif text-brand-primary transition-transform duration-200 group-open:rotate-45"
                      style={{ fontSize: "1.5rem", fontWeight: 400, lineHeight: 1 }}
                    >
                      +
                    </span>
                  </summary>
                  <p
                    className="mt-3 text-foreground-secondary"
                    style={{ fontSize: "1rem", lineHeight: 1.6 }}
                  >
                    {item.a}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </ScrollReveal>
      </div>
    </section>
  );
}
