"use client";

import { useCallback, useMemo } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { INTEREST_CATEGORIES } from "@/data/interests";
import { cn } from "@/lib/cn";
import type { InterestId } from "@/types/trip";

export type InterestChipsProps = {
  maxSelection?: number;
  onSelectionChange?: (interests: InterestId[]) => void;
};

const DEFAULT_MAX_SELECTION = 5;

const INTEREST_ORDER = INTEREST_CATEGORIES.map((category) => category.id);
const INTEREST_ORDER_MAP = INTEREST_ORDER.reduce<Record<InterestId, number>>(
  (acc, id, index) => {
    acc[id] = index;
    return acc;
  },
  {} as Record<InterestId, number>
);

export function InterestChips({
  maxSelection = DEFAULT_MAX_SELECTION,
  onSelectionChange,
}: InterestChipsProps) {
  const { data, setData } = useTripBuilder();

  const selectedInterests = useMemo(
    () => sortInterests(data.interests ?? []),
    [data.interests]
  );

  const isMaxSelected = selectedInterests.length >= maxSelection;

  const toggleInterest = useCallback(
    (interestId: InterestId) => {
      setData((prev) => {
        const current = new Set<InterestId>(prev.interests ?? []);
        if (current.has(interestId)) {
          current.delete(interestId);
        } else {
          if (current.size >= maxSelection) {
            return prev;
          }
          current.add(interestId);
        }
        const nextInterests = sortInterests(current);
        if (arraysEqual(prev.interests ?? [], nextInterests)) {
          return prev;
        }
        onSelectionChange?.(nextInterests);
        return {
          ...prev,
          interests: nextInterests,
        };
      });
    },
    [setData, maxSelection, onSelectionChange]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Interests</h4>
        <span className="text-xs text-stone">
          {selectedInterests.length}/{maxSelection}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {INTEREST_CATEGORIES.map((category) => {
          const isSelected = selectedInterests.includes(category.id);
          const isDisabled = isMaxSelected && !isSelected;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => toggleInterest(category.id)}
              aria-pressed={isSelected}
              aria-disabled={isDisabled}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
                isSelected
                  ? "border-brand-primary bg-brand-primary text-white hover:bg-brand-primary/90"
                  : "border-border bg-background text-foreground-secondary hover:bg-surface hover:border-brand-primary/30",
                isDisabled && "cursor-not-allowed opacity-50 hover:bg-background"
              )}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      {selectedInterests.length === 0 && (
        <p className="text-xs text-stone">
          Select interests to see matching cities highlighted on the map.
        </p>
      )}

      {isMaxSelected && (
        <p className="text-xs text-warning">
          Maximum {maxSelection} interests. Deselect one to choose another.
        </p>
      )}
    </div>
  );
}

function sortInterests(interests: Iterable<InterestId>): InterestId[] {
  const unique = Array.from(new Set(interests));
  unique.sort((a, b) => INTEREST_ORDER_MAP[a] - INTEREST_ORDER_MAP[b]);
  return unique;
}

function arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}
