"use client";

import { motion } from "framer-motion";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

type Props = {
  total: number;
};

export function LocalExpertsIntroB({ total }: Props) {
  return (
    <section className="px-4 pt-10 pb-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: bEase, delay: 0.1 }}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
        >
          {total} local experts across Japan
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: bEase, delay: 0.2 }}
          className="mt-3 font-bold tracking-tight text-[var(--foreground)]"
          style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
        >
          Meet the people behind the experiences
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: bEase, delay: 0.3 }}
          className="mx-auto mt-4 max-w-2xl text-base text-[var(--muted-foreground)]"
        >
          Artisans, guides, and hosts who bring Japan to life. Browse by
          specialty, city, or craft — then request a booking directly.
        </motion.p>
      </div>
    </section>
  );
}
