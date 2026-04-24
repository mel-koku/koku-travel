"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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
            className="mb-4 inline-block font-sans font-medium uppercase text-white/60"
            style={{ fontSize: "11px", letterSpacing: "0.2em" }}
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
            className="font-serif font-medium text-white text-balance"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.005em",
            }}
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
            className="mt-4 text-white/72"
            style={{ fontSize: "1.05rem", lineHeight: 1.55 }}
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
              className="inline-flex h-14 items-center justify-center rounded-lg bg-brand-primary px-8 text-[13px] font-semibold uppercase tracking-[0.1em] text-white shadow-[var(--shadow-elevated)] transition-colors hover:bg-brand-primary/90 active:scale-[0.98]"
            >
              Start my inquiry
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
