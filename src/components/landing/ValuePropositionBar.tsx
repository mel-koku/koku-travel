"use client";

import { motion } from "framer-motion";

type ValuePropositionBarProps = {
  locationCount: number;
};

export function ValuePropositionBar({ locationCount }: ValuePropositionBarProps) {
  const stats = [
    { value: locationCount.toLocaleString(), label: "Curated Locations" },
    { value: "47", label: "Prefectures Covered" },
    { value: "100%", label: "Local Verified" },
  ];

  return (
    <section className="bg-charcoal py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="grid gap-12 sm:grid-cols-3"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-serif text-3xl font-medium text-white sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-3 text-sm uppercase tracking-widest text-white/70">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
