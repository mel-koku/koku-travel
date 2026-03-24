"use client";

import { motion } from "framer-motion";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";

const easeReveal = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

type CraftIntroProps = {
  totalCount: number;
};

export function CraftIntro({ totalCount }: CraftIntroProps) {
  return (
    <section className="py-12 sm:py-20 lg:py-28 px-6 text-center bg-background">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easeReveal }}
        className="eyebrow-mono text-brand-primary"
      >
        {totalCount} workshops across Japan
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easeReveal, delay: 0.1 }}
        className={`mt-4 ${cn(typography({ intent: "editorial-h1" }), "text-[clamp(2rem,4vw,3.5rem)] max-w-3xl mx-auto")}`}
      >
        Hands-on with Japan&apos;s living traditions.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: easeReveal }}
        className="text-base text-foreground-secondary max-w-2xl mx-auto mt-6 leading-relaxed"
      >
        Pottery, indigo dyeing, lacquerware, swordsmithing &mdash; find workshops where centuries-old techniques are still practiced daily.
      </motion.p>
    </section>
  );
}
