"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const testimonials = [
  {
    quote:
      "We ducked into a ramen shop down a Kyoto backstreet — no English sign, six seats, steam everywhere. Best bowl of our lives.",
    author: "Sarah Chen",
    location: "San Francisco",
  },
  {
    quote:
      "Five trips to Japan and Koku still found places I'd never heard of. A cedar forest shrine at dawn, completely alone. My friends thought I'd hired a private guide.",
    author: "Marcus Johnson",
    location: "London",
  },
  {
    quote:
      "The itinerary didn't feel algorithmic — it felt like someone who actually lives there planned it for us. A moss garden in Kanazawa I would have walked right past.",
    author: "Yuki Tanaka",
    location: "Vancouver",
  },
];

export function TestimonialSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const current = testimonials[currentIndex]!;

  return (
    <section className="relative overflow-hidden bg-charcoal">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("/grain.svg")' }} />
      {/* Oversized decorative quotation mark */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none font-serif italic text-[40vw] leading-none text-foreground/[0.04]">
        &ldquo;
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-24 sm:py-32">
        {/* Section eyebrow */}
        <ScrollReveal>
          <p className="mb-16 text-center text-sm font-medium uppercase tracking-widest text-white/40">
            Traveler Stories
          </p>
        </ScrollReveal>

        {/* Testimonial with crossfade */}
        <div className="min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-center"
            >
              <blockquote>
                <p className="mx-auto max-w-3xl font-serif italic text-xl leading-relaxed text-white/90 sm:text-2xl lg:text-3xl">
                  &ldquo;{current.quote}&rdquo;
                </p>
              </blockquote>

              <motion.footer
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="mt-10"
              >
                <p className="font-medium text-white">{current.author}</p>
                <p className="mt-1 text-sm text-white/50">
                  {current.location}
                </p>
              </motion.footer>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots indicator */}
        <div className="mt-12 flex items-center justify-center gap-3">
          {testimonials.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className="relative h-2 w-2 rounded-full bg-white/20 transition-colors"
              aria-label={`Go to testimonial ${index + 1}`}
            >
              {index === currentIndex && (
                <motion.div
                  layoutId="testimonial-dot"
                  className="absolute inset-0 rounded-full bg-white/80"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
