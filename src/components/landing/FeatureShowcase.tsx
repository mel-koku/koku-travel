"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function FeatureShowcase() {
  return (
    <section className="bg-cream">
      {/* Feature 1: Full-width image with text overlay */}
      <div className="relative min-h-[80vh]">
        <Image
          src="https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1920&q=80"
          alt="Traditional Japanese alley"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0 flex items-center"
        >
          <div className="mx-auto w-full max-w-7xl px-6">
            <div className="max-w-lg text-white">
              <p className="text-sm font-medium uppercase tracking-widest text-white/70">
                Explore
              </p>
              <h2 className="mt-4 font-serif text-2xl font-medium sm:text-3xl">
                The places guidebooks
                <br />
                <span className="italic">don&apos;t know about</span>
              </h2>
              <p className="mt-6 text-base leading-relaxed text-white/80">
                Every spot in our collection has been personally visited and approved by
                locals who know the difference between tourist-trap and treasure.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Feature 2: Split layout */}
      <div className="mx-auto grid max-w-7xl lg:grid-cols-2 lg:min-h-[70vh]">
        <div className="flex items-center px-6 py-20 lg:py-32 lg:pr-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-sm font-medium uppercase tracking-widest text-brand-primary">
              Plan
            </p>
            <h2 className="mt-4 font-serif text-2xl font-medium text-charcoal sm:text-3xl">
              Drag, drop,
              <br />
              <span className="italic">done</span>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-warm-gray">
              Building your itinerary should feel like play, not homework.
              Our editor lets you arrange your days effortlessly, with smart
              suggestions and real-time travel times.
            </p>
          </motion.div>
        </div>
        <div className="relative aspect-square lg:aspect-auto">
          <Image
            src="https://images.unsplash.com/photo-1624253321171-1be53e12f5f4?w=800&q=80"
            alt="Peaceful Japanese garden"
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
        </div>
      </div>

      {/* Feature 3: Split layout reversed */}
      <div className="mx-auto grid max-w-7xl lg:grid-cols-2 lg:min-h-[70vh]">
        <div className="relative aspect-square lg:aspect-auto lg:order-1">
          <Image
            src="https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?w=800&q=80"
            alt="Japanese train station"
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
        </div>
        <div className="flex items-center px-6 py-20 lg:order-2 lg:py-32 lg:pl-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-sm font-medium uppercase tracking-widest text-brand-primary">
              Access
            </p>
            <h2 className="mt-4 font-serif text-2xl font-medium text-charcoal sm:text-3xl">
              Your trip,
              <br />
              <span className="italic">everywhere</span>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-warm-gray">
              Start planning on your laptop, check it on the train, share it
              with friends. Your itinerary lives in the cloud, ready whenever you are.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
