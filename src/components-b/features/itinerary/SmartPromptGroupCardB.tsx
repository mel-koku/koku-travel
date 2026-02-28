"use client";

import { Coffee, Loader2, Utensils, UtensilsCrossed } from "lucide-react";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";

const MEAL_CONFIG = {
  breakfast: {
    icon: Coffee,
    label: "Breakfast",
    addLabel: "Add",
    konbiniLabel: "Konbini",
    description: "Start each morning with a local spot or a quick konbini option",
  },
  lunch: {
    icon: Utensils,
    label: "Lunch",
    addLabel: "Add",
    konbiniLabel: "Konbini",
    description: "Sit down for a proper lunch or grab something quick nearby",
  },
  dinner: {
    icon: UtensilsCrossed,
    label: "Dinner",
    addLabel: "Add",
    konbiniLabel: "Konbini",
    description: "End the day with a restaurant or a quick konbini meal",
  },
} as const;

export type SmartPromptGroupCardBProps = {
  mealType: "breakfast" | "lunch" | "dinner";
  restaurantGaps: DetectedGap[];
  konbiniGaps: DetectedGap[];
  onAccept: (gap: DetectedGap) => void;
  onSkip: (gap: DetectedGap) => void;
  loadingGapId?: string | null;
};

export function SmartPromptGroupCardB({
  mealType,
  restaurantGaps,
  konbiniGaps,
  onAccept,
  onSkip,
  loadingGapId,
}: SmartPromptGroupCardBProps) {
  const config = MEAL_CONFIG[mealType];
  const Icon = config.icon;
  const dayCount = Math.max(restaurantGaps.length, konbiniGaps.length);

  const allGaps = [...restaurantGaps, ...konbiniGaps];
  const isLoading = allGaps.some((g) => g.id === loadingGapId);

  const handleAdd = () => {
    const first = restaurantGaps[0];
    if (first) onAccept(first);
  };

  const handleKonbini = () => {
    const first = konbiniGaps[0];
    if (first) onAccept(first);
  };

  const handleSkipAll = () => {
    for (const gap of allGaps) {
      onSkip(gap);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-[var(--card)] p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          <Icon className="h-4.5 w-4.5" style={{ color: "var(--primary)" }} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {config.label}
            </h4>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "var(--primary)",
              }}
            >
              {dayCount} day{dayCount !== 1 ? "s" : ""}
            </span>
          </div>

          <p
            className="mt-1 text-xs leading-relaxed"
            style={{ color: "var(--muted-foreground)" }}
          >
            {config.description}
          </p>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            {restaurantGaps.length > 0 && (
              <button
                type="button"
                onClick={handleAdd}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium text-[var(--card)] transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
                style={{
                  backgroundColor: "var(--primary)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {isLoading && loadingGapId === restaurantGaps[0]?.id ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Adding...
                  </>
                ) : (
                  config.addLabel
                )}
              </button>
            )}
            {konbiniGaps.length > 0 && (
              <button
                type="button"
                onClick={handleKonbini}
                disabled={isLoading}
                className="rounded-xl border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {isLoading && loadingGapId === konbiniGaps[0]?.id ? (
                  <>
                    <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                    Adding...
                  </>
                ) : (
                  config.konbiniLabel
                )}
              </button>
            )}
            <button
              type="button"
              onClick={handleSkipAll}
              disabled={isLoading}
              className="rounded-xl px-3.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors duration-200 hover:bg-[var(--surface)] hover:text-[var(--foreground)] disabled:opacity-60"
            >
              Skip all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
