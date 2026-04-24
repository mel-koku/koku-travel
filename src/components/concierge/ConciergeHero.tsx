"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export function ConciergeHero() {
  return (
    <section
      aria-label="Yuku Concierge"
      className="bg-background px-6 py-12 sm:py-20 lg:py-28"
    >
      <div className="mx-auto max-w-2xl text-center">
        <ScrollReveal>
          <p className="eyebrow-editorial mb-4">Yuku Concierge</p>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <h1
            className={cn(
              typography({ intent: "editorial-h1" }),
              "mb-6 text-[clamp(2rem,4vw,3rem)]",
            )}
          >
            Your trip to Japan, handled end to end.
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.16}>
          <p
            className={cn(
              typography({ intent: "utility-body" }),
              "mb-8 text-foreground-secondary",
            )}
          >
            The app plans the route. Our team plans the rest, down to the ryokan room,
            the train seat, and the phone call in Japanese when something needs sorting.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.22}>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="#inquire"
              className="btn-yuku inline-flex h-12 items-center rounded-lg bg-brand-primary px-8 font-sans text-sm font-medium text-white active:scale-[0.98]"
            >
              Start my inquiry
            </Link>
            <Link
              href="#includes"
              className="inline-flex h-12 items-center rounded-lg border border-border bg-transparent px-8 font-sans text-sm font-medium text-foreground transition-colors hover:bg-canvas active:scale-[0.98]"
            >
              What&rsquo;s included
            </Link>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <p
            className={cn(
              typography({ intent: "utility-meta" }),
              "mt-6",
            )}
          >
            We typically reply within 2 business days.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
