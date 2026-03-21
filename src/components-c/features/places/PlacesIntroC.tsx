"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cEase } from "@c/ui/motionC";
import type { PagesContent } from "@/types/sanitySiteContent";

type PlacesIntroCProps = {
  totalCount: number;
  content?: PagesContent;
};

export function PlacesIntroC({ totalCount, content }: PlacesIntroCProps) {
  const prefersReducedMotion = useReducedMotion();

  const initial = prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 };
  const animate = { opacity: 1, y: 0 };

  return (
    <section className="mx-auto max-w-[1400px] px-6 lg:px-10 pt-32 lg:pt-36 pb-4 sm:pb-6">
      <motion.p
        initial={initial}
        animate={animate}
        transition={{ duration: 0.5, ease: cEase }}
        className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]"
      >
        {totalCount.toLocaleString()} places across Japan
      </motion.p>

      <motion.h1
        initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        animate={animate}
        transition={{ duration: 0.5, ease: cEase, delay: prefersReducedMotion ? 0 : 0.1 }}
        className="mt-4 leading-[1.1] max-w-3xl"
        style={{
          fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
          fontSize: "clamp(2rem, 4vw, 3.5rem)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "var(--foreground)",
        }}
      >
        {content?.placesHeading ?? "Every place worth knowing about, in one collection."}
      </motion.h1>

      <motion.p
        initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        animate={animate}
        transition={{ duration: 0.5, delay: prefersReducedMotion ? 0 : 0.2, ease: cEase }}
        className="text-base text-[var(--muted-foreground)] max-w-2xl mt-5 leading-relaxed"
      >
        {content?.placesSubtitle ?? "Temples, restaurants, craft studios. Searched, filtered, and saved for your trip."}
      </motion.p>
    </section>
  );
}
