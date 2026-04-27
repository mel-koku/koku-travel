"use client";

import { m, useReducedMotion } from "framer-motion";
import { Check, Pin, Plane, PlaneTakeoff, Repeat, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { easeCinematicMut, durationBase } from "@/lib/motion";
import type { RegionDescription } from "@/data/regionDescriptions";

export type RegionSelectionState = "none" | "partial" | "full";

type RegionRowProps = {
  index: number;
  region: RegionDescription;
  cityNames: string[];
  regionName: string;
  additionalCityCount: number;
  matchScore: number;
  selectedCityCount: number;
  isHovered: boolean;
  isRecommended: boolean;
  isEntryPointRegion: boolean;
  isExitPointRegion: boolean;
  regionSelectionState: RegionSelectionState;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
};

export function RegionRow({
  index,
  region,
  cityNames,
  regionName,
  additionalCityCount,
  matchScore,
  selectedCityCount,
  isHovered,
  isRecommended,
  isEntryPointRegion,
  isExitPointRegion,
  regionSelectionState,
  onClick,
  onHover,
  onLeave,
  onKeyDown,
}: RegionRowProps) {
  const prefersReducedMotion = useReducedMotion();
  const hasSelection = selectedCityCount > 0;

  return (
    <m.button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      onKeyDown={onKeyDown}
      aria-pressed={hasSelection}
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: index * 0.08,
        duration: durationBase,
        ease: easeCinematicMut,
      }}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-4 border-b px-4 py-4 text-left backdrop-blur-sm transition-colors duration-300 lg:px-5 lg:py-5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        hasSelection
          ? "border-b-border bg-surface/60"
          : "border-b-border/50 bg-canvas/80 hover:border-b-border hover:bg-canvas/90",
      )}
    >
      {/* Index number */}
      <span className={cn(
        "shrink-0 font-mono text-xs tabular-nums transition-colors duration-300",
        hasSelection || isHovered ? "text-foreground-secondary" : "text-stone",
      )}>
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Region label + city names */}
      <div className="flex-1 min-w-0">
        <span className={cn(
          "block text-[10px] font-medium uppercase tracking-[0.15em] transition-colors duration-300",
          hasSelection || isHovered ? "text-brand-primary" : "text-stone",
        )}>
          {regionName} Region
        </span>
        <span className={cn(
          "block text-sm transition-colors duration-300 sm:text-base",
          hasSelection || isHovered ? "text-foreground" : "text-foreground-secondary",
        )}>
          {cityNames.length > 0 ? cityNames.join(" · ") : region.name}
        </span>
        {additionalCityCount > 0 && (
          <span className="block text-xs text-stone transition-colors duration-300 mt-0.5">
            +{additionalCityCount} more, select in details
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2">
        {isEntryPointRegion && isExitPointRegion ? (
          <span className="hidden items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-accent sm:flex">
            <Repeat className="h-3 w-3" />
            Round Trip
          </span>
        ) : isEntryPointRegion ? (
          <span className="hidden items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-accent sm:flex">
            <Plane className="h-3 w-3" />
            Arrival
          </span>
        ) : isExitPointRegion ? (
          <span className="hidden items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-accent sm:flex">
            <PlaneTakeoff className="h-3 w-3" />
            Departure
          </span>
        ) : null}
        {(isRecommended || isEntryPointRegion || isExitPointRegion) && (
          <span className="hidden items-center gap-1 rounded-full bg-brand-primary/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-brand-primary sm:flex">
            {isEntryPointRegion || isExitPointRegion ? (
              <Pin className="h-3 w-3 fill-current" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
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

      {/* Selection indicator */}
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-300",
          regionSelectionState === "full"
            ? "border-brand-primary bg-brand-primary text-white"
            : regionSelectionState === "partial"
              ? "border-brand-primary bg-brand-primary/15"
              : "border-border/80 group-hover:border-foreground/30",
        )}
        aria-hidden
      >
        {regionSelectionState === "full" && (
          <m.span
            initial={prefersReducedMotion ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </m.span>
        )}
        {regionSelectionState === "partial" && (
          <span className="h-2 w-2 rounded-full bg-brand-primary" />
        )}
      </span>

    </m.button>
  );
}
