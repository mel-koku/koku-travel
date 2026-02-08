"use client";

import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { SplitText } from "@/components/ui/SplitText";
import { Magnetic } from "@/components/ui/Magnetic";

type HeroOpeningProps = {
  locationCount: number;
};

export function HeroOpening({ locationCount }: HeroOpeningProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Image scale: starts zoomed in, scales to fill
  const imageScale = useTransform(scrollYProgress, [0, 0.4], [1.3, 1]);
  // Clip-path: starts fully hidden (50 = zero visible area), expands to full
  const clipInset = useTransform(scrollYProgress, [0, 0.4], [50, 0]);
  // Text opacity: "KOKU" fades out during reveal
  const titleOpacity = useTransform(scrollYProgress, [0.1, 0.28], [1, 0]);
  // CTA fades in early — overlaps with title so user sees it before scrolling past
  const ctaOpacity = useTransform(scrollYProgress, [0.15, 0.28], [0, 1]);
  // Overlay darkens
  const overlayOpacity = useTransform(scrollYProgress, [0.1, 0.28], [0, 0.5]);
  // Derived clip-path string
  const clipPathStyle = useTransform(clipInset, (v) => `inset(${v}% ${v * 0.5}% ${v}% ${v * 0.5}%)`);
  // Scroll indicator fade
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  // Mobile: simplified single-screen hero
  if (prefersReducedMotion) {
    return (
      <section className="relative min-h-screen w-full overflow-hidden bg-charcoal">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80"
            alt="Fushimi Inari shrine path in Kyoto"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-charcoal/50" />
        </div>
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <p className="mb-6 text-sm font-medium uppercase tracking-ultra text-white/60">
            {locationCount.toLocaleString()}+ places worth knowing
          </p>
          <h1 className="font-serif text-[clamp(4rem,18vw,12rem)] italic leading-[0.85] tracking-display text-white">
            KOKU
          </h1>
          <p className="mt-6 max-w-md text-base text-white/70">
            Explore {locationCount.toLocaleString()}+ places curated by people
            who actually live here.
          </p>
          <div className="mt-10">
            <Magnetic>
              <a
                href="/trip-builder"
                className="inline-flex h-14 items-center justify-center rounded-xl bg-brand-primary px-10 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-brand-primary/90 hover:shadow-xl"
              >
                Start Planning
              </a>
            </Magnetic>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={containerRef} className="relative h-[200vh] w-full">
      {/* Sticky viewport */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-charcoal">
        {/* Layer 1: Background image with clip-path reveal */}
        <motion.div
          className="absolute inset-0"
          style={{
            scale: imageScale,
            clipPath: clipPathStyle,
          }}
        >
          <Image
            src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80"
            alt="Fushimi Inari shrine path in Kyoto"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          {/* Overlay that darkens as we reach full bleed */}
          <motion.div
            className="absolute inset-0 bg-charcoal"
            style={{ opacity: overlayOpacity }}
          />
        </motion.div>

        {/* Layer 2: Typography wall */}
        <motion.div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
          style={{ opacity: titleOpacity }}
        >
          {/* Stat line */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-6 text-sm font-medium uppercase tracking-ultra text-foreground-secondary"
          >
            {locationCount.toLocaleString()}+ places worth knowing
          </motion.p>

          {/* Giant "KOKU" */}
          <div className="overflow-hidden px-[3vw] pb-[3vw]">
            <motion.h1
              initial={{ y: "125%" }}
              animate={mounted ? { y: "0%" } : { y: "125%" }}
              transition={{
                duration: 0.9,
                ease: [0.25, 0.1, 0.25, 1],
                delay: 0.3,
              }}
              className="font-serif text-[clamp(5rem,25vw,16rem)] italic leading-[0.85] tracking-display text-foreground"
            >
              KOKU
            </motion.h1>
          </div>

          {/* Tagline */}
          <SplitText
            as="p"
            className="mt-4 justify-center text-lg text-foreground-secondary sm:text-xl"
            splitBy="word"
            trigger="load"
            animation="fadeUp"
            staggerDelay={0.08}
            delay={0.9}
          >
            Beyond the guidebook
          </SplitText>
        </motion.div>

        {/* Layer 3: CTA overlay (appears in full-bleed phase) */}
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center"
          style={{ opacity: ctaOpacity }}
        >
          <p className="mx-auto max-w-lg text-lg text-white/90 sm:text-xl">
            Explore {locationCount.toLocaleString()}+ places curated by people
            who actually live here.
          </p>
          <div className="mt-10">
            <Magnetic>
              <a
                href="/trip-builder"
                className="inline-flex h-14 items-center justify-center rounded-xl bg-brand-primary px-10 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-brand-primary/90 hover:shadow-xl"
              >
                Start Planning
              </a>
            </Magnetic>
          </div>
          <a
            href="/explore"
            className="link-reveal mt-6 text-sm font-medium uppercase tracking-wide text-white/60 transition-colors hover:text-white/90"
          >
            Browse Locations
          </a>
        </motion.div>

        {/* Scroll indicator (first phase only) */}
        <motion.div
          className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2"
          style={{ opacity: scrollIndicatorOpacity }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={mounted ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 1.8, duration: 0.6 }}
            className="flex flex-col items-center gap-3"
          >
            <span className="text-[10px] uppercase tracking-ultra text-foreground-secondary/60">
              Scroll
            </span>
            <div className="relative h-12 w-px overflow-hidden">
              <motion.div
                animate={{ y: [0, 48, 0] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute h-4 w-px bg-gradient-to-b from-transparent via-foreground/40 to-transparent"
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
