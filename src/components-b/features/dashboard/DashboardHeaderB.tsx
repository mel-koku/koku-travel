"use client";

import { motion } from "framer-motion";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

type DashboardHeaderBProps = {
  name: string;
  subtitle?: string;
};

export function DashboardHeaderB({ name, subtitle }: DashboardHeaderBProps) {
  return (
    <header className="pt-32 lg:pt-36 pb-8 text-center">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: bEase }}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
        >
          Home Base
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: bEase }}
          className="mt-3 text-3xl font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-4xl"
        >
          {name}
        </motion.h1>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: bEase }}
            className="mt-2 text-base text-[var(--muted-foreground)]"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
    </header>
  );
}
