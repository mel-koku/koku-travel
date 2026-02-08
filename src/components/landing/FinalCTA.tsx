"use client";

import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { SplitText } from "@/components/ui/SplitText";
import { Magnetic } from "@/components/ui/Magnetic";

export function FinalCTA() {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Slow zoom parallax on background
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[80vh] overflow-hidden"
    >
      {/* Background Image with slow zoom */}
      <motion.div
        className="absolute inset-0"
        style={prefersReducedMotion ? {} : { scale: imageScale }}
      >
        <Image
          src="https://images.unsplash.com/photo-1718166130977-41caff62724e?w=1920&q=80"
          alt="Floating torii gate over water"
          fill
          className="object-cover"
          sizes="100vw"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-charcoal/70" />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex min-h-[80vh] items-center justify-center px-6 py-20 text-center">
        <div className="max-w-2xl">
          {/* Character-by-character headline on scroll */}
          <SplitText
            as="h2"
            className="justify-center font-serif text-2xl font-medium text-white sm:text-3xl lg:text-4xl"
            splitBy="char"
            animation="clipY"
            staggerDelay={0.02}
          >
            Your Japan story starts here
          </SplitText>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mx-auto mt-8 max-w-md text-base text-white/80"
          >
            Join thousands of travelers who discovered the Japan that locals
            actually experience.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Magnetic>
              <a
                href="/trip-builder"
                className="relative inline-flex h-14 items-center justify-center rounded-full bg-brand-primary px-10 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-brand-primary/90 hover:shadow-xl"
              >
                {/* Pulsing glow */}
                <span className="absolute inset-0 animate-pulse rounded-full bg-brand-primary/30 blur-xl" />
                <span className="relative">Start Planning</span>
              </a>
            </Magnetic>
            <Magnetic>
              <a
                href="/explore"
                className="inline-flex h-14 items-center justify-center rounded-full border border-white/30 bg-transparent px-10 text-sm font-semibold uppercase tracking-wider text-white transition-all hover:border-white/50 hover:bg-white/15 hover:shadow-lg"
              >
                Browse Locations
              </a>
            </Magnetic>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 1 }}
            className="mt-10 text-sm text-white/40"
          >
            Free to use. No account required.
          </motion.p>
        </div>
      </div>
    </section>
  );
}
