"use client";

import { useState } from "react";
import type { PlanningWarning, WarningType } from "@/lib/planning/tripWarnings";

const RELEVANT_POST_GENERATION: ReadonlySet<WarningType> = new Set([
  "holiday",
  "seasonal_rainy",
  "seasonal_cherry_blossom",
  "seasonal_autumn",
  "weather",
  "festival",
  "return_to_airport",
]);

type Props = {
  warnings: PlanningWarning[] | undefined;
};

export function PlanningWarningsBanner({ warnings }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const relevant = (warnings ?? []).filter((w) => RELEVANT_POST_GENERATION.has(w.type));

  if (relevant.length === 0) return null;

  return (
    <section className="rounded-md bg-surface px-4 py-3">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={isOpen}
      >
        <span className="text-base text-foreground">
          Trip context
          <span className="ml-2 rounded-full px-2 py-0.5 text-xs text-foreground-secondary">
            {relevant.length}
          </span>
        </span>
        <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && (
        <ul className="mt-3 space-y-3">
          {relevant.map((w) => (
            <li key={w.id} className="flex gap-3">
              <span aria-hidden="true" className="text-lg">{w.icon}</span>
              <div>
                <div className="font-medium text-foreground">{w.title}</div>
                <div className="text-sm text-foreground-secondary">{w.message}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
