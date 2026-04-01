"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import {
  durationBase,
  durationSlow,
  durationCinematic,
  easeRevealMut,
  easeCinematicMut,
  staggerWord,
} from "@/lib/motion";

const WORDS = ["Guides", "Artisans", "Chefs", "Weavers", "Potters", "Hosts"];

export function LocalExpertsComingSoon() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative min-h-dvh overflow-hidden bg-charcoal">
      {/* Background image with slow Ken Burns */}
      <motion.div
        className="absolute inset-0"
        initial={prefersReducedMotion ? false : { scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: durationCinematic * 2, ease: easeCinematicMut }}
      >
        <Image
          src="https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1920&q=80"
          alt="Quiet alley in Japan at dusk"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-charcoal/65" />

      {/* Grain texture */}
      <div className="texture-grain pointer-events-none absolute inset-0 z-20" />

      {/* Radial vignette */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 45%, transparent 0%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-30 flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        {/* Word ticker */}
        <motion.div
          className="mb-6 overflow-hidden"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: durationBase, delay: 0.6 }}
        >
          <div className="flex items-center gap-3 text-white/60">
            {WORDS.map((word, i) => (
              <motion.span
                key={word}
                className="font-mono text-xs uppercase tracking-[0.25em]"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: durationBase,
                  delay: 0.8 + i * staggerWord * 2,
                  ease: easeRevealMut,
                }}
              >
                {word}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* Heading */}
        <div className="overflow-hidden">
          <motion.h1
            className={cn(
              typography({ intent: "editorial-hero" }),
              "text-white !text-[clamp(3rem,8vw,7rem)] !leading-[0.95] tracking-tight"
            )}
            initial={prefersReducedMotion ? false : { y: "100%" }}
            animate={{ y: 0 }}
            transition={{ duration: durationSlow * 1.4, ease: easeRevealMut, delay: 0.2 }}
          >
            Local Experts
          </motion.h1>
        </div>

        {/* Thin rule */}
        <motion.div
          className="mt-6 mb-6 h-px w-16 bg-white/50"
          initial={prefersReducedMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: durationSlow, delay: 0.5, ease: easeRevealMut }}
        />

        {/* Subtext */}
        <motion.p
          className="max-w-sm font-sans text-base leading-relaxed text-white/85"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: durationBase, delay: 0.6, ease: easeRevealMut }}
        >
          Connect with the people who know Japan from the inside. We&apos;re building something worth introducing you to.
        </motion.p>

        {/* CTA row */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: durationBase, delay: 0.8, ease: easeRevealMut }}
        >
          <Link
            href="/places"
            className="btn-koku inline-flex h-12 items-center justify-center rounded-lg bg-brand-primary px-8 text-sm font-medium text-white shadow-[var(--shadow-glow)] transition-all hover:bg-brand-secondary active:scale-[0.98]"
          >
            Browse Places
          </Link>
          <Link
            href="/guides"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-white/20 px-8 text-sm font-medium text-white/80 transition-all hover:border-white/40 hover:text-white active:scale-[0.98]"
          >
            Read Guides
          </Link>
        </motion.div>

        {/* Launch note */}
        <motion.p
          className="mt-8 text-[11px] uppercase tracking-[0.2em] text-white/50"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: durationBase, delay: 1.2 }}
        >
          Coming 2026
        </motion.p>
      </div>
    </div>
  );
}
