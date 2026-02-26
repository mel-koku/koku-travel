"use client";

import { motion } from "framer-motion";
import type { PagesContent } from "@/types/sanitySiteContent";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

type PlacesIntroBProps = {
  totalCount: number;
  content?: PagesContent;
};

export function PlacesIntroB({ totalCount, content }: PlacesIntroBProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 lg:pt-36 pb-4 sm:pb-6 text-center">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: bEase }}
        className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
      >
        {totalCount.toLocaleString()} places across Japan
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: bEase, delay: 0.1 }}
        className="mt-4 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.1] text-[var(--foreground)] max-w-3xl mx-auto"
      >
        {content?.placesHeading ?? "Every place worth knowing about, in one collection."}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: bEase }}
        className="text-base text-[var(--foreground-body)] max-w-2xl mx-auto mt-6 leading-relaxed"
      >
        Temples, restaurants, hidden gems — searched, filtered, and saved for your trip.
      </motion.p>
    </section>
  );
}
