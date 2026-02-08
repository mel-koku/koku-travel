"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

type ValuePropositionBarProps = {
  locationCount: number;
};

export function ValuePropositionBar({
  locationCount,
}: ValuePropositionBarProps) {
  const prefersReducedMotion = useReducedMotion();

  const stats = [
    { value: locationCount.toLocaleString(), label: "Places Worth Knowing" },
    { value: "47", label: "Prefectures Mapped" },
    { value: "100%", label: "Locally Verified" },
  ];

  return (
    <section className="relative overflow-hidden bg-charcoal py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("/grain.svg")' }} />
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 sm:grid-cols-3">
          {stats.map((stat, index) => (
            <ScrollReveal key={stat.label} delay={index * 0.1} direction="up" distance={20}>
              <div className="text-center">
                <motion.p
                  className="font-mono text-3xl font-medium text-white sm:text-4xl"
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                >
                  {stat.value}
                </motion.p>
                <p className="mt-3 text-sm uppercase tracking-widest text-white/60">
                  {stat.label}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
