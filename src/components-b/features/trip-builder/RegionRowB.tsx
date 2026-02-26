"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Check, ChevronDown, MapPin, Star } from "lucide-react";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

export type RegionSelectionState = "none" | "partial" | "full";

type RegionRowBProps = {
  index: number;
  regionName: string;
  heroImage: string;
  tagline: string;
  cityNames: string[];
  additionalCityCount: number;
  selectedCityCount: number;
  totalCityCount: number;
  isExpanded: boolean;
  isFaded: boolean;
  isRecommended: boolean;
  isEntryPointRegion: boolean;
  regionSelectionState: RegionSelectionState;
  onClick: () => void;
};

export function RegionRowB({
  index,
  regionName,
  heroImage,
  tagline,
  selectedCityCount,
  totalCityCount,
  isExpanded,
  isFaded,
  isRecommended,
  isEntryPointRegion,
  regionSelectionState,
  onClick,
}: RegionRowBProps) {
  const hasSelection = regionSelectionState !== "none";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: isFaded ? 0.45 : 1,
        y: 0,
        scale: isFaded ? 0.97 : 1,
      }}
      transition={{ duration: 0.5, delay: 0.05 + index * 0.04, ease: bEase }}
      whileHover={
        !isFaded
          ? {
              y: -3,
              transition: { type: "spring", stiffness: 300, damping: 25 },
            }
          : undefined
      }
      className={`group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white text-left transition-shadow ${
        isExpanded
          ? "ring-2 ring-[var(--primary)] shadow-[var(--shadow-elevated)]"
          : hasSelection
            ? "ring-2 ring-[var(--primary)] shadow-[var(--shadow-elevated)]"
            : "shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)]"
      }`}
    >
      {/* Hero image */}
      <div className="relative aspect-[3/2] w-full overflow-hidden">
        <Image
          src={heroImage}
          alt={regionName}
          fill
          className={`object-cover transition-all duration-500 group-hover:scale-[1.04] ${
            isFaded ? "grayscale" : "grayscale-0"
          }`}
          sizes="(max-width: 640px) 100vw, 50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/50 via-transparent to-transparent" />

        {/* Check badge — top-right */}
        {hasSelection && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-white ${
              regionSelectionState === "full"
                ? "bg-[var(--primary)]"
                : "bg-[var(--primary)]/70"
            }`}
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </motion.div>
        )}

        {/* Match / Entry badges — bottom-left */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          {isRecommended && (
            <span className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-[var(--primary)] backdrop-blur-sm">
              <Star className="h-3 w-3" />
              Match
            </span>
          )}
          {isEntryPointRegion && (
            <span className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-[var(--success)] backdrop-blur-sm">
              <MapPin className="h-3 w-3" />
              Entry
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
            {regionName}
          </h3>
          <div className="flex items-center gap-1.5">
            {hasSelection && (
              <span className="text-xs font-medium text-[var(--primary)]">
                {selectedCityCount}/{totalCityCount}
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 text-[var(--muted-foreground)] transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
          {tagline}
        </p>
      </div>
    </motion.button>
  );
}
