"use client";

import { useState } from "react";
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Coffee,
  Info,
  Leaf,
  Lightbulb,
  Moon,
  Plus,
  ShoppingBag,
  Shuffle,
  Sunrise,
  Sunset,
  Train,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { SmartPromptPreview } from "./SmartPromptPreview";
import type { DetectedGap, GapType } from "@/lib/smartPrompts/gapDetection";
import type { PreviewState, RefinementFilters } from "@/hooks/useSmartPromptActions";

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  Calendar,
  Clock,
  Coffee,
  Info,
  Leaf,
  Moon,
  Plus,
  ShoppingBag,
  Shuffle,
  Sunrise,
  Sunset,
  Train,
  Utensils,
  UtensilsCrossed,
};

const TYPE_COLORS: Record<GapType, { bg: string; text: string }> = {
  meal: {
    bg: "bg-brand-secondary/10",
    text: "text-brand-secondary",
  },
  transport: {
    bg: "bg-brand-primary/10",
    text: "text-brand-primary",
  },
  experience: {
    bg: "bg-sage/10",
    text: "text-sage",
  },
  long_gap: {
    bg: "bg-warning/10",
    text: "text-warning",
  },
  early_end: {
    bg: "bg-semantic-error/10",
    text: "text-semantic-error",
  },
  late_start: {
    bg: "bg-brand-primary/10",
    text: "text-brand-primary",
  },
  category_imbalance: {
    bg: "bg-sage/10",
    text: "text-sage",
  },
  guidance: {
    bg: "bg-sage/10",
    text: "text-sage",
  },
  reservation_alert: {
    bg: "bg-warning/10",
    text: "text-warning",
  },
  lunch_rush: {
    bg: "bg-warning/5",
    text: "text-warning",
  },
  rain_contingency: {
    bg: "bg-sage/5",
    text: "text-sage",
  },
};

export type DaySuggestionsProps = {
  gaps: DetectedGap[];
  onAccept: (gap: DetectedGap) => void;
  onSkip: (gap: DetectedGap) => void;
  loadingGapId?: string | null;
  className?: string;
  /** When true, renders just the gap items without the accordion wrapper */
  embedded?: boolean;
  // Preview props
  previewState?: PreviewState | null;
  onConfirmPreview?: () => void;
  onShowAnother?: () => Promise<void>;
  onCancelPreview?: () => void;
  onFilterChange?: (filter: Partial<RefinementFilters>) => void;
  isPreviewLoading?: boolean;
};

export function DaySuggestions({
  gaps,
  onAccept,
  onSkip,
  loadingGapId,
  className,
  embedded,
  previewState,
  onConfirmPreview,
  onShowAnother,
  onCancelPreview,
  onFilterChange,
  isPreviewLoading,
}: DaySuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (gaps.length === 0) {
    return null;
  }

  const renderGapItems = () =>
    gaps.map((gap) => {
      const Icon = ICON_MAP[gap.icon] ?? Plus;
      const colors = TYPE_COLORS[gap.type];
      const isLoading = loadingGapId === gap.id;
      const isGuidance = gap.type === "guidance";
      const hasPreview = previewState?.gap.id === gap.id;

      // Render preview card instead of normal gap card
      if (hasPreview && previewState && onConfirmPreview && onShowAnother && onCancelPreview && onFilterChange) {
        return (
          <SmartPromptPreview
            key={gap.id}
            recommendation={previewState.recommendation}
            gapTitle={gap.title}
            showCount={previewState.showCount}
            activeFilters={previewState.activeFilters}
            isMeal={gap.action.type === "add_meal"}
            isLoading={isPreviewLoading ?? false}
            onConfirm={onConfirmPreview}
            onShowAnother={onShowAnother}
            onCancel={onCancelPreview}
            onFilterChange={onFilterChange}
          />
        );
      }

      return (
        <div
          key={gap.id}
          className="flex items-center gap-3 rounded-xl bg-background p-3 shadow-sm"
        >
          {/* Icon */}
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              colors.bg
            )}
          >
            <Icon className={cn("h-4 w-4", colors.text)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{gap.title}</p>
            <p className="text-xs text-stone truncate">{gap.description}</p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-2">
            {isGuidance ? (
              <Button
                variant="brand-ghost"
                size="chip"
                onClick={() => onSkip(gap)}
                disabled={isLoading}
              >
                Got it
              </Button>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="chip"
                  onClick={() => onAccept(gap)}
                  disabled={isLoading}
                  isLoading={isLoading}
                >
                  {isLoading ? <span className="sr-only">Adding...</span> : "Add"}
                </Button>
                <Button
                  variant="brand-ghost"
                  size="chip"
                  onClick={() => onSkip(gap)}
                  disabled={isLoading}
                >
                  Skip
                </Button>
              </>
            )}
          </div>
        </div>
      );
    });

  // Embedded mode: just render the items without wrapper
  if (embedded) {
    return <>{renderGapItems()}</>;
  }

  return (
    <div className={cn("rounded-xl border border-brand-secondary/20 bg-brand-secondary/5", className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-brand-secondary" />
          <span className="text-sm font-medium text-foreground">
            {gaps.length} suggestion{gaps.length !== 1 ? "s" : ""} for this day
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-stone" />
        ) : (
          <ChevronDown className="h-4 w-4 text-stone" />
        )}
      </button>

      {/* Suggestions list */}
      {isExpanded && (
        <div className="border-t border-brand-secondary/20 px-4 py-3">
          <div className="space-y-2">
            {renderGapItems()}
          </div>
        </div>
      )}
    </div>
  );
}
