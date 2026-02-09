"use client";

import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { SplitText } from "@/components/ui/SplitText";
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

  // Phased load animation states
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setPhase(3);
      return;
    }
    // Phase 1: SplitText reveals (immediate — handled by SplitText delay)
    setPhase(1);
    // Phase 2: Background image fades in at 1.5s
    const t2 = setTimeout(() => setPhase(2), 1500);
    // Phase 3: Subtitle + CTA fade in at 2s
    const t3 = setTimeout(() => setPhase(3), 2000);
    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      className="relative -mt-20 flex min-h-screen items-center justify-center overflow-hidden bg-charcoal pt-20"
    >
      {/* Parallax background image — fades in at phase 2 */}
      <motion.div
        className="absolute inset-0"
        style={prefersReducedMotion ? {} : { y: imageY }}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 2 ? 1 : 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        <Image
          src="/images/regions/kansai-hero.jpg"
          alt=""
          fill
          className="object-cover opacity-25"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/60 via-charcoal/40 to-charcoal/80" />
      </motion.div>

      {/* Grain texture */}
      <div className="texture-grain absolute inset-0" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
        <SplitText
          as="h1"
          className="justify-center font-serif text-[clamp(2.5rem,8vw,5rem)] leading-[1.1] text-white"
          splitBy="word"
          animation="clipY"
          trigger="load"
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
          trigger="load"
          staggerDelay={0.03}
          delay={0.5}
        >
          starts here
        </SplitText>

        {/* Subtitle + CTA — fade in at phase 3 */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <p className="mx-auto mt-6 max-w-xl text-base text-white/70 sm:text-lg">
            Tell us where you want to go and what you love — we&apos;ll build a
            day-by-day plan from places locals actually recommend.
          </p>

          <div className="mt-10">
            <Magnetic>
              <button
                type="button"
                onClick={onStart}
                className="h-14 cursor-pointer rounded-xl bg-brand-primary px-12 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-brand-primary/90"
              >
                Start Planning
              </button>
            </Magnetic>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
