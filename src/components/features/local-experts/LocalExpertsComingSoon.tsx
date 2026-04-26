"use client";

import { m, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
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
import type { PagesContent } from "@/types/sanitySiteContent";

const WORDS = ["Guides", "Artisans", "Chefs", "Weavers", "Potters", "Hosts"];

export function LocalExpertsComingSoon({ content }: { content?: PagesContent }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative min-h-dvh overflow-hidden bg-charcoal">
      {/* Background image with slow Ken Burns */}
      <m.div
        className="absolute inset-0"
        initial={prefersReducedMotion ? false : { scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: durationCinematic * 2, ease: easeCinematicMut }}
      >
        <Image
          src={content?.comingSoonExpertsImage?.url ?? "/images/fallback.jpg"}
          alt="Quiet alley in Japan at dusk"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </m.div>

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
        <m.div
          className="mb-6 overflow-hidden"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: durationBase, delay: 0.6 }}
        >
          <div className="flex items-center gap-3 text-white/60">
            {WORDS.map((word, i) => (
              <m.span
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
              </m.span>
            ))}
          </div>
        </m.div>

        {/* Heading */}
        <div className="overflow-hidden">
          <m.h1
            className={cn(
              typography({ intent: "editorial-hero" }),
              "text-white !text-[clamp(3rem,8vw,7rem)] !leading-[0.95] tracking-tight"
            )}
            initial={prefersReducedMotion ? false : { y: "100%" }}
            animate={{ y: 0 }}
            transition={{ duration: durationSlow * 1.4, ease: easeRevealMut, delay: 0.2 }}
          >
            Local Experts
          </m.h1>
        </div>

        {/* Thin rule */}
        <m.div
          className="mt-6 mb-6 h-px w-16 bg-white/50"
          initial={prefersReducedMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: durationSlow, delay: 0.5, ease: easeRevealMut }}
        />

        {/* Subtext */}
        <m.p
          className="max-w-sm font-sans text-base leading-relaxed text-white/85"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: durationBase, delay: 0.6, ease: easeRevealMut }}
        >
          Connect with the people who know Japan from the inside. We&apos;re building something worth introducing you to.
        </m.p>

        {/* CTA row */}
        <m.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: durationBase, delay: 0.8, ease: easeRevealMut }}
        >
          <Button asChild href="/places" variant="primary" size="lg">
            Browse Places
          </Button>
          <Link
            href="/guides"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-white/20 px-8 text-sm font-medium text-white/80 transition-all hover:border-white/40 hover:text-white active:scale-[0.98]"
          >
            Read Guides
          </Link>
        </m.div>

        {/* Launch note */}
        <m.p
          className="mt-8 text-[11px] uppercase tracking-[0.2em] text-white/60"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: durationBase, delay: 1.2 }}
        >
          Coming 2026
        </m.p>
      </div>
    </div>
  );
}
