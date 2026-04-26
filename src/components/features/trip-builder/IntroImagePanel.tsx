"use client";

import Image from "next/image";
import { m, useReducedMotion } from "framer-motion";
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
      <m.div
        className="relative overflow-hidden rounded-lg aspect-[4/3] lg:aspect-[3/4] lg:max-h-[70vh]"
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

      </m.div>

      {/* Caption */}
      {caption && (
        <m.p
          className="font-mono text-[10px] uppercase tracking-widest text-stone"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: durationFast, delay: 1.6 }}
        >
          {caption}
        </m.p>
      )}
    </div>
  );
}
