"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type FinalCtaCProps = {
  content?: LandingPageContent;
};

const cEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: cEase },
  }),
};

export function FinalCtaC({ content }: FinalCtaCProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      aria-label="Get started"
      data-section-dark
      className="bg-[var(--background)]"
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="py-24 sm:py-32 lg:py-48">
          {/* Grid: 12-col. Content left-aligned in 8 cols. */}
          <motion.div
            initial={prefersReducedMotion ? undefined : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="lg:grid lg:grid-cols-12 lg:gap-4"
          >
            <div className="lg:col-span-8">
              {/* Vermillion accent line grows in */}
              <motion.div
                variants={{
                  hidden: { width: 0, opacity: 0 },
                  visible: { width: 48, opacity: 1, transition: { duration: 0.6, ease: cEase } },
                }}
                className="mb-5 h-0.5 bg-[var(--primary)]"
              />
              <motion.p
                variants={fadeUp}
                custom={0}
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]"
              >
                Start planning
              </motion.p>

              <motion.h2
                variants={fadeUp}
                custom={1}
                className="mt-8 leading-[1.05] text-white lg:mt-12"
                style={{
                  fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontSize: "clamp(2rem, 4.5vw, 4rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                }}
              >
                {content?.finalCtaHeading ??
                  "Your Japan starts with one place"}
              </motion.h2>

              <motion.p
                variants={fadeUp}
                custom={2}
                className="mt-6 max-w-lg text-base leading-relaxed text-white/60 lg:mt-8 lg:text-lg"
              >
                {content?.finalCtaDescription ??
                  "Tell us your dates. We'll build the days, route the trains, and find the right places along the way."}
              </motion.p>

              <motion.div
                variants={fadeUp}
                custom={3}
                className="mt-10 flex flex-wrap items-center gap-4 lg:mt-14"
              >
                <Link
                  href="/c/trip-builder"
                  className="inline-flex h-14 items-center justify-center bg-[var(--primary)] px-10 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-opacity duration-200 hover:opacity-90 active:scale-[0.98]"
                >
                  {content?.finalCtaPrimaryText ?? "Build My Trip"}
                </Link>
                <Link
                  href="/c/places"
                  className="inline-flex h-14 items-center justify-center border border-white/25 px-10 text-[11px] font-bold uppercase tracking-[0.15em] text-white/70 transition-colors duration-200 hover:border-white/50 hover:text-white"
                >
                  {content?.finalCtaSecondaryText ?? "Browse Places"}
                </Link>
              </motion.div>

              <motion.p
                variants={fadeUp}
                custom={4}
                className="mt-8 text-[10px] uppercase tracking-[0.2em] text-white/40"
              >
                {content?.finalCtaSubtext ?? "Free to use. No account required."}
              </motion.p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
