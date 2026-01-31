"use client";

import {
  Clock,
  Coffee,
  Loader2,
  Moon,
  Plus,
  Shuffle,
  Sunrise,
  Sunset,
  Train,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/cn";
import type { DetectedGap, GapType } from "@/lib/smartPrompts/gapDetection";

const ICON_MAP: Record<string, LucideIcon> = {
  Clock,
  Coffee,
  Moon,
  Plus,
  Shuffle,
  Sunrise,
  Sunset,
  Train,
  Utensils,
  UtensilsCrossed,
};

const TYPE_COLORS: Record<GapType, { bg: string; text: string; badge: string }> = {
  meal: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-700",
  },
  transport: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
  },
  experience: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    badge: "bg-purple-100 text-purple-700",
  },
  long_gap: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
  },
  early_end: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    badge: "bg-rose-100 text-rose-700",
  },
  late_start: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    badge: "bg-sky-100 text-sky-700",
  },
  category_imbalance: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
  },
};

export type SmartPromptCardProps = {
  gap: DetectedGap;
  onAccept: (gap: DetectedGap) => void;
  onSkip: (gap: DetectedGap) => void;
  isLoading?: boolean;
  className?: string;
};

export function SmartPromptCard({
  gap,
  onAccept,
  onSkip,
  isLoading = false,
  className,
}: SmartPromptCardProps) {
  const Icon = ICON_MAP[gap.icon] ?? Plus;
  const colors = TYPE_COLORS[gap.type];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border bg-background p-3",
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          colors.bg
        )}
      >
        <Icon className={cn("h-5 w-5", colors.text)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-charcoal">{gap.title}</h4>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              colors.badge
            )}
          >
            Day {gap.dayIndex + 1}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-stone line-clamp-2">{gap.description}</p>

        {/* Actions */}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => onAccept(gap)}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-1.5 rounded-full bg-brand-primary px-3 py-1 text-xs font-medium text-white transition",
              isLoading
                ? "cursor-not-allowed opacity-70"
                : "hover:bg-brand-primary/90"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Adding...
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
              "rounded-full border border-border px-3 py-1 text-xs font-medium text-stone transition",
              isLoading
                ? "cursor-not-allowed opacity-50"
                : "hover:bg-sand"
            )}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
