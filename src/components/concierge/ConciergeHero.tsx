"use client";

import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import { Button } from "@/components/ui/Button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { ConciergePageContent } from "@/types/sanitySiteContent";

type Props = {
  content?: ConciergePageContent;
};

export function ConciergeHero({ content }: Props) {
  const eyebrow = content?.heroEyebrow ?? "Yuku Concierge";
  const heading = content?.heroHeading ?? "Your trip to Japan, handled end to end.";
  const body =
    content?.heroBody ??
    "The app plans the route. Our team plans the rest, down to the ryokan room, the train seat, and the phone call in Japanese when something needs sorting.";
  const ctaText = content?.heroCtaText ?? "Start my inquiry";
  const meta = content?.heroMeta ?? "We typically reply within 2 business days.";

  return (
    <section
      aria-label="Yuku Concierge"
      className="bg-background px-6 py-12 sm:py-20 lg:py-28"
    >
      <div className="mx-auto max-w-2xl text-center">
        <ScrollReveal>
          <p className="eyebrow-editorial mb-4">{eyebrow}</p>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <h1
            className={cn(
              typography({ intent: "editorial-h1" }),
              "mb-6 text-[clamp(2rem,4vw,3rem)]",
            )}
          >
            {heading}
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.16}>
          <p
            className={cn(
              typography({ intent: "utility-body" }),
              "mb-8 text-foreground-secondary",
            )}
          >
            {body}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.22}>
          <Button asChild href="#inquire" variant="primary" size="hero">
            {ctaText}
          </Button>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <p
            className={cn(
              typography({ intent: "utility-meta" }),
              "mt-6",
            )}
          >
            {meta}
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
