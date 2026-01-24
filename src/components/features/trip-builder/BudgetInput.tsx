"use client";

import { useCallback, useMemo } from "react";

import { cn } from "@/lib/cn";

export type BudgetMode = "perDay" | "total";

export type BudgetValue = {
  amount: number;
  mode: BudgetMode;
};

export type BudgetInputProps = {
  /** Trip duration in days - required to enable the input */
  duration?: number;
  /** Current budget value (amount and mode) */
  value?: BudgetValue;
  /** Called when budget changes with calculated total and perDay values */
  onChange: (budget: { total?: number; perDay?: number }) => void;
  /** Called when mode changes between perDay and total */
  onModeChange?: (mode: BudgetMode) => void;
  /** Optional id for accessibility */
  id?: string;
};

/**
 * Formats a number as Japanese Yen currency.
 */
function formatYen(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Budget input component with single amount field and per-day/total toggle.
 * Auto-calculates the other value based on trip duration.
 */
export function BudgetInput({ duration, value, onChange, onModeChange, id = "budget" }: BudgetInputProps) {
  const hasDuration = typeof duration === "number" && duration >= 1;

  // Calculate the complementary value
  const calculatedValue = useMemo(() => {
    if (!hasDuration || !value?.amount) return null;

    if (value.mode === "perDay") {
      return {
        total: value.amount * duration!,
        perDay: value.amount,
        displayText: `= ${formatYen(value.amount * duration!)} total for ${duration} day${duration === 1 ? "" : "s"}`,
      };
    } else {
      const perDay = Math.round(value.amount / duration!);
      return {
        total: value.amount,
        perDay,
        displayText: `= ${formatYen(perDay)} per day for ${duration} day${duration === 1 ? "" : "s"}`,
      };
    }
  }, [hasDuration, duration, value]);

  // Handle amount change
  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/[^0-9]/g, "");
      const amount = rawValue ? parseInt(rawValue, 10) : undefined;

      if (amount === undefined || !hasDuration) {
        onChange({ total: undefined, perDay: undefined });
        return;
      }

      const mode = value?.mode ?? "perDay";
      if (mode === "perDay") {
        onChange({ total: amount * duration!, perDay: amount });
      } else {
        onChange({ total: amount, perDay: Math.round(amount / duration!) });
      }
    },
    [duration, hasDuration, onChange, value?.mode]
  );

  // Handle mode change
  const handleModeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newMode = e.target.value as BudgetMode;

      // Notify parent of mode change
      onModeChange?.(newMode);

      if (!value?.amount || !hasDuration) return;

      // When switching modes, recalculate based on the currently stored values
      // If switching from perDay to total, the new input should show the total
      // If switching from total to perDay, the new input should show the perDay
      if (value.mode === "perDay" && newMode === "total") {
        // Currently showing perDay amount, switching to show total
        const total = value.amount * duration!;
        onChange({ total, perDay: value.amount });
      } else if (value.mode === "total" && newMode === "perDay") {
        // Currently showing total, switching to show perDay
        const perDay = Math.round(value.amount / duration!);
        onChange({ total: value.amount, perDay });
      }
    },
    [duration, hasDuration, onChange, onModeChange, value]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    onChange({ total: undefined, perDay: undefined });
  }, [onChange]);

  // Check for low budget warning
  const showLowBudgetWarning = useMemo(() => {
    if (!calculatedValue?.perDay) return false;
    return calculatedValue.perDay < 1000;
  }, [calculatedValue]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* Amount input with ¥ prefix */}
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-stone font-medium">
            ¥
          </span>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            placeholder={hasDuration ? "Enter amount" : ""}
            disabled={!hasDuration}
            value={value?.amount?.toLocaleString("ja-JP") ?? ""}
            onChange={handleAmountChange}
            className={cn(
              "block w-full rounded-xl border border-border bg-background text-base text-charcoal placeholder:text-stone shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
              "h-12 pl-9 pr-4",
              !hasDuration && "cursor-not-allowed bg-surface text-stone opacity-80"
            )}
            aria-describedby={hasDuration ? `${id}-calculated` : `${id}-helper`}
          />
          {/* Clear button */}
          {value?.amount && hasDuration && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-3 flex items-center text-stone hover:text-warm-gray transition-colors"
              aria-label="Clear budget"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Mode selector */}
        <div className="relative">
          <select
            value={value?.mode ?? "perDay"}
            onChange={handleModeChange}
            disabled={!hasDuration}
            className={cn(
              "block appearance-none rounded-xl border border-border bg-background pl-4 pr-10 text-base text-charcoal shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
              "h-12",
              !hasDuration && "cursor-not-allowed bg-surface text-stone opacity-80"
            )}
            aria-label="Budget calculation mode"
          >
            <option value="perDay">Per Day</option>
            <option value="total">Total Trip</option>
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-stone">
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </div>
      </div>

      {/* Helper text when no duration */}
      {!hasDuration && (
        <p id={`${id}-helper`} className="text-sm text-stone">
          Set trip duration first to enable budget input
        </p>
      )}

      {/* Auto-calculated value display */}
      {calculatedValue && (
        <p id={`${id}-calculated`} className="text-sm text-foreground-secondary">
          {calculatedValue.displayText}
        </p>
      )}

      {/* Low budget warning */}
      {showLowBudgetWarning && (
        <p className="text-sm text-warning">
          Budget is quite low — consider increasing for a comfortable trip
        </p>
      )}
    </div>
  );
}
