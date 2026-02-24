"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

const REGION_IMAGES = [
  { src: "/images/regions/kansai-hero.jpg", label: "Kansai" },
  { src: "/images/regions/kanto-hero.jpg", label: "Kanto" },
  { src: "/images/regions/chubu-hero.jpg", label: "Chubu" },
  { src: "/images/regions/kyushu-hero.jpg", label: "Kyushu" },
  { src: "/images/regions/hokkaido-hero.jpg", label: "Hokkaido" },
  { src: "/images/regions/tohoku-hero.jpg", label: "Tohoku" },
  { src: "/images/regions/chugoku-hero.jpg", label: "Chugoku" },
  { src: "/images/regions/shikoku-hero.jpg", label: "Shikoku" },
  { src: "/images/regions/okinawa-hero.jpg", label: "Okinawa" },
];

const TAGLINES = [
  "Every path tells a story",
  "Journey through living tradition",
  "Beyond the Japan guidebook",
];

// Default to first entries for SSR, randomized on mount
const DEFAULT_IMAGE = REGION_IMAGES[0]!;
const DEFAULT_TAGLINE = TAGLINES[0]!;

export function MenuPanel() {
  const prefersReducedMotion = useReducedMotion();
  const [image, setImage] = useState(DEFAULT_IMAGE);
  const [tagline, setTagline] = useState(DEFAULT_TAGLINE);

  // Randomize on mount (client-side only)
  useEffect(() => {
    setImage(REGION_IMAGES[Math.floor(Math.random() * REGION_IMAGES.length)]!);
    setTagline(TAGLINES[Math.floor(Math.random() * TAGLINES.length)]!);
  }, []);

  return (
    <motion.div
      className="relative hidden h-full overflow-hidden lg:block"
      initial={prefersReducedMotion ? undefined : { opacity: 0 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0 }}
      transition={prefersReducedMotion ? undefined : { duration: 0.6, delay: 0.3 }}
    >
      {/* Image with slow zoom */}
      <div className="absolute inset-0 animate-menu-panel-zoom">
        <Image
          src={image.src}
          alt={image.label}
          fill
          className="object-cover"
          sizes="40vw"
          priority
        />
      </div>

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/40 to-transparent" />

      {/* Bottom-left content */}
      <div className="absolute bottom-12 left-8 right-8">
        <p className="font-serif text-xl italic text-white/90">
          {tagline}
        </p>
        <p className="mt-2 text-sm text-white/50">
          {image.label} Region
        </p>
      </div>
    </motion.div>
  );
}
