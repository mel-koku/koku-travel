"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { parallaxHero, durationEpic } from "@/lib/motion";

import type { GuideType } from "@/types/guide";

type GuideHeroProps = {
  title: string;
  featuredImage: string;
  guideType: GuideType;
  city?: string;
  region?: string;
  readingTimeMinutes?: number;
};

const GUIDE_TYPE_LABELS: Record<GuideType, string> = {
  itinerary: "Itinerary",
  listicle: "Top Picks",
  deep_dive: "Deep Dive",
  seasonal: "Seasonal",
};

export function GuideHero({
  title,
  featuredImage,
  guideType,
  city,
  region,
  readingTimeMinutes,
}: GuideHeroProps) {
  const typeLabel = GUIDE_TYPE_LABELS[guideType];
  const location = city || region || "";
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Subtle zoom-out on scroll
  const imageScale = useTransform(scrollYProgress, [0, 1], [parallaxHero.from, parallaxHero.to]);
  // Scroll indicator fades out
  const scrollIndicatorOpacity = useTransform(
    scrollYProgress,
    [0.3, 0.5],
    [1, 0]
  );

  // Meta line: "Deep Dive · Kyoto · 8 min"
  const metaParts = [
    typeLabel,
    location,
    readingTimeMinutes ? `${readingTimeMinutes} min` : "",
  ].filter(Boolean);
  const metaLine = metaParts.join(" \u00b7 ");

  // Shared overlay + content block (used in both variants)
  const overlays = (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 60%, rgba(31,26,20,0.75) 0%, rgba(31,26,20,0.35) 50%, rgba(31,26,20,0.10) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(31,26,20,0.85) 0%, rgba(31,26,20,0.40) 30%, transparent 60%)",
        }}
      />
      <div className="texture-grain absolute inset-0" />
    </>
  );

  const titleContent = (
    <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-12 sm:pb-20 sm:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="font-serif text-3xl italic leading-[1.05] tracking-display text-white sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="mt-4 font-mono text-xs uppercase tracking-ultra text-white/50">
          {metaLine}
        </p>
      </div>
    </div>
  );

  if (prefersReducedMotion) {
    return (
      <section className="relative -mt-20 h-[100dvh] w-full overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={featuredImage}
            alt={title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>
        {overlays}
        {titleContent}
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      className="relative -mt-20 h-[120vh] w-full sm:h-[150vh]"
    >
      {/* Sticky viewport */}
      <div className="sticky top-0 h-[100dvh] w-full overflow-hidden">
        {/* Image with subtle scale */}
        <motion.div className="absolute inset-0" style={{ scale: imageScale }}>
          <Image
            src={featuredImage}
            alt={title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </motion.div>

        {overlays}
        {titleContent}

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 hidden sm:block"
          style={{ opacity: scrollIndicatorOpacity }}
        >
          <div className="flex flex-col items-center gap-3">
            <span className="text-[10px] uppercase tracking-ultra text-white/50">
              Scroll
            </span>
            <div className="relative h-12 w-px overflow-hidden">
              <motion.div
                animate={{ y: [0, 48, 0] }}
                transition={{
                  duration: durationEpic,
                  repeat: Infinity,
                  ease: [0.45, 0, 0.55, 1],
                }}
                className="absolute h-4 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
