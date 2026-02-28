"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { X, Star, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { resizePhotoUrl } from "@/lib/google/transformations";
import type { ReplacementCandidate } from "@/hooks/useReplacementCandidates";
import type { ItineraryActivity } from "@/types/itinerary";
import { numberFormatter } from "@/components/features/itinerary/activityUtils";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

type ActivityReplacementPickerBProps = {
  isOpen: boolean;
  onClose: () => void;
  candidates: ReplacementCandidate[];
  originalActivity: Extract<ItineraryActivity, { kind: "place" }>;
  onSelect: (candidate: ReplacementCandidate) => void;
  isLoading?: boolean;
};

export function ActivityReplacementPickerB({
  isOpen,
  onClose,
  candidates,
  originalActivity,
  onSelect,
  isLoading = false,
}: ActivityReplacementPickerBProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "rating" | "distance">("score");
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  const toggleDescription = useCallback((locationId: string) => {
    setExpandedDescriptions((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) next.delete(locationId);
      else next.add(locationId);
      return next;
    });
  }, []);

  const sortedCandidates = useMemo(() => {
    const sorted = [...candidates];
    switch (sortBy) {
      case "rating":
        sorted.sort((a, b) => (b.location.rating ?? 0) - (a.location.rating ?? 0));
        break;
      case "distance":
        sorted.sort((a, b) => b.breakdown.logisticalFit - a.breakdown.logisticalFit);
        break;
      case "score":
      default:
        sorted.sort((a, b) => b.score - a.score);
        break;
    }
    return sorted;
  }, [candidates, sortBy]);

  const handleSelect = useCallback(
    (candidate: ReplacementCandidate) => {
      onSelect(candidate);
      setSelectedIndex(null);
    },
    [onSelect],
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: "var(--success)", text: "var(--success)" };
    if (score >= 60) return { bg: "var(--success)", text: "var(--success)" };
    if (score >= 40) return { bg: "var(--warning)", text: "var(--warning)" };
    return { bg: "var(--muted-foreground)", text: "var(--muted-foreground)" };
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: bEase }}
            className="fixed inset-0 z-50"
            style={{ backgroundColor: "color-mix(in srgb, var(--foreground) 40%, transparent)" }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.25, ease: bEase }}
            className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-3xl rounded-2xl sm:inset-x-auto sm:w-full"
            style={{
              backgroundColor: "var(--card)",
              boxShadow: "var(--shadow-elevated)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: "var(--border)" }}
            >
              <div>
                <h2
                  className="text-base font-bold"
                  style={{ color: "var(--foreground)" }}
                >
                  Replace &ldquo;{originalActivity.title}&rdquo;
                </h2>
                <p
                  className="mt-0.5 text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Choose an alternative activity
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-[var(--surface)]"
                style={{ color: "var(--muted-foreground)" }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sort controls */}
            <div
              className="flex items-center gap-2 border-b px-5 py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="text-sm font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Sort by:
              </span>
              <div
                className="flex gap-1 rounded-xl p-1"
                style={{ backgroundColor: "var(--surface)" }}
              >
                {(["score", "rating", "distance"] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setSortBy(option)}
                    className={`rounded-xl px-3 py-1 text-xs font-medium transition-colors ${
                      sortBy === option
                        ? "bg-[var(--primary)] text-white"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Candidates list */}
            <div className="max-h-[60vh] overflow-y-auto p-5">
              {isLoading ? (
                <div
                  className="flex items-center justify-center py-12 text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Finding alternatives...
                </div>
              ) : sortedCandidates.length === 0 ? (
                <div
                  className="flex items-center justify-center py-12 text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  No alternatives nearby
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedCandidates.map((candidate, index) => {
                    const location = candidate.location;
                    const rating = location.rating ?? 0;
                    const reviewCount = location.reviewCount ?? 0;
                    const isSelected = selectedIndex === index;
                    const scoreColor = getScoreColor(candidate.score);

                    return (
                      <div
                        key={location.id}
                        className="rounded-2xl border-2 p-4 transition-colors"
                        style={{
                          borderColor: isSelected
                            ? "var(--primary)"
                            : "var(--border)",
                          backgroundColor: isSelected
                            ? "color-mix(in srgb, var(--primary) 5%, transparent)"
                            : "var(--background)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-3">
                              {location.image && (
                                <Image
                                  src={resizePhotoUrl(location.image, 400) ?? location.image}
                                  alt={location.name}
                                  width={80}
                                  height={80}
                                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <h3
                                  className="text-base font-semibold"
                                  style={{ color: "var(--foreground)" }}
                                >
                                  {location.name}
                                </h3>
                                <p
                                  className="text-sm"
                                  style={{ color: "var(--muted-foreground)" }}
                                >
                                  {location.city}
                                  {location.region && `, ${location.region}`}
                                </p>
                                {location.category && (
                                  <span
                                    className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs"
                                    style={{
                                      backgroundColor: "var(--surface)",
                                      color: "var(--muted-foreground)",
                                    }}
                                  >
                                    {location.category}
                                  </span>
                                )}
                                {location.shortDescription && (
                                  <div className="mt-2">
                                    <p
                                      className={`text-sm ${
                                        expandedDescriptions.has(location.id)
                                          ? ""
                                          : "line-clamp-2"
                                      }`}
                                      style={{ color: "var(--muted-foreground)" }}
                                    >
                                      {location.shortDescription}
                                    </p>
                                    {location.shortDescription.length > 50 && (
                                      <button
                                        type="button"
                                        onClick={() => toggleDescription(location.id)}
                                        className="mt-1 text-xs font-medium transition-colors hover:underline"
                                        style={{ color: "var(--primary)" }}
                                      >
                                        {expandedDescriptions.has(location.id)
                                          ? "Show less"
                                          : "Show more"}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Rating and score */}
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              {rating > 0 && (
                                <div className="flex items-center gap-1">
                                  <Star
                                    className="h-4 w-4"
                                    style={{ color: "var(--warning)" }}
                                    fill="currentColor"
                                  />
                                  <span
                                    className="text-sm font-semibold"
                                    style={{ color: "var(--foreground)" }}
                                  >
                                    {rating.toFixed(1)}
                                  </span>
                                  {reviewCount > 0 && (
                                    <span
                                      className="text-xs"
                                      style={{ color: "var(--muted-foreground)" }}
                                    >
                                      ({numberFormatter.format(reviewCount)})
                                    </span>
                                  )}
                                </div>
                              )}
                              <span
                                className="rounded-full px-2 py-0.5 text-xs font-semibold"
                                style={{
                                  backgroundColor: `color-mix(in srgb, ${scoreColor.bg} 10%, transparent)`,
                                  color: scoreColor.text,
                                }}
                              >
                                Score: {candidate.score}
                              </span>
                            </div>

                            {/* Reasoning */}
                            {candidate.reasoning.length > 0 && (
                              <details className="mt-2 cursor-pointer">
                                <summary
                                  className="flex items-center gap-1 text-xs font-medium"
                                  style={{ color: "var(--foreground)" }}
                                >
                                  Why this match?
                                  <ChevronDown className="h-3 w-3" />
                                </summary>
                                <ul
                                  className="mt-1 ml-4 list-disc space-y-0.5 text-xs"
                                  style={{ color: "var(--muted-foreground)" }}
                                >
                                  {candidate.reasoning.slice(0, 3).map((reason, i) => (
                                    <li key={i}>{reason}</li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (isSelected) handleSelect(candidate);
                              else setSelectedIndex(index);
                            }}
                            className="shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-shadow active:scale-[0.98] hover:shadow-[var(--shadow-elevated)]"
                            style={{
                              backgroundColor: isSelected
                                ? "var(--primary)"
                                : "var(--surface)",
                              color: isSelected ? "white" : "var(--foreground)",
                            }}
                          >
                            {isSelected ? "Confirm" : "Select"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex justify-end border-t px-5 py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors active:scale-[0.98] hover:bg-[var(--surface)]"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
