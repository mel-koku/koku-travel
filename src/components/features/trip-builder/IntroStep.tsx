"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { SplitText } from "@/components/ui/SplitText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Magnetic } from "@/components/ui/Magnetic";

type IntroStepProps = {
  onStart: () => void;
};

export function IntroStep({ onStart }: IntroStepProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  return (
    <div
      ref={containerRef}
      className="relative -mt-20 flex min-h-screen items-center justify-center overflow-hidden bg-charcoal pt-20"
    >
      {/* Parallax background image */}
      <motion.div
        className="absolute inset-0"
        style={prefersReducedMotion ? {} : { y: imageY }}
      >
        <Image
          src="/images/regions/kansai-hero.jpg"
          alt=""
          fill
          className="object-cover opacity-30"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/60 via-charcoal/40 to-charcoal/80" />
      </motion.div>

      {/* Grain texture */}
      <div className="texture-grain absolute inset-0" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
        <ScrollReveal distance={10} delay={0}>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Trip Builder
          </p>
        </ScrollReveal>

        <SplitText
          as="h1"
          className="mt-4 justify-center font-serif text-[clamp(2.5rem,8vw,5rem)] leading-[1.1] text-white"
          splitBy="word"
          animation="clipY"
          staggerDelay={0.04}
          delay={0.15}
        >
          Your Japan
        </SplitText>

        <SplitText
          as="p"
          className="mt-2 justify-center font-serif text-[clamp(1.5rem,5vw,3rem)] italic text-brand-primary"
          splitBy="char"
          animation="fadeUp"
          staggerDelay={0.03}
          delay={0.5}
        >
          starts here
        </SplitText>

        <ScrollReveal delay={0.7} distance={15}>
          <p className="mx-auto mt-6 max-w-xl text-base text-white/70 sm:text-lg">
            Tell us where you want to go and what you love — we&apos;ll build a
            day-by-day plan from places locals actually recommend.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.9} distance={10}>
          <div className="mt-10">
            <Magnetic>
              <button
                type="button"
                onClick={onStart}
                className="rounded-xl bg-brand-primary px-10 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-primary/90 sm:px-12"
              >
                Start Planning
              </button>
            </Magnetic>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
