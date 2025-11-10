"use client";

import { useCallback, useEffect, useMemo } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { INTEREST_CATEGORIES } from "@/data/interests";
import { cn } from "@/lib/cn";
import type { InterestId, TripStyle } from "@/types/trip";

export type Step3InterestsProps = {
  formId: string;
  onNext: () => void;
  onValidityChange: (isValid: boolean) => void;
};

const MAX_INTEREST_SELECTION = 5;

const INTEREST_ORDER = INTEREST_CATEGORIES.map((category) => category.id);
const INTEREST_ORDER_MAP = INTEREST_ORDER.reduce<Record<InterestId, number>>((acc, id, index) => {
  acc[id] = index;
  return acc;
}, {} as Record<InterestId, number>);

const PACE_OPTIONS: Array<{
  id: TripStyle;
  title: string;
  description: string;
  emoji: string;
}> = [
  {
    id: "relaxed",
    title: "Relaxed",
    description: "Slow mornings, gentle pacing, and time to soak in the details.",
    emoji: "🌿",
  },
  {
    id: "balanced",
    title: "Balanced",
    description: "A comfortable rhythm with a mix of highlights and downtime.",
    emoji: "⚖️",
  },
  {
    id: "fast",
    title: "Fast",
    description: "High energy, packed schedules, and squeezing in every must-see.",
    emoji: "⚡️",
  },
];

export function Step3Interests({ formId, onNext, onValidityChange }: Step3InterestsProps) {
  const { data, setData } = useTripBuilder();

  const selectedInterests = useMemo(
    () => sortInterests(data.interests ?? []),
    [data.interests],
  );
  const selectedStyle = data.style;
  const isMaxSelected = selectedInterests.length >= MAX_INTEREST_SELECTION;

  useEffect(() => {
    onValidityChange(selectedInterests.length > 0 && Boolean(selectedStyle));
  }, [onValidityChange, selectedInterests.length, selectedStyle]);

  const toggleInterest = useCallback(
    (interestId: InterestId) => {
      setData((prev) => {
        const current = new Set<InterestId>(prev.interests ?? []);
        if (current.has(interestId)) {
          current.delete(interestId);
        } else {
          if (current.size >= MAX_INTEREST_SELECTION) {
            return prev;
          }
          current.add(interestId);
        }
        const nextInterests = sortInterests(current);
        if (arraysEqual(prev.interests ?? [], nextInterests)) {
          return prev;
        }
        return {
          ...prev,
          interests: nextInterests,
        };
      });
    },
    [setData],
  );

  const handleSelectStyle = useCallback(
    (style: TripStyle) => {
      setData((prev) => {
        if (prev.style === style) {
          return prev;
        }
        return {
          ...prev,
          style,
        };
      });
    },
    [setData],
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (selectedInterests.length === 0 || !selectedStyle) {
        onValidityChange(false);
        return;
      }
      onNext();
    },
    [onNext, onValidityChange, selectedInterests.length, selectedStyle],
  );

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="flex h-full flex-col gap-10 lg:flex-row"
      noValidate
    >
      <section className="flex-1">
        <header className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">What are you most interested in?</h2>
            <p className="mt-2 text-sm text-gray-600">
              Choose up to five categories to tailor recommendations across your journey.
            </p>
          </div>
          <p className="text-sm text-gray-500">
            {selectedInterests.length}/{MAX_INTEREST_SELECTION} selected
          </p>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                  "rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 hover:bg-gray-50",
                  isSelected && "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-600",
                  isDisabled && "cursor-not-allowed opacity-60 hover:bg-white",
                )}
              >
                {category.name}
              </button>
            );
          })}
        </div>
        {isMaxSelected && (
          <p className="mt-3 text-sm text-gray-500">
            You&apos;ve reached the limit. Deselect one to explore another interest.
          </p>
        )}
      </section>

      <aside className="flex w-full flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-6 lg:w-80 lg:flex-shrink-0">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">What’s your travel pace?</h3>
          <p className="mt-2 text-sm text-gray-600">Pick the vibe that best matches your ideal day.</p>
        </div>

        <div role="radiogroup" aria-label="Travel pace" className="flex flex-col gap-4">
          {PACE_OPTIONS.map((option) => {
            const isSelected = selectedStyle === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelectStyle(option.id)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 hover:bg-gray-50",
                  isSelected && "border-indigo-200 bg-indigo-50 ring-2 ring-indigo-500",
                )}
              >
                <span aria-hidden="true" className="text-2xl leading-none">
                  {option.emoji}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-gray-900">{option.title}</span>
                  <span className="mt-1 block text-sm text-gray-600">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>
    </form>
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


