"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Coffee,
  Lightbulb,
  Loader2,
  Moon,
  Plus,
  Sunrise,
  Train,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/cn";
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
    bg: "bg-orange-50",
    text: "text-orange-600",
  },
  transport: {
    bg: "bg-blue-50",
    text: "text-blue-600",
  },
  experience: {
    bg: "bg-purple-50",
    text: "text-purple-600",
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
  const [isExpanded, setIsExpanded] = useState(true);

  if (gaps.length === 0) {
    return null;
  }

  return (
    <div className={cn("rounded-lg border border-amber-200 bg-amber-50/50", className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-charcoal">
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
        <div className="border-t border-amber-200 px-4 py-3">
          <div className="space-y-2">
            {gaps.map((gap) => {
              const Icon = ICON_MAP[gap.icon] ?? Plus;
              const colors = TYPE_COLORS[gap.type];
              const isLoading = loadingGapId === gap.id;

              return (
                <div
                  key={gap.id}
                  className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm"
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
                    <p className="text-sm font-medium text-charcoal">{gap.title}</p>
                    <p className="text-xs text-stone truncate">{gap.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => onAccept(gap)}
                      disabled={isLoading}
                      className={cn(
                        "flex items-center gap-1 rounded-full bg-brand-primary px-3 py-1.5 text-xs font-medium text-white transition",
                        isLoading
                          ? "cursor-not-allowed opacity-70"
                          : "hover:bg-brand-primary/90"
                      )}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="sr-only">Adding...</span>
                        </>
                      ) : (
                        "Add"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSkip(gap)}
                      disabled={isLoading}
                      className={cn(
                        "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-stone transition",
                        isLoading
                          ? "cursor-not-allowed opacity-50"
                          : "hover:bg-sand"
                      )}
                    >
                      Skip
                    </button>
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
