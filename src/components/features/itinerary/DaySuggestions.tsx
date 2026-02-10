"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Coffee,
  Lightbulb,
  Moon,
  Plus,
  Sunrise,
  Train,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import type { DetectedGap, GapType } from "@/lib/smartPrompts/gapDetection";

const ICON_MAP: Record<string, LucideIcon> = {
  Coffee,
  Moon,
  Plus,
  Sunrise,
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
    bg: "bg-warm-gray/10",
    text: "text-foreground-secondary",
  },
  experience: {
    bg: "bg-brand-primary/10",
    text: "text-brand-primary",
  },
  long_gap: {
    bg: "bg-sage/10",
    text: "text-sage",
  },
  early_end: {
    bg: "bg-warning/10",
    text: "text-warning",
  },
  late_start: {
    bg: "bg-stone/10",
    text: "text-stone",
  },
  category_imbalance: {
    bg: "bg-semantic-error/10",
    text: "text-semantic-error",
  },
};

export type DaySuggestionsProps = {
  gaps: DetectedGap[];
  onAccept: (gap: DetectedGap) => void;
  onSkip: (gap: DetectedGap) => void;
  loadingGapId?: string | null;
  className?: string;
};

export function DaySuggestions({
  gaps,
  onAccept,
  onSkip,
  loadingGapId,
  className,
}: DaySuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (gaps.length === 0) {
    return null;
  }

  return (
    <div className={cn("rounded-lg border border-brand-secondary/20 bg-brand-secondary/5", className)}>
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
            {gaps.map((gap) => {
              const Icon = ICON_MAP[gap.icon] ?? Plus;
              const colors = TYPE_COLORS[gap.type];
              const isLoading = loadingGapId === gap.id;

              return (
                <div
                  key={gap.id}
                  className="flex items-center gap-3 rounded-lg bg-background p-3 shadow-sm"
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
