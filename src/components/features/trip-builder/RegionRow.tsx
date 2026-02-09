"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Plane, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import type { RegionDescription } from "@/data/regionDescriptions";

type RegionRowProps = {
  index: number;
  region: RegionDescription;
  matchScore: number;
  isSelected: boolean;
  isHovered: boolean;
  isRecommended: boolean;
  isEntryPointRegion: boolean;
  onToggle: () => void;
  onHover: () => void;
  onLeave: () => void;
};

const EASE_OUT_EXPO = [0.215, 0.61, 0.355, 1] as const;

export function RegionRow({
  index,
  region,
  matchScore,
  isSelected,
  isHovered,
  isRecommended,
  isEntryPointRegion,
  onToggle,
  onHover,
  onLeave,
}: RegionRowProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      aria-pressed={isSelected}
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: index * 0.08,
        duration: 0.6,
        ease: EASE_OUT_EXPO as [number, number, number, number],
      }}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-4 border-b px-4 py-4 text-left transition-colors duration-300 lg:px-5 lg:py-5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal",
        isSelected
          ? "border-white/10 bg-brand-primary/5"
          : "border-white/5 hover:border-white/10",
      )}
    >
      {/* Index number */}
      <span className={cn(
        "shrink-0 font-mono text-xs tabular-nums transition-colors duration-300",
        isSelected || isHovered ? "text-white/60" : "text-white/30",
      )}>
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Region name */}
      <span className={cn(
        "flex-1 font-serif text-xl italic tracking-tight transition-colors duration-300 sm:text-2xl",
        isSelected || isHovered ? "text-white" : "text-white/70",
      )}>
        {region.name}
      </span>

      {/* Badges */}
      <div className="flex items-center gap-2">
        {isEntryPointRegion && (
          <span className="hidden items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-accent sm:flex">
            <Plane className="h-3 w-3" />
            Arrival
          </span>
        )}
        {isRecommended && (
          <span className="hidden items-center gap-1 rounded-full bg-brand-primary/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-brand-primary sm:flex">
            <Star className="h-3 w-3 fill-current" />
            Recommended
          </span>
        )}
      </div>

      {/* Match score */}
      <span className={cn(
        "shrink-0 font-mono text-xs tabular-nums transition-colors duration-300",
        isSelected || isHovered ? "text-white/60" : "text-white/30",
      )}>
        {matchScore}%
      </span>

      {/* Checkmark */}
      <div className="flex h-6 w-6 shrink-0 items-center justify-center">
        {isSelected ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary"
          >
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          </motion.div>
        ) : (
          <div className={cn(
            "h-6 w-6 rounded-full border transition-colors duration-300",
            isHovered ? "border-white/30" : "border-white/10",
          )} />
        )}
      </div>
    </motion.button>
  );
}
