"use client";

import { motion } from "framer-motion";
import { ChevronDown, MapPin, Star } from "lucide-react";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

export type RegionSelectionState = "none" | "partial" | "full";

type RegionRowBProps = {
  index: number;
  regionName: string;
  cityNames: string[];
  additionalCityCount: number;
  matchScore: number;
  selectedCityCount: number;
  totalCityCount: number;
  isExpanded: boolean;
  isRecommended: boolean;
  isEntryPointRegion: boolean;
  regionSelectionState: RegionSelectionState;
  onClick: () => void;
};

export function RegionRowB({
  index,
  regionName,
  cityNames,
  additionalCityCount,
  selectedCityCount,
  totalCityCount,
  isExpanded,
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
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.05 + index * 0.05, ease: bEase }}
      className={`group flex w-full cursor-pointer items-center gap-4 rounded-2xl bg-white px-4 py-4 text-left transition-all ${
        hasSelection
          ? "ring-2 ring-[var(--primary)] shadow-[var(--shadow-elevated)]"
          : "shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)]"
      }`}
    >
      {/* Selection indicator */}
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
          regionSelectionState === "full"
            ? "border-[var(--primary)] bg-[var(--primary)]"
            : regionSelectionState === "partial"
              ? "border-[var(--primary)] bg-[var(--primary)]/30"
              : "border-[var(--border)]"
        }`}
      >
        {regionSelectionState !== "none" && (
          <svg
            className="h-3 w-3 text-white"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            {regionName}
          </h3>
          {isRecommended && (
            <span className="flex items-center gap-0.5 rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--primary)]">
              <Star className="h-2.5 w-2.5" />
              Match
            </span>
          )}
          {isEntryPointRegion && (
            <span className="flex items-center gap-0.5 rounded-full bg-[var(--success)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--success)]">
              <MapPin className="h-2.5 w-2.5" />
              Entry
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
          {cityNames.join(", ")}
          {additionalCityCount > 0 && ` +${additionalCityCount} more`}
        </p>
      </div>

      {/* Count + expand */}
      <div className="flex items-center gap-2">
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
    </motion.button>
  );
}
