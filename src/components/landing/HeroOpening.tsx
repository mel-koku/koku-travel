"use client";

import Image from "next/image";
import {
  motion,
  animate,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { Magnetic } from "@/components/ui/Magnetic";
import {
  easeReveal,
  easePageTransition,
  parallaxHero,
  durationSlow,
  durationBase,
  durationCinematic,
  durationEpic,
} from "@/lib/motion";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type HeroOpeningProps = {
  locationCount: number;
  content?: LandingPageContent;
};

export function HeroOpening({ locationCount, content }: HeroOpeningProps) {
  const tagline = content?.heroTagline ?? "Beyond the guidebook";
  const description = (content?.heroDescription ?? "Explore {locationCount}+ places curated by people who actually live here.").replace("{locationCount}", locationCount.toLocaleString());
  const primaryCta = content?.heroPrimaryCtaText ?? "Start Planning";
  const secondaryCta = content?.heroSecondaryCtaText ?? "Browse Locations";

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
  const imageScale = useTransform(scrollYProgress, [0, 0.4], [parallaxHero.from, parallaxHero.to]);
  // Clip-path: starts fully hidden (50 = zero visible area), expands to full
  const clipInset = useTransform(scrollYProgress, [0, 0.4], [50, 0]);
  // Text opacity: "KOKU" fades out during reveal
  const titleOpacity = useTransform(scrollYProgress, [0.1, 0.28], [1, 0]);
  // CTA fades in early — overlaps with title so user sees it before scrolling past
  const ctaOpacity = useTransform(scrollYProgress, [0.15, 0.28], [0, 1]);
  // Overlay darkens
  const overlayOpacity = useTransform(scrollYProgress, [0.1, 0.28], [0, 0.7]);
  // Derived clip-path string
  const clipPathStyle = useTransform(clipInset, (v) => `inset(${v}% ${v * 0.5}% ${v}% ${v * 0.5}%)`);
  // Scroll indicator fade
  // Stays visible through entire hero; fades as user exits the fold
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0.4, 0.5], [1, 0]);

  // Click-to-reveal: auto-scroll to complete the hero reveal
  const isAutoScrolling = useRef(false);
  const titleLayerRef = useRef<HTMLDivElement>(null);
  const ctaLayerRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);
  const overlayVignetteRef = useRef<HTMLDivElement>(null);
  const overlayGradientRef = useRef<HTMLDivElement>(null);

  // Sync opacity motion values to DOM via refs — bypasses framer-motion v12's
  // WAAPI renderer which overrides style.opacity on motion.div elements
  useEffect(() => {
    if (titleLayerRef.current) titleLayerRef.current.style.opacity = String(titleOpacity.get());
    if (ctaLayerRef.current) ctaLayerRef.current.style.opacity = String(ctaOpacity.get());
    if (scrollIndicatorRef.current) scrollIndicatorRef.current.style.opacity = String(scrollIndicatorOpacity.get());
    if (overlayVignetteRef.current) overlayVignetteRef.current.style.opacity = String(overlayOpacity.get());
    if (overlayGradientRef.current) overlayGradientRef.current.style.opacity = String(overlayOpacity.get());

    const unsubs = [
      titleOpacity.on("change", (v) => {
        if (titleLayerRef.current) titleLayerRef.current.style.opacity = String(v);
      }),
      ctaOpacity.on("change", (v) => {
        if (ctaLayerRef.current) ctaLayerRef.current.style.opacity = String(v);
      }),
      scrollIndicatorOpacity.on("change", (v) => {
        if (scrollIndicatorRef.current) scrollIndicatorRef.current.style.opacity = String(v);
      }),
      overlayOpacity.on("change", (v) => {
        const s = String(v);
        if (overlayVignetteRef.current) overlayVignetteRef.current.style.opacity = s;
        if (overlayGradientRef.current) overlayGradientRef.current.style.opacity = s;
      }),
    ];
    return () => unsubs.forEach((u) => u());
  // eslint-disable-next-line react-hooks/exhaustive-deps -- motion values are stable refs from useTransform
  }, []);

  const handleHeroClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button")) return;
      if (scrollYProgress.get() > 0.05) return;
      if (isAutoScrolling.current) return;

      isAutoScrolling.current = true;
      // scrollYProgress 0.4 = full reveal; container is 200vh, scroll range is 200vh
      const targetScroll = window.innerHeight * 0.8;
      animate(window.scrollY, targetScroll, {
        duration: durationCinematic,
        ease: easePageTransition,
        onUpdate: (v) => window.scrollTo(0, v),
        onComplete: () => {
          isAutoScrolling.current = false;
        },
      });
    },
    [scrollYProgress]
  );

  // Mobile: simplified single-screen hero
  if (prefersReducedMotion) {
    return (
      <section className="relative min-h-[100dvh] w-full overflow-hidden bg-charcoal">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80"
            alt="Fushimi Inari shrine path in Kyoto"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          {/* Radial vignette — dark center for text, transparent edges for image vibrancy */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 55%, rgba(31,26,20,0.75) 0%, rgba(31,26,20,0.35) 50%, rgba(31,26,20,0.08) 100%)",
            }}
          />
          {/* Bottom gradient — grounds the lower edge */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(31,26,20,0.50) 0%, transparent 40%)",
            }}
          />
        </div>
        <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
          <p className="mb-6 text-sm font-medium uppercase tracking-ultra text-white/60">
            {locationCount.toLocaleString()}+ places worth knowing
          </p>
          <h1 className="font-serif text-[clamp(4rem,18vw,12rem)] italic leading-[0.85] tracking-display text-white">
            KOKU
          </h1>
          <p
            className="mt-6 max-w-md text-base text-white/70"
            style={{
              textShadow:
                "0 1px 3px rgba(31,26,20,0.5), 0 2px 8px rgba(31,26,20,0.3)",
            }}
          >
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
      { }
      <div
        className="sticky top-0 h-[100dvh] w-full overflow-hidden bg-charcoal"
        onClick={handleHeroClick}
      >
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
          {/* Radial vignette — dark center for text, transparent edges for image vibrancy */}
          <div
            ref={overlayVignetteRef}
            className="absolute inset-0"
            style={{
              opacity: 0,
              background:
                "radial-gradient(ellipse 70% 60% at 50% 55%, rgba(31,26,20,0.85) 0%, rgba(31,26,20,0.40) 50%, rgba(31,26,20,0.10) 100%)",
            }}
          />
          {/* Bottom gradient — grounds the lower edge */}
          <div
            ref={overlayGradientRef}
            className="absolute inset-0"
            style={{
              opacity: 0,
              background:
                "linear-gradient(to top, rgba(31,26,20,0.60) 0%, transparent 40%)",
            }}
          />
        </motion.div>

        {/* Layer 2: Typography wall */}
        <div
          ref={titleLayerRef}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
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
                duration: durationSlow,
                ease: easeReveal,
                delay: 0.3,
              }}
              className="font-serif text-[clamp(5rem,25vw,16rem)] italic leading-[0.85] tracking-display text-foreground"
            >
              KOKU
            </motion.h1>
          </div>

          {/* Tagline — slide-up reveal matching KOKU entrance */}
          <div className="mt-4 overflow-hidden">
            <motion.p
              initial={{ y: "100%" }}
              animate={mounted ? { y: "0%" } : { y: "100%" }}
              transition={{
                duration: durationBase,
                ease: easeReveal,
                delay: 1.1,
              }}
              className="text-lg text-foreground-secondary sm:text-xl"
            >
              {tagline}
            </motion.p>
          </div>
        </div>

        {/* Layer 3: CTA overlay (appears in full-bleed phase) */}
        <div
          ref={ctaLayerRef}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center"
          style={{ opacity: 0 }}
        >
          {/* Subtle radial backdrop behind text group */}
          <div
            className="flex flex-col items-center"
            style={{
              background:
                "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(31,26,20,0.25) 0%, transparent 70%)",
              padding: "3rem 2rem",
            }}
          >
            <p
              className="mx-auto max-w-lg text-lg text-white/90 sm:text-xl"
              style={{
                textShadow:
                  "0 1px 3px rgba(31,26,20,0.5), 0 2px 8px rgba(31,26,20,0.3)",
              }}
            >
              {description}
            </p>
            <div className="mt-10">
              <Magnetic>
                <a
                  href="/trip-builder"
                  className="inline-flex h-14 items-center justify-center rounded-xl bg-brand-primary px-10 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-brand-primary/90 hover:shadow-xl"
                >
                  {primaryCta}
                </a>
              </Magnetic>
            </div>
            <a
              href="/explore"
              className="link-reveal mt-6 text-sm font-medium uppercase tracking-wide text-white/60 transition-colors hover:text-white/90"
              style={{
                textShadow:
                  "0 1px 2px rgba(31,26,20,0.4), 0 1px 4px rgba(31,26,20,0.2)",
              }}
            >
              {secondaryCta}
            </a>
          </div>
        </div>

        {/* Scroll indicator (first phase only) */}
        <div
          ref={scrollIndicatorRef}
          className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={mounted ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 1.8, duration: 0.6 }}
            className="flex flex-col items-center gap-3"
          >
            <span className="text-[10px] uppercase tracking-ultra text-foreground/70">
              Scroll
            </span>
            <div className="relative h-12 w-px overflow-hidden">
              <motion.div
                animate={{ y: [0, 48, 0] }}
                transition={{
                  duration: durationEpic,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute h-4 w-px bg-gradient-to-b from-transparent via-foreground/70 to-transparent"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
