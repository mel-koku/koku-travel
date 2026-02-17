"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { easeCinematic, durationCinematic, durationFast, easeCinematicCSS } from "@/lib/motion";

type IntroImagePanelProps = {
  src: string;
  caption?: string;
  delay?: number;
};

export function IntroImagePanel({
  src,
  caption,
  delay = 0.6,
}: IntroImagePanelProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex w-full flex-col gap-3">
      {/* Image container with clip-path reveal */}
      <motion.div
        className="relative overflow-hidden rounded-xl aspect-[4/3] lg:aspect-[3/4] lg:max-h-[70vh]"
        initial={
          prefersReducedMotion
            ? { opacity: 1 }
            : { clipPath: "inset(0 0 100% 0)" }
        }
        animate={
          prefersReducedMotion
            ? { opacity: 1 }
            : { clipPath: "inset(0 0 0% 0)" }
        }
        transition={{
          duration: durationCinematic,
          ease: easeCinematic,
          delay,
        }}
      >
        {/* Ken Burns image */}
        <Image
          src={src}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 45vw"
          priority
          style={
            prefersReducedMotion
              ? {}
              : {
                  animation: `intro-ken-burns 8s ${easeCinematicCSS} forwards`,
                  animationDelay: `${delay}s`,
                  transform: "scale(1.05)",
                }
          }
        />

        {/* Bottom-edge vignette for blending */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-charcoal/50 to-transparent" />
      </motion.div>

      {/* Caption */}
      {caption && (
        <motion.p
          className="font-mono text-[10px] uppercase tracking-widest text-stone"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: durationFast, delay: 1.6 }}
        >
          {caption}
        </motion.p>
      )}
    </div>
  );
}
