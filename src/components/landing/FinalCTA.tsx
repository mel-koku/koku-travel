"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function FinalCTA() {
  return (
    <section className="relative min-h-[70vh] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1480796927426-f609979314bd?w=1920&q=80"
          alt="Tokyo street at night"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-earthy-charcoal/95 via-earthy-charcoal/80 to-earthy-charcoal/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-[70vh] items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl"
        >
          <h2 className="font-serif text-4xl font-medium text-white sm:text-5xl lg:text-6xl">
            Your Japan story
            <br />
            <span className="italic">starts here</span>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-lg text-white/80">
            Join thousands of travelers who discovered the Japan that
            locals actually experience.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/trip-builder"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-base font-semibold text-earthy-charcoal shadow-sm transition-all hover:bg-white/90 hover:shadow-md"
            >
              Start Planning
            </a>
            <a
              href="/explore"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 bg-transparent px-8 text-base font-semibold text-white transition-all hover:bg-white/10"
            >
              Browse Locations
            </a>
          </div>

          <p className="mt-8 text-sm text-white/50">
            Free to use. No account required.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
