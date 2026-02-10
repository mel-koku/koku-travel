"use client";

import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { SplitText } from "@/components/ui/SplitText";
import { parallaxSection } from "@/lib/motion";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type PhilosophyProps = {
  locationCount: number;
  content?: LandingPageContent;
};

export function Philosophy({ locationCount, content }: PhilosophyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const imageScale = useTransform(scrollYProgress, [0, 1], [parallaxSection.from, parallaxSection.to]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[80vh] overflow-hidden"
    >
      {/* Full-bleed background image with slow zoom */}
      <motion.div
        className="absolute inset-0"
        style={prefersReducedMotion ? {} : { scale: imageScale }}
      >
        <Image
          src="https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1920&q=80"
          alt="Traditional Japanese street at dusk"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-charcoal/65" />
      </motion.div>

      {/* Grain */}
      <div className="texture-grain pointer-events-none absolute inset-0" />

      {/* Content — centered, compact */}
      <div className="relative z-10 flex min-h-[80vh] flex-col items-center justify-center px-6 py-12 sm:py-20 lg:py-28 text-center">
        {/* Eyebrow */}
        <ScrollReveal>
          <p className="text-xs font-medium uppercase tracking-ultra text-white/50">
            {content?.philosophyEyebrow ?? "Locally sourced, locally verified"}
          </p>
        </ScrollReveal>

        {/* Short statement */}
        <SplitText
          as="h2"
          className="mx-auto mt-6 max-w-2xl justify-center font-serif italic text-2xl leading-snug tracking-heading text-white sm:text-3xl lg:text-4xl"
          splitBy="word"
          animation="clipY"
          staggerDelay={0.04}
          delay={0.1}
        >
          {content?.philosophyHeading ?? "Not from a desk, but from years of living here."}
        </SplitText>

        {/* Inline stats */}
        <ScrollReveal delay={0.3}>
          <div className="mt-12 flex items-center gap-4 sm:gap-8 md:gap-12">
            <div className="text-center">
              <div className="flex items-baseline justify-center gap-0.5">
                <AnimatedNumber
                  value={locationCount}
                  className="font-mono text-2xl font-medium text-brand-secondary sm:text-3xl"
                />
                <span className="font-mono text-lg text-brand-secondary">+</span>
              </div>
              <p className="mt-1.5 text-[10px] uppercase tracking-ultra text-white/40">
                Places
              </p>
            </div>

            <div className="h-8 w-px bg-white/15" />

            <div className="text-center">
              <AnimatedNumber
                value={47}
                className="font-mono text-2xl font-medium text-brand-secondary sm:text-3xl"
              />
              <p className="mt-1.5 text-[10px] uppercase tracking-ultra text-white/40">
                Prefectures
              </p>
            </div>

            <div className="h-8 w-px bg-white/15" />

            <div className="text-center">
              <span className="font-mono text-2xl font-medium text-brand-secondary sm:text-3xl">
                100%
              </span>
              <p className="mt-1.5 text-[10px] uppercase tracking-ultra text-white/40">
                Local
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
