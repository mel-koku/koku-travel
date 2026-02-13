"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SplitText } from "@/components/ui/SplitText";
import { Magnetic } from "@/components/ui/Magnetic";
import { ArrowLineCTA } from "@/components/features/trip-builder/ArrowLineCTA";
import { IntroImagePanel } from "@/components/features/trip-builder/IntroImagePanel";
import { easeReveal, staggerChar, durationBase, magneticCTA } from "@/lib/motion";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

type IntroStepProps = {
  onStart: () => void;
  sanityConfig?: TripBuilderConfig;
};

export function IntroStep({ onStart, sanityConfig }: IntroStepProps) {
  const prefersReducedMotion = useReducedMotion();

  const heading = sanityConfig?.introHeading ?? "Your Japan";
  const subheading = sanityConfig?.introSubheading ?? "starts here";
  const description =
    sanityConfig?.introDescription ??
    "Tell us what you\u2019re into. We\u2019ll build the days around it.";
  const ctaText = sanityConfig?.introCtaText ?? "Start Planning";
  const eyebrow = sanityConfig?.introEyebrow ?? "TRIP BUILDER";
  const accentImage =
    sanityConfig?.introAccentImage?.url ?? "/images/regions/kansai-hero.jpg";
  const imageCaption = sanityConfig?.introImageCaption ?? "Kansai, Japan";

  const fade = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 12 } as const,
          animate: { opacity: 1, y: 0 } as const,
          transition: { duration: 0.4, ease: easeReveal, delay },
        };

  return (
    <div className="relative -mt-20 flex min-h-[100dvh] items-center overflow-hidden bg-background pt-20">

      {/* Main grid content */}
      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-6 py-20 sm:py-28 lg:grid-cols-[1fr_0.82fr] lg:gap-16 lg:px-10">
        {/* ── LEFT COLUMN — Typography + CTA ── */}
        <div className="flex flex-col justify-center">
          {/* Eyebrow */}
          <motion.p
            className="eyebrow-editorial"
            {...fade(0.15)}
          >
            {eyebrow}
          </motion.p>

          {/* Heading — dramatic scale */}
          <SplitText
            as="h1"
            className="mt-4 font-serif italic text-[clamp(4rem,12vw,9rem)] leading-[0.9] text-foreground"
            splitBy="word"
            animation="clipY"
            staggerDelay={0.08}
            delay={0.3}
          >
            {heading}
          </SplitText>

          {/* Subheading — brand-primary, char stagger */}
          <SplitText
            as="p"
            className="mt-2 font-serif text-[clamp(1.5rem,5vw,3.5rem)] italic leading-[1.1] text-brand-primary"
            splitBy="char"
            animation="fadeUp"
            staggerDelay={staggerChar}
            delay={0.6}
          >
            {subheading}
          </SplitText>

          {/* Description */}
          <motion.p
            className="mt-6 max-w-sm text-base leading-relaxed text-foreground-secondary sm:text-lg"
            {...fade(1.0)}
          >
            {description}
          </motion.p>

          {/* CTA — ArrowLineCTA on desktop, button on mobile */}
          <motion.div
            className="mt-10"
            initial={
              prefersReducedMotion ? {} : { opacity: 0, x: -20 }
            }
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: durationBase,
              ease: easeReveal,
              delay: 1.4,
            }}
          >
            {/* Desktop: ArrowLineCTA */}
            <div className="hidden lg:block">
              <ArrowLineCTA label={ctaText} onClick={onStart} />
            </div>

            {/* Mobile: full-width button */}
            <div className="lg:hidden">
              <Magnetic strength={magneticCTA.strength} maxDisplacement={magneticCTA.maxDisplacement} threshold={magneticCTA.threshold}>
                <button
                  type="button"
                  onClick={onStart}
                  className="h-14 w-full cursor-pointer rounded-xl bg-brand-primary px-10 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-brand-primary/90 hover:shadow-xl active:scale-[0.98]"
                >
                  {ctaText}
                </button>
              </Magnetic>
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT COLUMN — Image Panel ── */}
        <div className="flex w-full items-center">
          <IntroImagePanel
            src={accentImage}
            caption={imageCaption}
            delay={0.6}
          />
        </div>
      </div>

      {/* Step indicator — bottom-left */}
      <motion.p
        className="absolute bottom-6 left-6 z-10 font-mono text-[10px] uppercase tracking-widest text-stone/60 lg:bottom-10 lg:left-10"
        initial={prefersReducedMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 1.8 }}
      >
        5 quick steps
      </motion.p>
    </div>
  );
}
