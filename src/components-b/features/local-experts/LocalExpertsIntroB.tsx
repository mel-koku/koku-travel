"use client";

import { motion } from "framer-motion";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

type Props = {
  total: number;
};

export function LocalExpertsIntroB({ total }: Props) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 lg:pt-36 pb-4 sm:pb-6 text-center">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: bEase }}
        className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
      >
        {total} local experts across Japan
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: bEase, delay: 0.1 }}
        className="mt-4 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.1] text-[var(--foreground)] max-w-3xl mx-auto"
      >
        Meet the people behind the experiences
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: bEase, delay: 0.2 }}
        className="text-base text-[var(--foreground-body)] max-w-2xl mx-auto mt-6 leading-relaxed"
      >
        Artisans and guides who bring Japan to life. Browse by specialty,
        city, or craft.
      </motion.p>
    </section>
  );
}
