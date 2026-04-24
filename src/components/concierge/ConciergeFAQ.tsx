"use client";

import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { ConciergePageContent } from "@/types/sanitySiteContent";

type Props = {
  content?: ConciergePageContent;
};

const DEFAULT_ITEMS = [
  {
    question: "Who is this for?",
    answer:
      "Travelers who’d rather invest their time in the trip than in the planning. Couples, families, and small groups heading to Japan who want a thoughtful, coordinated experience without piecing it together themselves.",
  },
  {
    question: "How is this different from the Yuku app?",
    answer:
      "The app is self-serve: you build your own itinerary with our routing and tips. Concierge is hands-on: we build the itinerary, make the bookings, and stay on call while you travel. Both get you to a great trip. One puts the planning on you, one puts it on us.",
  },
  {
    question: "What if I’ve already started planning?",
    answer:
      "Even better. We can pick up from whatever you have (a rough list, a few anchor reservations, or a full draft) and finish the rest. Bring what you’ve got when you reach out.",
  },
  {
    question: "When should I reach out?",
    answer:
      "Ideally 3+ months before you travel, especially for peak seasons (cherry blossom, autumn foliage, Golden Week). We can work with shorter timelines, but early reach-outs unlock more of the places worth going.",
  },
  {
    question: "What does it cost?",
    answer:
      "It depends on the trip: length, party size, pace, and what you want us to arrange. We’ll share pricing once we understand what you’re looking for.",
  },
];

export function ConciergeFAQ({ content }: Props) {
  const eyebrow = content?.faqEyebrow ?? "Questions";
  const heading = content?.faqHeading ?? "A few things people ask first.";
  const items =
    content?.faqItems && content.faqItems.length > 0 ? content.faqItems : DEFAULT_ITEMS;

  return (
    <section
      aria-label="Frequently asked questions"
      className="bg-canvas px-6 py-12 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-[720px] text-center">
        <ScrollReveal>
          <p className="eyebrow-editorial mb-4 inline-block">{eyebrow}</p>
        </ScrollReveal>
        <ScrollReveal delay={0.08}>
          <h2 className={cn(typography({ intent: "editorial-h2" }), "mb-12")}>
            {heading}
          </h2>
        </ScrollReveal>
      </div>

      <div className="mx-auto max-w-[760px]">
        <ScrollReveal delay={0.12}>
          <ul className="border-b border-border">
            {items.map((item, i) => (
              <li key={item.question ?? i} className="border-t border-border">
                <details className="group py-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-lg font-normal text-foreground transition-colors hover:text-brand-primary [&amp;::-webkit-details-marker]:hidden">
                    <span>{item.question}</span>
                    <span
                      aria-hidden="true"
                      className="font-serif text-2xl font-normal leading-none text-brand-primary transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className={cn(typography({ intent: "utility-body-muted" }), "mt-3")}>
                    {item.answer}
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
