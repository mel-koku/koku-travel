"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { resizePhotoUrl } from "@/lib/google/transformations";
import type { ReplacementCandidate } from "@/hooks/useReplacementCandidates";
import type { ItineraryActivity } from "@/types/itinerary";
import { numberFormatter } from "./activityUtils";

type ActivityReplacementPickerProps = {
  isOpen: boolean;
  onClose: () => void;
  candidates: ReplacementCandidate[];
  originalActivity: Extract<ItineraryActivity, { kind: "place" }>;
  onSelect: (candidate: ReplacementCandidate) => void;
  isLoading?: boolean;
};

export function ActivityReplacementPicker({
  isOpen,
  onClose,
  candidates,
  originalActivity,
  onSelect,
  isLoading = false,
}: ActivityReplacementPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "rating" | "distance">("score");
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  const toggleDescription = useCallback((locationId: string) => {
    setExpandedDescriptions((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
  }, []);

  const sortedCandidates = useMemo(() => {
    const sorted = [...candidates];
    
    switch (sortBy) {
      case "rating":
        sorted.sort((a, b) => {
          const ratingA = a.location.rating ?? 0;
          const ratingB = b.location.rating ?? 0;
          return ratingB - ratingA;
        });
        break;
      case "distance":
        // Sort by logistical fit (which includes distance)
        sorted.sort((a, b) => b.breakdown.logisticalFit - a.breakdown.logisticalFit);
        break;
      case "score":
      default:
        sorted.sort((a, b) => b.score - a.score);
        break;
    }
    
    return sorted;
  }, [candidates, sortBy]);

  const handleSelect = useCallback((candidate: ReplacementCandidate) => {
    onSelect(candidate);
    setSelectedIndex(null);
  }, [onSelect]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success bg-success/10";
    if (score >= 60) return "text-sage bg-sage/10";
    if (score >= 40) return "text-warning bg-warning/10";
    return "text-stone bg-surface";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Replace "${originalActivity.title}"`}
      description="Choose an alternative activity from the suggestions below"
      panelClassName="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Sort controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground-secondary">Sort by:</span>
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {(["score", "rating", "distance"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  sortBy === option
                    ? "bg-brand-primary text-white"
                    : "text-foreground-secondary hover:bg-surface"
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Candidates list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-stone">Finding alternatives...</div>
          </div>
        ) : sortedCandidates.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-stone">No alternatives nearby</div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {sortedCandidates.map((candidate, index) => {
              const location = candidate.location;
              const rating = location.rating ?? 0;
              const reviewCount = location.reviewCount ?? 0;
              const isSelected = selectedIndex === index;

              return (
                <div
                  key={location.id}
                  className={`rounded-2xl border-2 p-4 transition ${
                    isSelected
                      ? "border-brand-primary bg-brand-primary/5"
                      : "border-border bg-background hover:border-brand-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        {location.image && (
                          <Image
                            src={resizePhotoUrl(location.image, 400) ?? location.image}
                            alt={location.name}
                            width={80}
                            height={80}
                            className="h-20 w-20 shrink-0 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-foreground">
                            {location.name}
                          </h3>
                          <p className="text-sm text-foreground-secondary">
                            {location.city}
                            {location.region && `, ${location.region}`}
                          </p>
                          {location.category && (
                            <span className="mt-1 inline-block rounded-full bg-surface px-2 py-0.5 text-xs text-foreground-secondary">
                              {location.category}
                            </span>
                          )}
                          {location.shortDescription && (
                            <div className="mt-2">
                              <p
                                className={`text-sm text-foreground-secondary ${
                                  expandedDescriptions.has(location.id) ? "" : "line-clamp-2"
                                }`}
                              >
                                {location.shortDescription}
                              </p>
                              {location.shortDescription.length > 50 && (
                                <button
                                  type="button"
                                  onClick={() => toggleDescription(location.id)}
                                  className="mt-1 text-xs font-medium text-sage hover:text-sage/80"
                                >
                                  {expandedDescriptions.has(location.id) ? "Show less" : "Show more"}
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
                            <svg
                              className="h-4 w-4 text-warning"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="font-mono text-sm font-semibold text-foreground">
                              {rating.toFixed(1)}
                            </span>
                            {reviewCount > 0 && (
                              <span className="font-mono text-xs text-stone">
                                ({numberFormatter.format(reviewCount)})
                              </span>
                            )}
                          </div>
                        )}
                        <div
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getScoreColor(candidate.score)}`}
                        >
                          Score: <span className="font-mono">{candidate.score}</span>
                        </div>
                      </div>

                      {/* Reasoning */}
                      {candidate.reasoning.length > 0 && (
                        <div className="mt-2 text-xs text-foreground-secondary">
                          <details className="cursor-pointer">
                            <summary className="font-medium text-foreground">
                              Why this match?
                            </summary>
                            <ul className="mt-1 ml-4 list-disc space-y-0.5">
                              {candidate.reasoning.slice(0, 3).map((reason, i) => (
                                <li key={i}>{reason}</li>
                              ))}
                            </ul>
                          </details>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Button
                        variant={isSelected ? "primary" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (isSelected) {
                            handleSelect(candidate);
                          } else {
                            setSelectedIndex(index);
                          }
                        }}
                      >
                        {isSelected ? "Confirm Replace" : "Select"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

