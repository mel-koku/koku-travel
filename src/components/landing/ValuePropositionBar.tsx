"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "2,586", label: "Curated Locations" },
  { value: "47", label: "Prefectures Covered" },
  { value: "100%", label: "Local Verified" },
];

export function ValuePropositionBar() {
  return (
    <section className="bg-earthy-cream py-20 sm:py-24">
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
              <p className="font-serif text-5xl font-medium text-earthy-charcoal sm:text-6xl">
                {stat.value}
              </p>
              <p className="mt-3 text-sm uppercase tracking-widest text-earthy-warmGray">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
