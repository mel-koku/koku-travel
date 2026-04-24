"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import { durationBase, easeReveal } from "@/lib/motion";

export function ConciergeFinalCTA() {
  return (
    <section aria-label="Get in touch" className="relative overflow-hidden">
      <div className="texture-grain pointer-events-none absolute inset-0 z-20" />
      <div className="absolute inset-0 bg-charcoal" />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 55%, rgba(0,0,0,0.25) 100%)",
        }}
      />

      <div className="relative z-10 flex items-center justify-center px-6 py-24 text-center sm:py-32 lg:py-40">
        <div className="max-w-[640px]">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: durationBase,
              ease: [...easeReveal] as [number, number, number, number],
            }}
            className="eyebrow-editorial mb-4 inline-block text-white/60"
          >
            One trip, done right
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: durationBase,
              delay: 0.08,
              ease: [...easeReveal] as [number, number, number, number],
            }}
            className={cn(typography({ intent: "editorial-h2" }), "text-white")}
          >
            Your Japan is waiting. We&rsquo;d love to plan it.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: durationBase,
              delay: 0.15,
              ease: [...easeReveal] as [number, number, number, number],
            }}
            className={cn(typography({ intent: "utility-body" }), "mt-4 text-white/75")}
          >
            A short note is all we need to get started.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: durationBase,
              delay: 0.22,
              ease: [...easeReveal] as [number, number, number, number],
            }}
            className="mt-8"
          >
            <Link
              href="#inquire"
              className="btn-yuku inline-flex h-12 items-center rounded-lg bg-brand-primary px-8 font-sans text-sm font-medium text-white active:scale-[0.98]"
            >
              Start my inquiry
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
