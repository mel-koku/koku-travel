"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { SplitText } from "@/components/ui/SplitText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { parallaxSection } from "@/lib/motion";

type StatsSectionProps = {
  favoritesCount: number;
  guideBookmarksCount: number;
  tripsCount: number;
  content?: {
    dashboardActivityEyebrow?: string;
    dashboardActivityHeading?: string;
  };
};

export function StatsSection({
  favoritesCount,
  guideBookmarksCount,
  tripsCount,
  content,
}: StatsSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const imageScale = useTransform(
    scrollYProgress,
    [0, 1],
    [parallaxSection.from, parallaxSection.to],
  );

  return (
    <section
      ref={containerRef}
      className="relative min-h-[40vh] overflow-hidden"
    >
      {/* Parallax background */}
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
          loading="lazy"
        />
        <div className="absolute inset-0 bg-charcoal/65" />
      </motion.div>

      {/* Grain */}
      <div className="texture-grain pointer-events-none absolute inset-0" />

      {/* Content */}
      <div className="relative z-10 flex min-h-[40vh] flex-col items-center justify-center px-6 py-12 sm:py-20 text-center">
        <ScrollReveal>
          <p className="text-xs font-medium uppercase tracking-ultra text-white/50">
            {content?.dashboardActivityEyebrow ?? "Activity"}
          </p>
        </ScrollReveal>

        <SplitText
          as="h2"
          className="mt-4 justify-center font-serif italic text-2xl tracking-heading text-white sm:text-3xl"
          splitBy="word"
          animation="clipY"
          staggerDelay={0.04}
          delay={0.1}
        >
          {content?.dashboardActivityHeading ?? "At a Glance"}
        </SplitText>

        {/* Inline stats */}
        <ScrollReveal delay={0.3}>
          <div className="mt-10 flex items-center gap-4 sm:gap-8 md:gap-12">
            <div className="text-center">
              <AnimatedNumber
                value={favoritesCount}
                className="font-mono text-2xl font-medium text-brand-secondary sm:text-3xl"
              />
              <p className="mt-1.5 text-[10px] uppercase tracking-ultra text-white/40">
                Favorites
              </p>
              <Link
                href={favoritesCount > 0 ? "/favorites" : "/explore"}
                className="link-reveal mt-2 inline-block text-[11px] uppercase tracking-wide text-white/50 transition-colors hover:text-white/80"
              >
                {favoritesCount > 0 ? "View favorites" : "Explore places"}
              </Link>
            </div>

            <div className="h-8 w-px bg-white/15" />

            <div className="text-center">
              <AnimatedNumber
                value={guideBookmarksCount}
                className="font-mono text-2xl font-medium text-brand-secondary sm:text-3xl"
              />
              <p className="mt-1.5 text-[10px] uppercase tracking-ultra text-white/40">
                Guides
              </p>
              <Link
                href="/guides/bookmarks"
                className="link-reveal mt-2 inline-block text-[11px] uppercase tracking-wide text-white/50 transition-colors hover:text-white/80"
              >
                View guides
              </Link>
            </div>

            <div className="h-8 w-px bg-white/15" />

            <div className="text-center">
              <AnimatedNumber
                value={tripsCount}
                className="font-mono text-2xl font-medium text-brand-secondary sm:text-3xl"
              />
              <p className="mt-1.5 text-[10px] uppercase tracking-ultra text-white/40">
                Trips
              </p>
              <Link
                href="#trips"
                className="link-reveal mt-2 inline-block text-[11px] uppercase tracking-wide text-white/50 transition-colors hover:text-white/80"
              >
                View trips
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
