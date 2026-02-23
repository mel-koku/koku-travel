"use client";

import { motion } from "framer-motion";
import type { LandingPageContent } from "@/types/sanitySiteContent";

const defaultTestimonials = [
  {
    quote:
      "Koku showed us places we'd never have found on our own. Every recommendation felt personal.",
    authorName: "Sarah M.",
    authorLocation: "London, UK",
  },
  {
    quote:
      "The itinerary balanced sightseeing with downtime perfectly. Our best trip yet.",
    authorName: "James T.",
    authorLocation: "Sydney, AU",
  },
  {
    quote:
      "We trusted the local picks and weren't disappointed once. Already planning our return.",
    authorName: "Yuki K.",
    authorLocation: "San Francisco, US",
  },
];

type TestimonialsBProps = {
  content?: LandingPageContent;
};

export function TestimonialsB({ content }: TestimonialsBProps) {
  const testimonials =
    content?.testimonials && content.testimonials.length > 0
      ? content.testimonials
      : defaultTestimonials;

  return (
    <section className="bg-[var(--background)] py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
        >
          What travelers say
        </motion.p>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.slice(0, 3).map((t, i) => (
            <motion.blockquote
              key={t.authorName}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.6,
                delay: 0.15 + i * 0.12,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              whileHover={{
                y: -3,
                transition: { type: "spring", stiffness: 300, damping: 25 },
              }}
              className="rounded-2xl bg-white p-8 transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <p className="leading-relaxed text-[var(--foreground-body)]">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer className="mt-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--primary)]">
                  {t.authorName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {t.authorName}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t.authorLocation}
                  </p>
                </div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
