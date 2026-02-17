"use client";

import {
  BookOpen,
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
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import type { DetectedGap, GapType } from "@/lib/smartPrompts/gapDetection";

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
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

const TYPE_COLORS: Record<GapType, { bg: string; text: string; badge: string }> = {
  meal: {
    bg: "bg-brand-secondary/10",
    text: "text-brand-secondary",
    badge: "bg-brand-secondary/15 text-brand-secondary",
  },
  transport: {
    bg: "bg-brand-primary/10",
    text: "text-brand-primary",
    badge: "bg-brand-primary/15 text-brand-primary",
  },
  experience: {
    bg: "bg-sage/10",
    text: "text-sage",
    badge: "bg-sage/15 text-sage",
  },
  long_gap: {
    bg: "bg-warning/10",
    text: "text-warning",
    badge: "bg-warning/15 text-warning",
  },
  early_end: {
    bg: "bg-semantic-error/10",
    text: "text-semantic-error",
    badge: "bg-semantic-error/15 text-semantic-error",
  },
  late_start: {
    bg: "bg-brand-primary/10",
    text: "text-brand-primary",
    badge: "bg-brand-primary/15 text-brand-primary",
  },
  category_imbalance: {
    bg: "bg-sage/10",
    text: "text-sage",
    badge: "bg-sage/15 text-sage",
  },
  guidance: {
    bg: "bg-sage/10",
    text: "text-sage",
    badge: "bg-sage/15 text-sage",
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
        "flex items-start gap-3 rounded-xl border border-border bg-background p-3",
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          colors.bg
        )}
      >
        <Icon className={cn("h-5 w-5", colors.text)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-foreground">{gap.title}</h4>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-mono text-[10px] font-medium",
              colors.badge
            )}
          >
            Day {gap.dayIndex + 1}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-stone line-clamp-2">{gap.description}</p>

        {/* Actions */}
        <div className="mt-2 flex gap-2">
          <Button
            variant="primary"
            size="chip"
            onClick={() => onAccept(gap)}
            disabled={isLoading}
            isLoading={isLoading}
          >
            {isLoading ? "Adding..." : "Add"}
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
    </div>
  );
}
