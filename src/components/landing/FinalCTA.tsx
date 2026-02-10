"use client";

import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { SplitText } from "@/components/ui/SplitText";
import { Magnetic } from "@/components/ui/Magnetic";
import { parallaxZoomIn, durationBase } from "@/lib/motion";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type FinalCTAProps = {
  content?: LandingPageContent;
};

export function FinalCTA({ content }: FinalCTAProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Slow zoom parallax on background
  const imageScale = useTransform(scrollYProgress, [0, 1], [parallaxZoomIn.from, parallaxZoomIn.to]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[80vh] overflow-hidden"
    >
      <div className="texture-grain pointer-events-none absolute inset-0 z-20" />
      {/* Background Image with slow zoom */}
      <motion.div
        className="absolute inset-0"
        style={prefersReducedMotion ? {} : { scale: imageScale }}
      >
        <Image
          src="https://images.unsplash.com/photo-1718166130977-41caff62724e?w=1920&q=80"
          alt="Floating torii gate over water"
          fill
          className="object-cover saturate-[0.7] brightness-[0.6]"
          sizes="100vw"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-charcoal/50" />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex min-h-[80vh] items-center justify-center px-6 py-24 sm:py-32 text-center">
        <div className="max-w-2xl">
          <SplitText
            as="h2"
            className="justify-center font-serif italic text-2xl tracking-heading text-white sm:text-3xl lg:text-4xl"
            splitBy="char"
            animation="clipY"
            staggerDelay={0.02}
          >
            {content?.finalCtaHeading ?? "Your Japan is waiting"}
          </SplitText>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: durationBase, delay: 0.5 }}
            className="mx-auto mt-8 max-w-md text-base text-white/80"
          >
            {content?.finalCtaDescription ?? "Every trip starts with a single place. Find yours."}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: durationBase, delay: 0.7 }}
            className="mt-12 flex flex-col items-center"
          >
            <Magnetic>
              <a
                href="/trip-builder"
                className="relative inline-flex h-14 items-center justify-center rounded-xl bg-brand-primary px-10 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-brand-primary/90 hover:shadow-xl"
              >
                <span className="absolute inset-0 rounded-xl bg-brand-primary/20 blur-xl" />
                <span className="relative">{content?.finalCtaPrimaryText ?? "Start Planning"}</span>
              </a>
            </Magnetic>
            <a
              href="/explore"
              className="link-reveal mt-6 text-sm font-medium uppercase tracking-wide text-white/60 transition-colors hover:text-white/90"
            >
              {content?.finalCtaSecondaryText ?? "Browse Locations"}
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 1 }}
            className="mt-10 text-sm uppercase tracking-wide text-foreground-secondary"
          >
            {content?.finalCtaSubtext ?? "Free to use. No account required."}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
