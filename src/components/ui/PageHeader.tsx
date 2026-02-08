"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { SplitText } from "@/components/ui/SplitText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** @deprecated Use imageUrl instead — variant is ignored, always renders dark hero */
  variant?: "rich" | "compact";
  imageUrl?: string;
  children?: React.ReactNode;
  /** Use smaller min-height for functional pages like Account */
  compact?: boolean;
};

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  imageUrl,
  children,
  compact = false,
}: PageHeaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  const minHeight = compact
    ? "min-h-[30vh] sm:min-h-[35vh]"
    : "min-h-[40vh] sm:min-h-[50vh]";

  return (
    <div
      ref={containerRef}
      className={`relative -mt-20 flex ${minHeight} items-center justify-center overflow-hidden bg-charcoal pt-20`}
    >
      {/* Parallax background image */}
      {imageUrl ? (
        <motion.div
          className="absolute inset-0"
          style={prefersReducedMotion ? {} : { y: imageY }}
        >
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover opacity-30"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-charcoal/60 via-charcoal/40 to-charcoal/80" />
        </motion.div>
      ) : (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-charcoal via-charcoal/95 to-charcoal/85"
          style={prefersReducedMotion ? {} : { y: imageY }}
        />
      )}

      {/* Grain texture */}
      <div className="texture-grain absolute inset-0" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 text-center sm:py-28">
        {eyebrow && (
          <ScrollReveal distance={10} delay={0}>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              {eyebrow}
            </p>
          </ScrollReveal>
        )}

        <SplitText
          as="h1"
          className="mt-4 justify-center font-serif text-[clamp(2.5rem,8vw,5rem)] leading-[1.1] text-white"
          splitBy="word"
          animation="clipY"
          staggerDelay={0.04}
          delay={0.15}
        >
          {title}
        </SplitText>

        {subtitle && (
          <ScrollReveal delay={0.3} distance={15}>
            <p className="mx-auto mt-6 max-w-2xl text-base text-white/70 sm:text-lg">
              {subtitle}
            </p>
          </ScrollReveal>
        )}

        {children && (
          <ScrollReveal delay={0.5} distance={10}>
            <div className="mt-8">{children}</div>
          </ScrollReveal>
        )}
      </div>
    </div>
  );
}
