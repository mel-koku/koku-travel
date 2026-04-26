"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import { durationBase, easeReveal } from "@/lib/motion";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type FinalCTAProps = {
  content?: LandingPageContent;
  isFreePromo?: boolean;
};

export function FinalCTA({ content, isFreePromo = false }: FinalCTAProps) {
  return (
    <section
      aria-label="Get started"
      className="relative overflow-hidden"
    >
      <div className="texture-grain pointer-events-none absolute inset-0 z-20" />
      {/* Charcoal background */}
      <div className="absolute inset-0 bg-charcoal" />
      {/* Radial vignette for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center px-6 py-24 sm:py-32 lg:py-40 text-center">
        <div className="max-w-2xl">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: durationBase, ease: [...easeReveal] as [number, number, number, number] }}
            className={cn(typography({ intent: "editorial-h2" }), "text-white")}
          >
            {content?.finalCtaHeading ?? "Your Japan is waiting"}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: durationBase, delay: 0.1, ease: [...easeReveal] as [number, number, number, number] }}
            className="mt-4 text-base text-white/80"
          >
            {content?.finalCtaDescription ?? "Pick your dates. See Day 1 free before you decide."}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: durationBase, delay: 0.2, ease: [...easeReveal] as [number, number, number, number] }}
            className="mt-10"
          >
            <Button asChild href="/trip-builder" variant="primary" size="hero">
              {content?.finalCtaPrimaryText ?? "Build My Trip"}
            </Button>
            <p className="mt-4 text-xs text-white/60">
              {isFreePromo
                ? "Free during our launch. No payment required."
                : "Free to preview. $19 to unlock your full trip."}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
