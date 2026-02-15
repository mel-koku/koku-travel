"use client";

import { MapPin, Star, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import type { PreviewRecommendation, RefinementFilters } from "@/hooks/useSmartPromptActions";

const MAX_SHOWS = 3;

type SmartPromptPreviewProps = {
  recommendation: PreviewRecommendation;
  gapTitle: string;
  showCount: number;
  activeFilters: RefinementFilters;
  isMeal: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onShowAnother: () => void;
  onCancel: () => void;
  onFilterChange: (filter: Partial<RefinementFilters>) => void;
};

type FilterChip = {
  key: string;
  label: string;
  isActive: boolean;
  toggle: () => void;
  hidden?: boolean;
};

export function SmartPromptPreview({
  recommendation,
  gapTitle,
  showCount,
  activeFilters,
  isMeal,
  isLoading,
  onConfirm,
  onShowAnother,
  onCancel,
  onFilterChange,
}: SmartPromptPreviewProps) {
  const canShowAnother = showCount < MAX_SHOWS;

  const filterChips: FilterChip[] = [
    {
      key: "budget",
      label: "Cheaper",
      isActive: activeFilters.budget === "cheaper",
      toggle: () =>
        onFilterChange({
          budget: activeFilters.budget === "cheaper" ? undefined : "cheaper",
        }),
    },
    {
      key: "proximity",
      label: "Closer",
      isActive: activeFilters.proximity === "closer",
      toggle: () =>
        onFilterChange({
          proximity: activeFilters.proximity === "closer" ? undefined : "closer",
        }),
    },
    {
      key: "indoor",
      label: "Indoor",
      isActive: activeFilters.indoor === true,
      toggle: () =>
        onFilterChange({ indoor: activeFilters.indoor ? undefined : true }),
      hidden: isMeal, // Restaurants are already indoor
    },
    {
      key: "cuisine",
      label: "Different cuisine",
      isActive: (activeFilters.cuisineExclude?.length ?? 0) > 0,
      toggle: () => {
        if (activeFilters.cuisineExclude?.length) {
          onFilterChange({ cuisineExclude: undefined });
        } else if (recommendation.googlePrimaryType) {
          onFilterChange({
            cuisineExclude: [recommendation.googlePrimaryType],
          });
        }
      },
      hidden: !isMeal, // Only for meal gaps
    },
  ].filter((chip) => !chip.hidden);

  return (
    <div className="rounded-lg border border-brand-primary/20 bg-surface p-3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-stone">
          Suggestion for: {gapTitle}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-6 w-6 items-center justify-center rounded-full text-stone transition hover:bg-background hover:text-foreground"
          aria-label="Close preview"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Recommendation Card */}
      <div className="mb-3 rounded-lg bg-background p-3">
        <p className="text-sm font-medium text-foreground">
          {recommendation.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone">
          {recommendation.category && (
            <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-medium text-brand-primary capitalize">
              {recommendation.category}
            </span>
          )}
          {recommendation.neighborhood && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {recommendation.neighborhood}
            </span>
          )}
          {recommendation.rating != null && recommendation.rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-brand-secondary text-brand-secondary" />
              {recommendation.rating.toFixed(1)}
            </span>
          )}
        </div>
        {recommendation.shortDescription && (
          <p className="mt-1.5 text-xs leading-relaxed text-foreground-secondary line-clamp-2">
            {recommendation.shortDescription}
          </p>
        )}
      </div>

      {/* Filter Chips */}
      {filterChips.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.toggle}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                chip.isActive
                  ? "bg-brand-primary/20 text-brand-primary"
                  : "bg-background text-stone hover:bg-surface hover:text-foreground-secondary"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="chip"
          onClick={onConfirm}
          disabled={isLoading}
        >
          Add this
        </Button>
        {canShowAnother ? (
          <Button
            variant="brand-ghost"
            size="chip"
            onClick={onShowAnother}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              `Show another (${showCount}/${MAX_SHOWS})`
            )}
          </Button>
        ) : (
          <Button
            variant="brand-ghost"
            size="chip"
            onClick={onCancel}
          >
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}
