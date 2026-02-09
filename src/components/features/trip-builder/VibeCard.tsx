"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

const CINEMATIC_EASE: [number, number, number, number] = [0.215, 0.61, 0.355, 1];

type VibeCardProps = {
  name: string;
  description: string;
  image: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  index: number;
  isSelected: boolean;
  isDisabled: boolean;
  isHovered: boolean;
  onToggle: () => void;
  onHover: () => void;
  onLeave: () => void;
};

export function VibeCard({
  name,
  description,
  image,
  icon: Icon,
  index,
  isSelected,
  isDisabled,
  isHovered,
  onToggle,
  onHover,
  onLeave,
}: VibeCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      aria-pressed={isSelected}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      className={cn(
        "group relative h-full w-full cursor-pointer overflow-hidden text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isSelected && "ring-2 ring-inset ring-brand-primary/80",
        isDisabled && "pointer-events-none opacity-30"
      )}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        ease: CINEMATIC_EASE,
        delay: index * 0.12,
      }}
    >
      {/* Background image with Ken Burns zoom */}
      <div className="absolute inset-0">
        <Image
          src={image}
          alt={name}
          fill
          className={cn(
            "object-cover transition-transform duration-[1.4s]",
            isHovered || isSelected ? "scale-110" : "scale-100"
          )}
          style={{
            transitionTimingFunction: "cubic-bezier(0.215, 0.61, 0.355, 1)",
          }}
          sizes="(max-width: 1024px) 72vw, 33vw"
        />
      </div>

      {/* Gradient overlay — more dramatic, lightens on hover */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-700",
          isHovered
            ? "bg-gradient-to-t from-charcoal/80 via-charcoal/30 to-charcoal/5"
            : "bg-gradient-to-t from-charcoal/90 via-charcoal/50 to-charcoal/15"
        )}
        style={{
          transitionTimingFunction: "cubic-bezier(0.215, 0.61, 0.355, 1)",
        }}
      />

      {/* Editorial index number — top left, fades in on hover */}
      <div
        className={cn(
          "absolute left-4 top-4 font-mono text-xs text-white/40 transition-opacity duration-500",
          isHovered ? "opacity-100" : "opacity-0"
        )}
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Selected check badge — top right */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg"
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </motion.div>
      )}

      {/* Content at bottom */}
      <div className="absolute inset-x-0 bottom-0 p-4 lg:p-5">
        {/* Accent line — expands + turns brand-primary on hover */}
        <div
          className={cn(
            "mb-3 h-px transition-all duration-700",
            isHovered || isSelected
              ? "w-12 bg-brand-primary"
              : "w-6 bg-white/30"
          )}
          style={{
            transitionTimingFunction: "cubic-bezier(0.215, 0.61, 0.355, 1)",
          }}
        />

        {/* Icon — subtle */}
        <Icon className="h-5 w-5 text-white/60" />

        {/* Name — large serif italic */}
        <h3 className="mt-2 font-serif text-xl italic text-white lg:text-2xl">
          {name}
        </h3>

        {/* Description */}
        <p className="mt-1 text-xs leading-relaxed text-white/50 lg:text-sm">
          {description}
        </p>
      </div>
    </motion.button>
  );
}
