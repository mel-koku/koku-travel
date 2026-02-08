"use client";

import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { SplitText } from "@/components/ui/SplitText";
import { Magnetic } from "@/components/ui/Magnetic";

type LandingHeroProps = {
  locationCount: number;
};

export function LandingHero({ locationCount }: LandingHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  // Trigger animations after mount to bypass AnimatePresence initial={false}
  useEffect(() => {
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Parallax: image moves at 0.3x scroll speed
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  // Scroll indicator line grows with scroll
  const lineScaleY = useTransform(scrollYProgress, [0, 0.15], [0, 1]);
  const lineOpacity = useTransform(scrollYProgress, [0.1, 0.2], [1, 0]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden bg-charcoal"
    >
      {/* Parallax background image */}
      <motion.div
        className="absolute inset-0"
        style={prefersReducedMotion ? {} : { y: imageY }}
      >
        <Image
          src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80"
          alt="Fushimi Inari shrine path in Kyoto"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/60 via-charcoal/50 to-charcoal/80" />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        {/* Small stat line */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8 text-sm font-medium uppercase tracking-[0.25em] text-white/60"
        >
          {locationCount.toLocaleString()}+ curated spots
        </motion.p>

        {/* Massive headline: JAPAN */}
        <div className="overflow-hidden pb-[3vw]">
          <motion.h1
            initial={{ y: "125%" }}
            animate={mounted ? { y: "0%" } : { y: "125%" }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
            className="font-serif text-[clamp(4rem,15vw,10rem)] font-medium leading-[0.9] tracking-tight text-white"
          >
            JAPAN
          </motion.h1>
        </div>

        {/* Word-by-word subtitle */}
        <SplitText
          as="p"
          className="mt-6 justify-center font-serif text-xl italic text-white/90 sm:text-2xl"
          splitBy="word"
          trigger="inView"
          animation="fadeUp"
          staggerDelay={0.08}
          delay={0.8}
        >
          Experience it like a local
        </SplitText>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={mounted ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 1.4 }}
          className="mx-auto mt-8 max-w-md text-base text-white/70"
        >
          Every place handpicked by people who call Japan home.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 1.6 }}
          className="mt-12"
        >
          <Magnetic>
            <a
              href="/trip-builder"
              className="inline-flex h-14 items-center justify-center rounded-xl bg-brand-primary px-10 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-brand-primary/90 hover:shadow-xl"
            >
              Start Planning
            </a>
          </Magnetic>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={mounted ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 2, duration: 0.6 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
          style={prefersReducedMotion ? {} : { opacity: lineOpacity }}
        >
          <div className="flex flex-col items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
              Scroll
            </span>
            <div className="relative h-16 w-px overflow-hidden">
              <motion.div
                className="absolute inset-x-0 top-0 h-full w-full origin-top bg-gradient-to-b from-white/50 to-transparent"
                style={
                  prefersReducedMotion
                    ? {}
                    : { scaleY: lineScaleY }
                }
              />
              {/* Animated pulse */}
              <motion.div
                animate={{ y: [0, 64, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute h-4 w-px bg-gradient-to-b from-transparent via-white/60 to-transparent"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
