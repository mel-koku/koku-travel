"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { X, Star } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cEase } from "@c/ui/motionC";
import { resizePhotoUrl } from "@/lib/google/transformations";
import type { ReplacementCandidate } from "@/hooks/useReplacementCandidates";
import type { ItineraryActivity } from "@/types/itinerary";

type ActivityReplacementPickerCProps = {
  isOpen: boolean;
  onClose: () => void;
  candidates: ReplacementCandidate[];
  originalActivity: Extract<ItineraryActivity, { kind: "place" }>;
  onSelect: (candidate: ReplacementCandidate) => void;
  isLoading?: boolean;
};

export function ActivityReplacementPickerC({
  isOpen,
  onClose,
  candidates,
  originalActivity,
  onSelect,
  isLoading = false,
}: ActivityReplacementPickerCProps) {
  const [sortBy, setSortBy] = useState<"score" | "rating">("score");

  const sortedCandidates = useMemo(() => {
    const sorted = [...candidates];
    switch (sortBy) {
      case "rating":
        sorted.sort((a, b) => (b.location.rating ?? 0) - (a.location.rating ?? 0));
        break;
      default:
        sorted.sort((a, b) => b.score - a.score);
    }
    return sorted;
  }, [candidates, sortBy]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25, ease: cEase }}
          className="relative w-full max-w-lg max-h-[80vh] overflow-hidden border flex flex-col"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b p-4"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              <h3
                className="text-sm font-bold tracking-[-0.02em]"
                style={{
                  color: "var(--foreground)",
                  fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                }}
              >
                Replace: {originalActivity.title}
              </h3>
              <p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                {isLoading
                  ? "Finding alternatives..."
                  : `${candidates.length} alternative${candidates.length !== 1 ? "s" : ""} found`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] active:scale-[0.98]"
              style={{ color: "var(--muted-foreground)" }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Sort controls */}
          <div
            className="flex gap-1 border-b px-4 py-2"
            style={{ borderColor: "var(--border)" }}
          >
            {(["score", "rating"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSortBy(key)}
                className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors active:scale-[0.98]"
                style={{
                  backgroundColor:
                    sortBy === key
                      ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                      : "transparent",
                  color:
                    sortBy === key ? "var(--primary)" : "var(--muted-foreground)",
                }}
              >
                {key === "score" ? "Best Match" : "Rating"}
              </button>
            ))}
          </div>

          {/* Candidates list */}
          <div className="flex-1 overflow-y-auto" data-lenis-prevent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: "var(--primary)" }}>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : candidates.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  No alternatives available for this location.
                </p>
              </div>
            ) : (
              <div>
                {sortedCandidates.map((candidate) => {
                  const loc = candidate.location;
                  const imgSrc = loc.image
                    ? loc.image.includes("googleusercontent")
                      ? resizePhotoUrl(loc.image, 120)
                      : loc.image
                    : null;

                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => onSelect(candidate)}
                      className="flex w-full items-start gap-3 border-b p-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] active:scale-[0.99]"
                      style={{
                        borderColor: "var(--border)",
                      }}
                    >
                      {imgSrc && (
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden">
                          <Image
                            src={imgSrc}
                            alt={loc.name}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-bold tracking-[-0.02em]"
                          style={{ color: "var(--foreground)" }}
                        >
                          {loc.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                          <span className="capitalize">{loc.category}</span>
                          {loc.rating && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-current" style={{ color: "var(--warning)" }} />
                                {loc.rating.toFixed(1)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
