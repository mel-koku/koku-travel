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
    <section className="pt-14 pb-2 sm:pt-20 sm:pb-4 lg:pt-24 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: bEase }}
        className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold tracking-[-0.025em] leading-[1.1] text-[var(--foreground)]"
      >
        {content?.placesHeading ?? "Explore Japan"}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: bEase }}
        className="mt-3 text-base text-[var(--muted-foreground)]"
      >
        {totalCount.toLocaleString()} temples, restaurants, hidden gems, and more
      </motion.p>
    </section>
  );
}
