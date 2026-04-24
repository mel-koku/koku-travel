"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { easeReveal } from "@/lib/motion";

export function ConciergeHero() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      aria-label="Yuku Concierge"
      className="relative min-h-[calc(100dvh-var(--header-h))] w-full overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse at 20% 20%, #2f455c 0%, transparent 55%),
          radial-gradient(ellipse at 80% 40%, #593a40 0%, transparent 50%),
          linear-gradient(135deg, #1c1a17 0%, #2c2825 50%, #3a2822 100%)
        `,
      }}
    >
      {/* Atmospheric overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(28,26,23,0.9) 0%, rgba(28,26,23,0.3) 45%, transparent 70%), radial-gradient(circle at 70% 30%, rgba(201, 48, 34, 0.25) 0%, transparent 40%)",
        }}
      />
      {/* Grain */}
      <div className="texture-grain pointer-events-none absolute inset-0 z-10" />

      <div className="relative z-20 flex min-h-[calc(100dvh-var(--header-h))] flex-col justify-end px-6 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            {prefersReducedMotion ? (
              <span
                className="mb-7 inline-flex items-center gap-3 font-sans font-semibold uppercase text-[#f5d8c0]"
                style={{ fontSize: "clamp(0.875rem, 1.1vw, 1rem)", letterSpacing: "0.35em" }}
              >
                <span aria-hidden="true" className="h-px w-8 bg-[#f5d8c0]/60" />
                Yuku Concierge
              </span>
            ) : (
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05, ease: easeReveal }}
                className="mb-7 inline-flex items-center gap-3 font-sans font-semibold uppercase text-[#f5d8c0]"
                style={{ fontSize: "clamp(0.875rem, 1.1vw, 1rem)", letterSpacing: "0.35em" }}
              >
                <span aria-hidden="true" className="h-px w-8 bg-[#f5d8c0]/60" />
                Yuku Concierge
              </motion.span>
            )}

            <motion.h1
              initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: easeReveal }}
              className="max-w-[18ch] font-serif font-medium text-white"
              style={{
                fontSize: "clamp(2.75rem, 7vw, 6rem)",
                lineHeight: 1.02,
                letterSpacing: "-0.015em",
              }}
            >
              Your trip to Japan,{" "}
              <em className="font-normal italic text-[#f5d8c0]">handled</em> end to end.
            </motion.h1>

            <motion.p
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.5, ease: easeReveal }}
              className="mt-6 max-w-[48ch] text-white/80"
              style={{ fontSize: "clamp(1rem, 1.3vw, 1.15rem)", lineHeight: 1.55 }}
            >
              The app plans the route. Our team plans the rest, down to the ryokan room,
              the train seat, and the phone call in Japanese when something needs sorting.
              Everything short of boarding the plane with you.
            </motion.p>

            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.7, ease: easeReveal }}
              className="mt-10 flex flex-wrap gap-3"
            >
              <Link
                href="#inquire"
                className="inline-flex h-14 items-center justify-center rounded-lg bg-brand-primary px-8 text-[13px] font-semibold uppercase tracking-[0.1em] text-white shadow-[var(--shadow-elevated)] transition-colors hover:bg-brand-primary/90 active:scale-[0.98]"
              >
                Start my inquiry
              </Link>
              <Link
                href="#includes"
                className="inline-flex h-14 items-center justify-center rounded-lg border border-white/30 bg-transparent px-8 text-[13px] font-semibold uppercase tracking-[0.1em] text-white/90 transition-colors hover:bg-white/10 active:scale-[0.98]"
              >
                What&rsquo;s included
              </Link>
            </motion.div>

            <motion.p
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.85, ease: easeReveal }}
              className="mt-4 text-xs text-white/60"
            >
              We typically reply within 2 business days.
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}
