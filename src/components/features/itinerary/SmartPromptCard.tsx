"use client";

import {
  BookOpen,
  CalendarCheck,
  Clock,
  CloudRain,
  Coffee,
  Gift,
  Info,
  Leaf,
  Moon,
  Package,
  PartyPopper,
  Plus,
  ShoppingBag,
  Shuffle,
  Sunrise,
  Sunset,
  Train,
  Users,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import type { DetectedGap, GapType } from "@/lib/smartPrompts/gapDetection";
import { ExpandableText } from "@/components/ui/ExpandableText";

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  CalendarCheck,
  Clock,
  CloudRain,
  Coffee,
  Gift,
  Info,
  Leaf,
  Moon,
  Package,
  PartyPopper,
  Plus,
  ShoppingBag,
  Shuffle,
  Sunrise,
  Sunset,
  Train,
  Users,
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
    bg: "bg-error/10",
    text: "text-error",
    badge: "bg-error/15 text-error",
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
  reservation_alert: {
    bg: "bg-warning/10",
    text: "text-warning",
    badge: "bg-warning/15 text-warning",
  },
  lunch_rush: {
    bg: "bg-warning/5",
    text: "text-warning",
    badge: "bg-warning/10 text-warning",
  },
  rain_contingency: {
    bg: "bg-sage/5",
    text: "text-sage",
    badge: "bg-sage/10 text-sage",
  },
  luggage_needs: {
    bg: "bg-brand-secondary/10",
    text: "text-brand-secondary",
    badge: "bg-brand-secondary/15 text-brand-secondary",
  },
  crowd_alert: {
    bg: "bg-brand-secondary/10",
    text: "text-brand-secondary",
    badge: "bg-brand-secondary/15 text-brand-secondary",
  },
  festival_alert: {
    bg: "bg-brand-secondary/10",
    text: "text-brand-secondary",
    badge: "bg-brand-secondary/15 text-brand-secondary",
  },
  evening_free: {
    bg: "bg-sage/10",
    text: "text-sage",
    badge: "bg-sage/15 text-sage",
  },
  omiyage_reminder: {
    bg: "bg-brand-secondary/10",
    text: "text-brand-secondary",
    badge: "bg-brand-secondary/15 text-brand-secondary",
  },
  late_arrival: {
    bg: "bg-sage/10",
    text: "text-sage",
    badge: "bg-sage/15 text-sage",
  },
  early_arrival: {
    bg: "bg-sage/10",
    text: "text-sage",
    badge: "bg-sage/15 text-sage",
  },
  guide_suggestion: {
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
        <ExpandableText text={gap.description} className="mt-0.5 text-xs text-stone" />

        {/* Reservation alert: show location list */}
        {gap.action.type === "acknowledge_reservation" && (
          <ul className="mt-1.5 space-y-0.5">
            {gap.action.locations.map((loc, i) => (
              <li key={i} className="text-xs text-foreground-secondary">
                <span className="font-medium text-foreground">{loc.name}</span>
                {", Day "}
                {loc.dayIndex + 1}
                {loc.reservationInfo === "required" ? " (required)" : " (recommended)"}
              </li>
            ))}
          </ul>
        )}

        {/* Actions */}
        <div className="mt-2 flex gap-2">
          {gap.action.type === "browse_experts" ? (
            <>
              <Button
                variant="primary"
                size="chip"
                onClick={() => onAccept(gap)}
              >
                Browse experts
              </Button>
              <Button
                variant="brand-ghost"
                size="chip"
                onClick={() => onSkip(gap)}
              >
                Skip
              </Button>
            </>
          ) : gap.action.type === "acknowledge_reservation" || gap.action.type === "acknowledge_guidance" || gap.action.type === "acknowledge_lunch_rush" || gap.action.type === "acknowledge_luggage" || gap.action.type === "acknowledge_crowd" || gap.action.type === "acknowledge_festival" || gap.action.type === "acknowledge_omiyage" || gap.action.type === "acknowledge_late_arrival" || gap.action.type === "acknowledge_early_arrival" ? (
            <Button
              variant="primary"
              size="chip"
              onClick={() => onSkip(gap)}
              disabled={isLoading}
            >
              Got it
            </Button>
          ) : gap.action.type === "swap_for_weather" ? (
            <>
              <Button
                variant="primary"
                size="chip"
                onClick={() => onAccept(gap)}
                disabled={isLoading}
                isLoading={isLoading}
              >
                {isLoading ? "Swapping..." : "Swap"}
              </Button>
              <Button
                variant="brand-ghost"
                size="chip"
                onClick={() => onSkip(gap)}
                disabled={isLoading}
              >
                Keep
              </Button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
