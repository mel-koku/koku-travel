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

type Props = {
  variant: "a" | "b";
};

const WORDS = ["Tea", "Craft", "Kintsukuroi", "Calligraphy", "Indigo", "Fermentation"];

export function ExperiencesComingSoon({ variant }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const isA = variant === "a";
  const basePath = isA ? "" : "/b";

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
          src="https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1920&q=80"
          alt="Traditional Japanese street at dusk"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>

      {/* Dark overlay for text contrast */}
      <div className="absolute inset-0 bg-charcoal/65" />

      {/* Grain texture */}
      <div className="texture-grain pointer-events-none absolute inset-0 z-20" />

      {/* Radial vignette: keeps edges darker, center slightly lifted */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 45%, transparent 0%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-30 flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        {/* Rotating word ticker */}
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
                className={cn(
                  "text-xs uppercase tracking-[0.25em]",
                  isA ? "font-mono" : "font-sans"
                )}
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

        {/* Main heading: big, typographic, Obys-style */}
        <div className="overflow-hidden">
          <motion.h1
            className={cn(
              isA
                ? typography({ intent: "editorial-hero" })
                : "text-5xl sm:text-6xl lg:text-7xl font-bold",
              "text-white !text-[clamp(3rem,8vw,7rem)] !leading-[0.95] tracking-tight"
            )}
            initial={prefersReducedMotion ? false : { y: "100%" }}
            animate={{ y: 0 }}
            transition={{ duration: durationSlow * 1.4, ease: easeRevealMut, delay: 0.2 }}
          >
            Experiences
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
          className={cn(
            "max-w-sm text-white/85 text-base leading-relaxed",
            isA ? "font-sans" : "font-sans"
          )}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: durationBase, delay: 0.6, ease: easeRevealMut }}
        >
          Hands-on workshops, private tastings, artisan studios. We&apos;re curating something worth the wait.
        </motion.p>

        {/* CTA row */}
        <motion.div
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: durationBase, delay: 0.8, ease: easeRevealMut }}
        >
          <Link
            href={`${basePath}/places`}
            className={cn(
              "inline-flex h-12 items-center justify-center px-8 text-sm font-medium text-white active:scale-[0.98] transition-all",
              isA
                ? "btn-koku rounded-lg bg-brand-primary shadow-[var(--shadow-glow)] hover:bg-brand-secondary"
                : "rounded-lg bg-[var(--primary)] hover:brightness-110"
            )}
          >
            Browse Places
          </Link>
          <Link
            href={`${basePath}/guides`}
            className={cn(
              "inline-flex h-12 items-center justify-center px-8 text-sm font-medium text-white/80 hover:text-white border border-white/20 hover:border-white/40 active:scale-[0.98] transition-all",
              isA ? "rounded-lg" : "rounded-lg"
            )}
          >
            Read Guides
          </Link>
        </motion.div>

        {/* Launch date */}
        <motion.p
          className="mt-8 text-[11px] uppercase tracking-[0.2em] text-white/60"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: durationBase, delay: 1.2 }}
        >
          Launching Fall 2026
        </motion.p>
      </div>
    </div>
  );
}
