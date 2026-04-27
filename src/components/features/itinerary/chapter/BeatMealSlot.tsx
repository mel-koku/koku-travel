"use client";

import { Coffee, Utensils, UtensilsCrossed, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type MealSlotType = "breakfast" | "lunch" | "dinner";

const ICON_BY_MEAL = {
  breakfast: Coffee,
  lunch: Utensils,
  dinner: UtensilsCrossed,
} as const;

const LABEL_BY_MEAL = {
  breakfast: "Breakfast",
  lunch: "Lunch break",
  dinner: "Dinner",
} as const;

const TIME_BY_MEAL = {
  breakfast: "08:00",
  lunch: "12:30",
  dinner: "19:00",
} as const;

export type BeatMealSlotProps = {
  mealType: MealSlotType;
  onAddSpot: () => void;
  onDismiss: () => void;
};

/**
 * Tier-2 spine row that prompts the reader to add a meal stop. Mirrors
 * `BeatAnchor`'s rail geometry so the dot lines up with `Beat`s above and
 * below.
 *
 * Render-only: the slot never enters `day.activities`. Acceptance flows
 * through `onAddSpot` (opens the catalog dialog scoped to the day).
 */
export function BeatMealSlot({ mealType, onAddSpot, onDismiss }: BeatMealSlotProps) {
  const Icon = ICON_BY_MEAL[mealType];
  const label = LABEL_BY_MEAL[mealType];
  const time = TIME_BY_MEAL[mealType];

  return (
    <li
      data-beat="meal-slot"
      data-meal-type={mealType}
      className={cn("relative pb-4")}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-[-24px] top-[10px] flex h-[13px] w-[13px] items-center justify-center rounded-full bg-canvas text-foreground-secondary ring-1 ring-border",
        )}
      >
        <Icon className="h-2 w-2" aria-hidden />
      </span>
      <div className="flex items-start justify-between gap-3 text-foreground-secondary">
        <div className="min-w-0">
          <div className="eyebrow-editorial mb-0.5">{time}</div>
          <div className="text-sm text-foreground/85">
            {label}
            <button
              type="button"
              onClick={onAddSpot}
              className="ml-3 text-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-sm"
            >
              Add a spot
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss ${label} suggestion`}
          className="shrink-0 -mr-2 -mt-1 flex h-11 w-11 items-center justify-center rounded-md text-foreground-secondary hover:text-foreground hover:bg-canvas/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}
