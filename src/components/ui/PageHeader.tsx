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
  variant: "rich" | "compact";
  imageUrl?: string;
  children?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  variant,
  imageUrl,
  children,
}: PageHeaderProps) {
  if (variant === "rich") {
    return (
      <RichHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        imageUrl={imageUrl}
      >
        {children}
      </RichHeader>
    );
  }

  return (
    <CompactHeader
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
    >
      {children}
    </CompactHeader>
  );
}

function RichHeader({
  eyebrow,
  title,
  subtitle,
  imageUrl,
  children,
}: Omit<PageHeaderProps, "variant">) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-[50vh] items-center justify-center overflow-hidden bg-charcoal sm:min-h-[55vh]"
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
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-charcoal/60 via-charcoal/50 to-charcoal/80" />
        </motion.div>
      ) : (
        <>
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-charcoal via-charcoal/95 to-charcoal/85"
            style={prefersReducedMotion ? {} : { y: imageY }}
          />
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }} />
        </>
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
          staggerDelay={0.06}
          delay={0.1}
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

function CompactHeader({
  eyebrow,
  title,
  subtitle,
  children,
}: Omit<PageHeaderProps, "variant" | "imageUrl">) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-background via-surface/50 to-background py-16 sm:py-24">
      {/* Grain texture */}
      <div className="texture-grain absolute inset-0" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
        {eyebrow && (
          <ScrollReveal distance={10} delay={0}>
            <p className="text-xs uppercase tracking-[0.3em] text-brand-primary">
              {eyebrow}
            </p>
          </ScrollReveal>
        )}

        <SplitText
          as="h1"
          className="mt-4 justify-center font-serif text-[clamp(2rem,6vw,4rem)] leading-[1.1] text-charcoal"
          splitBy="word"
          animation="clipY"
          staggerDelay={0.06}
          delay={0.1}
        >
          {title}
        </SplitText>

        {subtitle && (
          <ScrollReveal delay={0.3} distance={15}>
            <p className="mx-auto mt-4 max-w-2xl text-base text-warm-gray">
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
