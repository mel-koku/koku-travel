"use client";

import Image from "next/image";
import { motion, AnimatePresence, type MotionValue } from "framer-motion";
import type { Location } from "@/types/location";

type ExploreHeroSlideProps = {
  location: Location;
  opacity: MotionValue<number>;
  scale: MotionValue<number>;
  isActive: boolean;
  index: number;
  /** When false, only image is shown (no text overlay). Used to avoid overlapping with EXPLORE headline. */
  showText?: boolean;
};

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export function ExploreHeroSlide({
  location,
  opacity,
  scale,
  isActive,
  index,
  showText = true,
}: ExploreHeroSlideProps) {
  const imageSrc = location.primaryPhotoUrl ?? location.image ?? FALLBACK_IMAGE;
  const description =
    location.editorialSummary ||
    location.shortDescription ||
    location.description ||
    "";

  return (
    <motion.div
      className="absolute inset-0"
      style={{ opacity, scale }}
      aria-hidden={!isActive}
    >
      {/* Background image */}
      <Image
        src={imageSrc}
        alt={location.name}
        fill
        unoptimized
        className="object-cover"
        sizes="100vw"
        priority={index < 2}
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/40 to-charcoal/20" />

      {/* Text overlay — hidden when showText is false (during EXPLORE headline phase) */}
      <AnimatePresence>
        {isActive && showText && (
          <motion.div
            className="absolute inset-x-0 bottom-0 z-10 px-6 pb-24 sm:px-12 sm:pb-28 lg:pb-32 lg:px-16 flex flex-col items-center sm:items-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* City label */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.25em] text-white/60 mb-3"
            >
              {location.city}, {location.region}
            </motion.p>

            {/* Location name */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{
                duration: 0.7,
                delay: 0.15,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="font-serif text-[clamp(2rem,6vw,4rem)] font-medium leading-[1.05] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            >
              {location.name}
            </motion.h2>

            {/* Description */}
            {description && (
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="mt-3 max-w-md text-sm sm:text-base text-white/70 leading-relaxed line-clamp-2 text-center sm:text-left"
              >
                {description.length > 140
                  ? `${description.slice(0, 137)}...`
                  : description}
              </motion.p>
            )}

            {/* Category badge */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="mt-4 flex items-center h-6 bg-white/10 backdrop-blur-sm px-3 rounded-full"
            >
              <span className="text-[10px] sm:text-xs font-medium text-white/80 capitalize">
                {location.category}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
