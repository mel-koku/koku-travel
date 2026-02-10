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
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { parallaxSection, staggerWord } from "@/lib/motion";
import type { LandingPageContent } from "@/types/sanitySiteContent";

const defaultTestimonials = [
  {
    quote:
      "We ducked into a ramen shop down a Kyoto backstreet — no English sign, six seats, steam everywhere. Best bowl of our lives.",
    author: "Sarah Chen",
    location: "San Francisco",
    image:
      "https://images.unsplash.com/photo-1554797589-7241bb691973?w=1920&q=80",
    alt: "Narrow Kyoto backstreet at night with warm lantern light",
  },
  {
    quote:
      "Five trips to Japan and Koku still found places I'd never heard of. A cedar forest shrine at dawn, completely alone.",
    author: "Marcus Johnson",
    location: "London",
    image:
      "https://images.unsplash.com/photo-1440186347098-386b7459ad6b?w=1920&q=80",
    alt: "Misty cedar forest with ancient stone path",
  },
  {
    quote:
      "The itinerary didn't feel algorithmic — it felt like someone who actually lives there planned it for us.",
    author: "Yuki Tanaka",
    location: "Vancouver",
    image:
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1920&q=80",
    alt: "Quiet Japanese alleyway with traditional architecture",
  },
];

type TestimonialData = {
  quote: string;
  author: string;
  location: string;
  image: string;
  alt: string;
};

type TestimonialTheaterProps = {
  content?: LandingPageContent;
};

export function TestimonialTheater({ content }: TestimonialTheaterProps) {
  const testimonials: TestimonialData[] = content?.testimonials?.length
    ? content.testimonials.map((t) => ({
        quote: t.quote,
        author: t.authorName,
        location: t.authorLocation,
        image: t.image?.url ?? defaultTestimonials[0]!.image,
        alt: t.alt,
      }))
    : defaultTestimonials;

  return (
    <section>
      {testimonials.map((testimonial, index) => (
        <TestimonialSpread
          key={index}
          testimonial={testimonial}
          index={index}
          flip={index % 2 === 1}
          priority={index === 0}
        />
      ))}
    </section>
  );
}

function TestimonialSpread({
  testimonial,
  index,
  flip,
  priority = false,
}: {
  testimonial: TestimonialData;
  index: number;
  flip: boolean;
  priority?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const imageScale = useTransform(scrollYProgress, [0, 1], [parallaxSection.from, parallaxSection.to]);

  return (
    <div
      ref={containerRef}
      className={`grid min-h-[50vh] lg:min-h-[70vh] lg:grid-cols-2 ${
        flip ? "" : ""
      }`}
    >
      {/* Image half */}
      <div
        className={`relative min-h-[40vh] overflow-hidden lg:min-h-[70vh] ${
          flip ? "lg:order-2" : ""
        }`}
      >
        <motion.div
          className="absolute inset-0"
          style={
            prefersReducedMotion
              ? {}
              : { scale: imageScale }
          }
        >
          <Image
            src={testimonial.image}
            alt={testimonial.alt}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority={priority}
          />
        </motion.div>
        {/* Subtle edge gradient toward the text side */}
        <div
          className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-charcoal/40 lg:to-transparent ${
            flip
              ? "lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-charcoal/30"
              : "lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-charcoal/30"
          }`}
        />
        {/* Index number */}
        <div className="absolute bottom-6 left-6 lg:bottom-auto lg:left-auto lg:right-6 lg:top-6">
          <span className="font-mono text-sm text-white/30">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Quote half */}
      <div
        className={`flex items-center bg-charcoal px-8 py-12 sm:py-20 lg:py-28 sm:px-12 lg:px-16 ${
          flip ? "lg:order-1" : ""
        }`}
      >
        <div className="max-w-lg">
          {/* Oversized quotation mark */}
          <span className="block select-none font-serif italic text-[6rem] leading-none text-foreground/[0.06]">
            &ldquo;
          </span>

          <blockquote className="-mt-12">
            <SplitText
              as="p"
              className="font-serif italic text-xl leading-relaxed text-white/90 sm:text-2xl"
              splitBy="word"
              animation="fadeUp"
              staggerDelay={staggerWord}
              delay={0.1}
            >
              {testimonial.quote}
            </SplitText>
          </blockquote>

          <ScrollReveal delay={0.4}>
            <div className="mt-10">
              <div className="mb-4 h-px w-8 bg-brand-primary/60" />
              <p className="text-sm font-medium text-white">
                {testimonial.author}
              </p>
              <p className="mt-0.5 text-xs text-white/40">
                {testimonial.location}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
