"use client";

import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { SplitText } from "@/components/ui/SplitText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Magnetic } from "@/components/ui/Magnetic";
import { parallaxZoomIn, durationBase, staggerChar } from "@/lib/motion";
import type { PagesContent } from "@/types/sanitySiteContent";

type NotFoundClientProps = {
  content?: PagesContent;
};

export function NotFoundClient({ content }: NotFoundClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const imageScale = useTransform(
    scrollYProgress,
    [0, 1],
    [parallaxZoomIn.from, parallaxZoomIn.to],
  );

  return (
    <section
      ref={containerRef}
      className="relative min-h-[100dvh] overflow-hidden"
    >
      {/* Grain */}
      <div className="texture-grain pointer-events-none absolute inset-0 z-20" />

      {/* Parallax background */}
      <motion.div
        className="absolute inset-0"
        style={prefersReducedMotion ? {} : { scale: imageScale }}
      >
        <Image
          src={content?.notFoundBackgroundImage?.url ?? "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1920&q=80"}
          alt="Misty bamboo grove"
          fill
          className="object-cover saturate-[0.7] brightness-[0.5]"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-charcoal/55" />
      </motion.div>

      {/* Giant watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center"
      >
        <span className="font-serif italic text-[clamp(8rem,20vw,14rem)] text-white/[0.06]">
          404
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-6 py-12 sm:py-20 lg:py-28 text-center">
        <div className="max-w-2xl">
          <ScrollReveal distance={10}>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/50">
              {content?.notFoundEyebrow ?? "Page not found"}
            </p>
          </ScrollReveal>

          <SplitText
            as="h1"
            className="mt-6 justify-center font-serif italic text-[clamp(2.5rem,8vw,5rem)] leading-[1.1] text-white"
            splitBy="char"
            animation="clipY"
            staggerDelay={staggerChar}
          >
            {content?.notFoundHeading ?? "Lost in Translation"}
          </SplitText>

          <ScrollReveal delay={0.4} distance={15}>
            <p className="mx-auto mt-8 max-w-md text-base text-white/80">
              {content?.notFoundDescription ?? "This path leads nowhere — but Japan still has thousands waiting for you."}
            </p>
          </ScrollReveal>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: durationBase, delay: 0.7 }}
            className="mt-12 flex flex-col items-center"
          >
            <Magnetic>
              <a
                href="/"
                className="relative inline-flex h-14 items-center justify-center rounded-xl bg-brand-primary px-10 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-brand-primary/90 hover:shadow-xl"
              >
                <span className="absolute inset-0 rounded-xl bg-brand-primary/20 blur-xl" />
                <span className="relative">{content?.notFoundPrimaryCtaText ?? "Take Me Home"}</span>
              </a>
            </Magnetic>
            <a
              href="/places"
              className="link-reveal mt-6 text-sm font-medium uppercase tracking-wide text-white/60 transition-colors hover:text-white/90"
            >
              {content?.notFoundSecondaryCtaText ?? "Explore Places"}
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
