"use client";

import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { useRef } from "react";
import { SplitText } from "@/components/ui/SplitText";
import {
  easeReveal,
  easeCinematic,
  durationEpic,
  easeScrollIndicator,
  staggerWord,
} from "@/lib/motion";
import { urlFor } from "@/sanity/image";
import { mapColors } from "@/lib/mapColors";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/utils";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type HeroOpeningProps = {
  locationCount: number;
  content?: LandingPageContent;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1920&q=80";
const FALLBACK_ALT = "Quiet alley in Japan at dusk";

export function HeroOpening({ locationCount, content }: HeroOpeningProps) {
  const headline =
    content?.heroHeadline ?? "Travel Japan like the people who live here";
  const description = (
    content?.heroDescription ??
    "Days planned around how you actually travel. {locationCount}+ places we'd stake our name on."
  ).replace("{locationCount}", locationCount.toLocaleString());
  const primaryCta = content?.heroPrimaryCtaText ?? "Build My Trip";
  const secondaryCta = content?.heroSecondaryCtaText ?? "Start Browsing";

  // Sanity image with hotspot support
  const heroImage = content?.heroImage;
  const imageSrc = heroImage
    ? urlFor(heroImage).width(1920).quality(85).url()
    : FALLBACK_IMAGE;
  const imageAlt = heroImage ? "Japan travel scene" : FALLBACK_ALT;
  const objectPosition = heroImage?.hotspot
    ? `${heroImage.hotspot.x * 100}% ${heroImage.hotspot.y * 100}%`
    : "center";

  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Scroll motion values — GPU-composited only (transform + opacity)
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.4], [0, -30]);

  if (prefersReducedMotion) {
    return (
      <section aria-label="Hero" className="relative h-[100dvh] w-full overflow-hidden bg-background">
        <div className="absolute inset-0">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover"
            style={{ objectPosition }}
            priority
            sizes="100vw"
          />
          {/* Bottom gradient */}
          <div
            className="absolute inset-0"
            style={{
              background:
                `linear-gradient(to top, ${mapColors.background}d9 0%, ${mapColors.background}66 40%, transparent 65%)`,
            }}
          />
          {/* Left gradient for text readability */}
          <div
            className="absolute inset-0"
            style={{
              background:
                `linear-gradient(to right, ${mapColors.background}4d 0%, transparent 50%)`,
            }}
          />
          <div className="texture-grain pointer-events-none absolute inset-0 z-10" />
        </div>

        {/* Content — bottom-left editorial */}
        <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-[calc(4rem+env(safe-area-inset-bottom))] text-left sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="font-mono text-sm uppercase tracking-wider text-white/50">
              {locationCount.toLocaleString()}+ places
            </p>
            <h1 className={cn(typography({ intent: "editorial-hero" }), "mt-3 leading-[1.1] text-white")}>
              {headline}
            </h1>
            <p className="mt-5 max-w-lg text-base text-white/70 sm:text-lg">
              {description}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="/trip-builder"
                className="btn-koku inline-flex h-14 items-center justify-center rounded-lg bg-brand-primary px-10 text-sm font-semibold uppercase tracking-wider text-white shadow-[var(--shadow-elevated)] hover:bg-brand-primary/90 active:scale-[0.98]"
              >
                {primaryCta}
              </a>
              <a
                href="/places"
                className="inline-flex h-14 items-center justify-center rounded-lg border border-white/25 px-10 text-sm font-semibold uppercase tracking-wider text-white/80 transition-all hover:border-white/40 hover:text-white active:scale-[0.98]"
              >
                {secondaryCta}
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      aria-label="Hero"
      className="relative h-[100dvh] w-full overflow-hidden bg-background"
    >
      {/* Image layer: scroll parallax (outer) + entrance animation (inner) */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={{ y: imageY }}
      >
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0.005, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: easeCinematic }}
        >
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover"
            style={{ objectPosition }}
            priority
            sizes="100vw"
          />
          {/* Bottom gradient */}
          <div
            className="absolute inset-0"
            style={{
              background:
                `linear-gradient(to top, ${mapColors.background}d9 0%, ${mapColors.background}66 40%, transparent 65%)`,
            }}
          />
          {/* Left gradient for text readability */}
          <div
            className="absolute inset-0"
            style={{
              background:
                `linear-gradient(to right, ${mapColors.background}4d 0%, transparent 50%)`,
            }}
          />
          {/* Grain texture */}
          <div className="texture-grain pointer-events-none absolute inset-0 z-10" />
        </motion.div>
      </motion.div>

      {/* Content layer: bottom-left editorial, fades out on scroll */}
      <motion.div
        className="absolute inset-0 z-10 flex flex-col justify-end px-6 pb-[calc(4rem+env(safe-area-inset-bottom))] text-left sm:px-8 lg:px-12"
        style={{
          opacity: contentOpacity,
          y: contentY,
          willChange: "opacity, transform",
        }}
      >
        <div className="max-w-2xl">
          {/* Mono data callout */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: easeReveal }}
            className="font-mono text-sm uppercase tracking-wider text-white/50"
          >
            {locationCount.toLocaleString()}+ places
          </motion.p>
          {/* Statement headline — word-by-word clip reveal */}
          <SplitText
            as="h1"
            className={cn(typography({ intent: "editorial-hero" }), "mt-3 leading-[1.1] text-white")}
            splitBy="word"
            trigger="load"
            animation="clipY"
            staggerDelay={staggerWord}
            delay={0.05}
          >
            {headline}
          </SplitText>

          {/* Supporting line */}
          <motion.p
            initial={{ opacity: 0.005, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.4, ease: easeReveal }}
            className="mt-5 max-w-lg text-base text-white/70 sm:text-lg"
          >
            {description}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0.005, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.6, ease: easeReveal }}
            className="mt-8 flex flex-wrap gap-4"
          >
            <a
              href="/trip-builder"
              className="btn-koku inline-flex h-14 w-full items-center justify-center rounded-lg bg-brand-primary px-10 text-sm font-semibold uppercase tracking-wider text-white shadow-[var(--shadow-elevated)] hover:bg-brand-primary/90 active:scale-[0.98] sm:w-auto"
            >
              {primaryCta}
            </a>
            <a
              href="/places"
              className="inline-flex h-14 w-full items-center justify-center rounded-lg border border-white/25 px-10 text-sm font-semibold uppercase tracking-wider text-white/80 transition-all hover:border-white/40 hover:text-white active:scale-[0.98] sm:w-auto"
            >
              {secondaryCta}
            </a>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator — centered at bottom, fades with content */}
      <div
        className="absolute bottom-8 left-1/2 z-10 hidden pb-[env(safe-area-inset-bottom)] lg:block"
        style={{ transform: "translateX(-50%)" }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.6 }}
          style={{ opacity: contentOpacity }}
          className="flex flex-col items-center gap-3"
        >
          <span className="text-[11px] uppercase tracking-ultra text-white/40">
            Scroll
          </span>
          <div className="relative h-10 w-px overflow-hidden">
            <motion.div
              animate={{ y: [0, 40, 0] }}
              transition={{
                duration: durationEpic,
                repeat: Infinity,
                ease: easeScrollIndicator,
              }}
              className="absolute h-3 w-px bg-gradient-to-b from-transparent via-white/60 to-transparent"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
