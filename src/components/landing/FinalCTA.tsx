"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function FinalCTA() {
  return (
    <section className="relative min-h-[80vh] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1718166130977-41caff62724e?w=1920&q=80"
          alt="Floating torii gate over water"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0" style={{ backgroundColor: "rgba(45, 42, 38, 0.6)" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-[80vh] items-center justify-center px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl"
        >
          <h2 className="font-serif text-2xl font-medium text-white sm:text-3xl lg:text-4xl">
            Your Japan story
            <br />
            <span className="italic">starts here</span>
          </h2>
          <p className="mx-auto mt-8 max-w-md text-base text-white/80">
            Join thousands of travelers who discovered the Japan that
            locals actually experience.
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/trip-builder"
              className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-charcoal shadow-sm transition-all hover:bg-white/90 hover:shadow-md"
            >
              Start Planning
            </a>
            <a
              href="/explore"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 bg-transparent px-8 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              Browse Locations
            </a>
          </div>

          <p className="mt-10 text-sm text-white/50">
            Free to use. No account required.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
