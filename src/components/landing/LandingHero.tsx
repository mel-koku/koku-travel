"use client";

import Image from "next/image";
import { motion } from "framer-motion";

type LandingHeroProps = {
  locationCount: number;
};

export function LandingHero({ locationCount }: LandingHeroProps) {
  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Full-bleed background image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80"
          alt="Fushimi Inari shrine path in Kyoto"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl"
        >
          {/* Eyebrow */}
          <p className="mb-6 text-sm font-medium uppercase tracking-[0.2em] text-white/80">
            {locationCount.toLocaleString()}+ local-approved spots
          </p>

          {/* Main Headline - Serif */}
          <h1 className="font-serif text-5xl font-medium leading-[1.1] text-white sm:text-6xl md:text-7xl lg:text-8xl">
            Discover Japan
            <br />
            <span className="italic">like a local</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-8 max-w-xl text-lg text-white/90 sm:text-xl">
            Every place handpicked by people who call Japan home.
            No tourist traps. Just the real thing.
          </p>

          {/* CTA */}
          <div className="mt-12">
            <a
              href="/trip-builder"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-base font-semibold text-earthy-charcoal shadow-sm transition-all hover:bg-white/90 hover:shadow-md"
            >
              Start Planning
            </a>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-3 text-white/60"
          >
            <span className="text-xs uppercase tracking-widest">Scroll</span>
            <div className="h-12 w-px bg-gradient-to-b from-white/60 to-transparent" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
