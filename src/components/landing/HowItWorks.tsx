"use client";

import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { SplitText } from "@/components/ui/SplitText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const steps = [
  {
    number: "01",
    title: "Pick your cities",
    description:
      "Tokyo, Kyoto, Osaka — or somewhere the crowds haven't found yet.",
    image:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
    alt: "Tokyo cityscape at night",
  },
  {
    number: "02",
    title: "Set your pace",
    description:
      "Temples at dawn? Street food crawls? Tell us what moves you.",
    image:
      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
    alt: "Traditional Japanese street",
  },
  {
    number: "03",
    title: "Get your plan",
    description:
      "A day-by-day itinerary built from places locals actually go.",
    image:
      "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80",
    alt: "Cherry blossoms in Japan",
  },
];

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  return (
    <section ref={containerRef} className="relative bg-background">
      {/* Sticky scroll-pinned container */}
      <div className="relative">
        {/* Section header */}
        <div className="px-6 pt-24 sm:pt-32">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal>
              <p className="text-sm font-medium uppercase tracking-widest text-brand-primary">
                How It Works
              </p>
            </ScrollReveal>
            <SplitText
              as="h2"
              className="mt-4 font-serif italic text-2xl text-foreground sm:text-3xl"
              splitBy="word"
              animation="clipY"
              delay={0.1}
            >
              From idea to itinerary
            </SplitText>
          </div>
        </div>

        {/* Scroll-pinned steps */}
        <div className="mt-16 pb-24 sm:mt-20 sm:pb-32">
          {steps.map((step, index) => (
            <StepSection
              key={step.number}
              step={step}
              index={index}
              scrollProgress={scrollYProgress}
              reducedMotion={!!prefersReducedMotion}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepSection({
  step,
  index,
  reducedMotion,
}: {
  step: (typeof steps)[number];
  index: number;
  scrollProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  reducedMotion: boolean;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: sectionProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"],
  });

  // Image reveal: scale + opacity as section enters view (GPU-accelerated)
  const imageScale = useTransform(sectionProgress, [0, 0.8], [0.6, 1]);
  const imageOpacity = useTransform(sectionProgress, [0, 0.5], [0, 1]);

  const isReversed = index % 2 === 1;

  return (
    <div
      ref={sectionRef}
      className={`mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12 sm:py-16 lg:flex-row lg:items-center lg:gap-16 ${
        isReversed ? "lg:flex-row-reverse" : ""
      }`}
    >
      {/* Image with clip-path reveal */}
      <div className="flex-1">
        <motion.div
          className="relative aspect-[4/3] overflow-hidden rounded-xl"
          style={reducedMotion ? {} : { scale: imageScale, opacity: imageOpacity }}
        >
          <Image
            src={step.image}
            alt={step.alt}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
        </motion.div>
      </div>

      {/* Content */}
      <div className="flex-1 lg:max-w-md">
        {/* Watermark number */}
        <div className="relative overflow-visible">
          <span className="absolute -left-4 -top-20 select-none font-serif italic text-[12vw] leading-none text-foreground/[0.03] lg:-top-16 lg:text-[8vw]">
            {step.number}
          </span>
        </div>

        <ScrollReveal delay={0.1}>
          <span className="font-serif italic text-3xl text-stone/40 sm:text-4xl">
            {step.number}
          </span>
        </ScrollReveal>

        <SplitText
          as="h3"
          className="mt-4 font-serif italic text-xl text-foreground"
          splitBy="word"
          animation="fadeUp"
          delay={0.15}
        >
          {step.title}
        </SplitText>

        <ScrollReveal delay={0.25}>
          <p className="mt-4 text-base leading-relaxed text-foreground-secondary">
            {step.description}
          </p>
        </ScrollReveal>
      </div>
    </div>
  );
}
