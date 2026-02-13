"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Plane, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { easeCinematicMut } from "@/lib/motion";
import type { RegionDescription } from "@/data/regionDescriptions";

type RegionRowProps = {
  index: number;
  region: RegionDescription;
  cityNames: string[];
  matchScore: number;
  selectedCityCount: number;
  totalCityCount: number;
  isHovered: boolean;
  isRecommended: boolean;
  isEntryPointRegion: boolean;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
};

export function RegionRow({
  index,
  region,
  cityNames,
  matchScore,
  selectedCityCount,
  totalCityCount,
  isHovered,
  isRecommended,
  isEntryPointRegion,
  onClick,
  onHover,
  onLeave,
}: RegionRowProps) {
  const prefersReducedMotion = useReducedMotion();
  const hasSelection = selectedCityCount > 0;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      aria-pressed={hasSelection}
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: index * 0.08,
        duration: 0.6,
        ease: easeCinematicMut,
      }}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-4 border-b px-4 py-4 text-left transition-colors duration-300 lg:px-5 lg:py-5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        hasSelection
          ? "border-border bg-brand-primary/5"
          : "border-border/50 hover:border-border",
      )}
    >
      {/* Index number */}
      <span className={cn(
        "shrink-0 font-mono text-xs tabular-nums transition-colors duration-300",
        hasSelection || isHovered ? "text-foreground-secondary" : "text-stone",
      )}>
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Region name + city subtitle */}
      <div className="flex-1 min-w-0">
        <span className={cn(
          "block font-serif text-xl italic tracking-tight transition-colors duration-300 sm:text-2xl",
          hasSelection || isHovered ? "text-foreground" : "text-foreground-secondary",
        )}>
          {region.name}
        </span>
        {cityNames.length > 0 && (
          <span className="block text-xs text-stone transition-colors duration-300 mt-0.5">
            {cityNames.join(" · ")}
          </span>
        )}
      </div>

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
        hasSelection || isHovered ? "text-foreground-secondary" : "text-stone",
      )}>
        {matchScore}%
      </span>

      {/* City dots */}
      <div className="flex shrink-0 items-center gap-[3px]">
        {Array.from({ length: totalCityCount }).map((_, i) => {
          const isFilled = i < selectedCityCount;
          return prefersReducedMotion ? (
            <div
              key={i}
              className={cn(
                "h-[6px] w-[6px] rounded-full",
                isFilled ? "bg-brand-primary" : "border border-border",
              )}
            />
          ) : (
            <motion.div
              key={i}
              initial={false}
              animate={{
                scale: isFilled ? 1 : 0.85,
                backgroundColor: isFilled ? "var(--color-brand-primary)" : "transparent",
                borderColor: isFilled ? "var(--color-brand-primary)" : "var(--color-border)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="h-[6px] w-[6px] rounded-full border"
              style={{ borderWidth: isFilled ? 0 : 1 }}
            />
          );
        })}
      </div>
    </motion.button>
  );
}
