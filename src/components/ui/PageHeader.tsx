"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { parallaxSubtle } from "@/lib/motion";

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

  const imageY = useTransform(scrollYProgress, [0, 1], [parallaxSubtle.from, parallaxSubtle.to]);

  const minHeight = compact
    ? "min-h-[30vh] sm:min-h-[35vh]"
    : "min-h-[40vh] sm:min-h-[50vh]";

  return (
    <div
      ref={containerRef}
      className={`relative -mt-20 flex ${minHeight} items-center justify-center overflow-hidden bg-background pt-20`}
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
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/80" />
        </motion.div>
      ) : (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/85"
          style={prefersReducedMotion ? {} : { y: imageY }}
        />
      )}

      {/* Grain texture */}
      <div className="texture-grain absolute inset-0" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-12 text-center sm:py-20 lg:py-28">
        {eyebrow && (
          <ScrollReveal distance={10} delay={0}>
            <p className="eyebrow-editorial text-foreground-secondary">
              {eyebrow}
            </p>
          </ScrollReveal>
        )}

        <ScrollReveal delay={0.15}>
          <h1 className="mt-4 font-serif italic text-[clamp(2.5rem,8vw,5rem)] leading-[1.1] text-foreground">
            {title}
          </h1>
        </ScrollReveal>

        {subtitle && (
          <ScrollReveal delay={0.3} distance={15}>
            <p className="mx-auto mt-6 max-w-2xl text-base text-foreground-secondary sm:text-lg">
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
