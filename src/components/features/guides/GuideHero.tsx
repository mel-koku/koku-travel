"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { SplitText } from "@/components/ui/SplitText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

import type { Guide } from "@/types/guide";

type GuideHeroProps = {
  guide: Guide;
};

const GUIDE_TYPE_LABELS: Record<Guide["guideType"], string> = {
  itinerary: "Itinerary",
  listicle: "Top Picks",
  deep_dive: "Deep Dive",
  seasonal: "Seasonal",
};

export function GuideHero({ guide }: GuideHeroProps) {
  const typeLabel = GUIDE_TYPE_LABELS[guide.guideType];
  const location = guide.city || guide.region || "";
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  return (
    <div ref={containerRef} className="relative -mt-20 overflow-hidden">
      {/* Parallax hero image */}
      <div className="relative h-[40vh] min-h-[300px] max-h-[500px] w-full pt-20">
        <motion.div
          className="absolute inset-0"
          style={prefersReducedMotion ? {} : { y: imageY }}
        >
          <Image
            src={guide.featuredImage}
            alt={guide.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </motion.div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/30 to-charcoal/20" />
        {/* Grain texture */}
        <div className="texture-grain absolute inset-0" />
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 pb-8 pt-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <ScrollReveal distance={10} delay={0}>
            <nav className="mb-4">
              <ol className="flex items-center gap-2 text-sm text-white/80">
                <li>
                  <Link
                    href="/guides"
                    className="hover:text-white transition-colors"
                  >
                    Guides
                  </Link>
                </li>
                <li className="text-white/60">/</li>
                <li className="text-white">{typeLabel}</li>
              </ol>
            </nav>
          </ScrollReveal>

          {/* Meta */}
          <ScrollReveal distance={10} delay={0.05}>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
                {typeLabel}
              </span>
              {location && (
                <span className="inline-flex items-center gap-1.5 text-sm text-white/90">
                  <MapPinIcon className="h-4 w-4" />
                  {location}
                </span>
              )}
              {guide.readingTimeMinutes && (
                <span className="inline-flex items-center gap-1.5 text-sm text-white/90">
                  <ClockIcon className="h-4 w-4" />
                  {guide.readingTimeMinutes} min read
                </span>
              )}
            </div>
          </ScrollReveal>

          {/* Title — SplitText animation matching PageHeader */}
          <SplitText
            as="h1"
            className="font-serif text-3xl font-medium text-white sm:text-4xl lg:text-5xl"
            splitBy="word"
            animation="clipY"
            staggerDelay={0.04}
            delay={0.15}
          >
            {guide.title}
          </SplitText>

          {/* Subtitle */}
          {guide.subtitle && (
            <ScrollReveal delay={0.3} distance={15}>
              <p className="mt-3 text-lg text-white/80 sm:text-xl">
                {guide.subtitle}
              </p>
            </ScrollReveal>
          )}
        </div>
      </div>
    </div>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
      />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
