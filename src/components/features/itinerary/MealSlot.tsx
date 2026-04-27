"use client";

import { Coffee, Utensils, UtensilsCrossed, X } from "lucide-react";

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

type Props = {
  mealType: MealSlotType;
  onAddSpot: () => void;
  onKonbini?: () => void;
  onDismiss: () => void;
};

export function MealSlot({ mealType, onAddSpot, onKonbini, onDismiss }: Props) {
  const Icon = ICON_BY_MEAL[mealType];
  const label = LABEL_BY_MEAL[mealType];
  const time = TIME_BY_MEAL[mealType];
  const showKonbini = mealType !== "dinner" && Boolean(onKonbini);

  return (
    <div className="py-1">
      <div
        role="group"
        aria-label={`${label} suggestion`}
        className="flex min-h-[44px] flex-col gap-2 rounded-md border border-dashed border-border bg-transparent px-3 py-2 sm:flex-row sm:items-center sm:gap-3 sm:py-1.5"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-stone" aria-hidden="true" />
          <span className="font-mono text-xs text-stone">{time}</span>
          <span className="text-stone/40" aria-hidden="true">·</span>
          <span className="text-xs text-stone">{label}</span>
        </div>
        <div className="flex flex-1 items-center justify-end gap-1">
          {showKonbini && (
            <>
              <button
                type="button"
                onClick={onKonbini}
                className="min-h-11 px-2 text-xs text-stone transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                Konbini
              </button>
              <span className="text-stone/40" aria-hidden="true">·</span>
            </>
          )}
          <button
            type="button"
            onClick={onAddSpot}
            className="min-h-11 px-2 text-xs text-foreground transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            Add a spot
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={`Dismiss ${label} suggestion`}
            className="ml-1 flex h-11 w-11 items-center justify-center rounded-full text-stone/40 transition-colors hover:text-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
