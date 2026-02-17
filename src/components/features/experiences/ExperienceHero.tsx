"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { parallaxHero, durationEpic, easeScrollIndicator } from "@/lib/motion";
import type { ExperienceType } from "@/types/experience";

type ExperienceHeroProps = {
  title: string;
  featuredImage: string;
  experienceType: ExperienceType;
  city?: string;
  region?: string;
  readingTimeMinutes?: number;
  duration?: string;
};

const EXPERIENCE_TYPE_LABELS: Record<ExperienceType, string> = {
  workshop: "Workshop",
  cruise: "Cruise",
  tour: "Tour",
  experience: "Experience",
  adventure: "Adventure",
  rental: "Rental",
};

export function ExperienceHero({
  title,
  featuredImage,
  experienceType,
  city,
  region,
  readingTimeMinutes,
  duration,
}: ExperienceHeroProps) {
  const typeLabel = EXPERIENCE_TYPE_LABELS[experienceType];
  const location = city || region || "";
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const imageScale = useTransform(scrollYProgress, [0, 1], [parallaxHero.from, parallaxHero.to]);
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0.3, 0.5], [1, 0]);

  const metaParts = [
    typeLabel,
    location,
    duration,
    readingTimeMinutes ? `${readingTimeMinutes} min read` : "",
  ].filter(Boolean);
  const metaLine = metaParts.join(" \u00b7 ");

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
    <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-12 sm:pb-20 sm:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="font-serif text-3xl italic leading-[1.05] tracking-display text-white sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="mt-4 font-mono text-xs uppercase tracking-ultra text-white/70">
          {metaLine}
        </p>
      </div>
    </div>
  );

  if (prefersReducedMotion) {
    return (
      <section className="relative -mt-20 h-[100dvh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-charcoal">
          {featuredImage && (
            <Image
              src={featuredImage}
              alt={title}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          )}
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
      <div className="sticky top-0 h-[100dvh] w-full overflow-hidden">
        <motion.div className="absolute inset-0 bg-charcoal" style={{ scale: imageScale }}>
          {featuredImage && (
            <Image
              src={featuredImage}
              alt={title}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          )}
        </motion.div>

        {overlays}
        {titleContent}

        <motion.div
          className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 hidden sm:block"
          style={{ opacity: scrollIndicatorOpacity }}
        >
          <div className="flex flex-col items-center gap-3">
            <span className="text-[10px] uppercase tracking-ultra text-white/70">
              Scroll
            </span>
            <div className="relative h-12 w-px overflow-hidden">
              <motion.div
                animate={{ y: [0, 48, 0] }}
                transition={{
                  duration: durationEpic,
                  repeat: Infinity,
                  ease: easeScrollIndicator,
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
