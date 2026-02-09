"use client";

import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { SplitText } from "@/components/ui/SplitText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export function FeatureShowcase() {
  return (
    <section className="bg-background">
      {/* Feature 1: Full-width with parallax image + overlapping text */}
      <FeatureFullWidth />

      {/* Feature 2: 70/30 asymmetric split */}
      <Feature70_30 />

      {/* Feature 3: 40/60 reversed split with text overlapping image */}
      <Feature40_60 />
    </section>
  );
}

function FeatureFullWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  const imageScale = useTransform(scrollYProgress, [0, 0.5], [1.1, 1]);

  return (
    <div ref={ref} className="relative min-h-[80vh] overflow-hidden">
      <motion.div
        className="absolute inset-[-10%] h-[120%] w-[120%]"
        style={prefersReducedMotion ? {} : { y: imageY, scale: imageScale }}
      >
        <Image
          src="https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1920&q=80"
          alt="Traditional Japanese alley"
          fill
          className="object-cover"
          sizes="100vw"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal/80 via-charcoal/50 to-transparent" />

      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="max-w-lg text-white">
            <ScrollReveal direction="left" distance={30}>
              <p className="text-sm font-medium uppercase tracking-widest text-white/60">
                Explore
              </p>
            </ScrollReveal>
            <SplitText
              as="h2"
              className="mt-4 font-serif italic text-2xl text-white sm:text-3xl"
              splitBy="word"
              animation="clipY"
              delay={0.1}
            >
              The places locals keep to themselves
            </SplitText>
            <ScrollReveal delay={0.3}>
              <p className="mt-6 text-base leading-relaxed text-white/80">
                Every place in our collection was found the same way you&apos;d
                find it if you lived here — word of mouth, wandering, and years
                of knowing where to look.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature70_30() {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["5%", "-5%"]);

  return (
    <div
      ref={ref}
      className="mx-auto grid max-w-7xl lg:grid-cols-[7fr_3fr] lg:min-h-[70vh]"
    >
      {/* 70% image with parallax */}
      <div className="relative aspect-square overflow-hidden lg:aspect-auto">
        <motion.div
          className="absolute inset-[-5%] h-[110%] w-[110%]"
          style={prefersReducedMotion ? {} : { y: imageY }}
        >
          <Image
            src="https://images.unsplash.com/photo-1624253321171-1be53e12f5f4?w=800&q=80"
            alt="Peaceful Japanese garden"
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 70vw, 100vw"
          />
        </motion.div>
      </div>

      {/* 30% text — overlaps into image with negative margin */}
      <div className="relative z-10 flex items-center bg-surface px-6 py-20 lg:-ml-16 lg:py-32">
        <div className="lg:max-w-sm">
          <ScrollReveal>
            <p className="text-sm font-medium uppercase tracking-widest text-brand-primary">
              Plan
            </p>
          </ScrollReveal>
          <SplitText
            as="h2"
            className="mt-4 font-serif italic text-2xl text-foreground sm:text-3xl"
            splitBy="word"
            animation="clipY"
            delay={0.1}
          >
            Build your days, your way
          </SplitText>
          <ScrollReveal delay={0.2}>
            <p className="mt-6 text-base leading-relaxed text-foreground-secondary">
              Drag activities into place, swap things around, and watch
              travel times update in real time. Planning should feel like
              anticipation, not homework.
            </p>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}

function Feature40_60() {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["5%", "-5%"]);

  return (
    <div
      ref={ref}
      className="mx-auto grid max-w-7xl lg:grid-cols-[4fr_6fr] lg:min-h-[70vh]"
    >
      {/* 40% text — overlaps into image */}
      <div className="relative z-10 flex items-center px-6 py-20 lg:py-32 lg:pr-0">
        <div className="lg:max-w-sm">
          <ScrollReveal>
            <p className="text-sm font-medium uppercase tracking-widest text-brand-primary">
              Access
            </p>
          </ScrollReveal>
          <SplitText
            as="h2"
            className="mt-4 font-serif italic text-2xl text-foreground sm:text-3xl"
            splitBy="word"
            animation="clipY"
            delay={0.1}
          >
            Your itinerary, everywhere
          </SplitText>
          <ScrollReveal delay={0.2}>
            <p className="mt-6 text-base leading-relaxed text-foreground-secondary">
              Start on your laptop, check it on the Shinkansen, share it
              with friends. Your plan lives in the cloud, ready when you are.
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* 60% image with parallax */}
      <div className="relative aspect-square overflow-hidden lg:-ml-8 lg:aspect-auto">
        <motion.div
          className="absolute inset-[-5%] h-[110%] w-[110%]"
          style={prefersReducedMotion ? {} : { y: imageY }}
        >
          <Image
            src="https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?w=800&q=80"
            alt="Japanese train station"
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 60vw, 100vw"
          />
        </motion.div>
      </div>
    </div>
  );
}
