"use client";

import { useState } from "react";
import type { PlanningWarning, WarningType } from "@/lib/planning/tripWarnings";

// Warning types worth re-surfacing AFTER the itinerary is generated.
// `pacing` is excluded because the trip is already committed — no actionable
// next step. Everything else here represents context the traveler will still
// act on during the trip: weather, holidays, festivals, distance (e.g.
// Hokkaido + Kyushu means a domestic flight), and the return-to-airport
// buffer.
//
// Note: `festival_near_miss` warnings carrying an `action` field are
// suppressed below — the extend-trip offer only makes sense pre-generation.
// Other warning types (e.g. `return_to_airport`) may also set `action`; their
// data still shows in the banner because the banner itself never renders
// the action button.
const RELEVANT_POST_GENERATION: ReadonlySet<WarningType> = new Set([
  "holiday",
  "seasonal_rainy",
  "seasonal_cherry_blossom",
  "seasonal_autumn",
  "weather",
  "festival",
  "festival_near_miss",
  "distance",
  "return_to_airport",
]);

type Props = {
  warnings: PlanningWarning[] | undefined;
};

export function PlanningWarningsBanner({ warnings }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const relevant = (warnings ?? []).filter((w) => {
    if (!RELEVANT_POST_GENERATION.has(w.type)) return false;
    // Hide actionable festival_near_miss post-generation: the extend offer is
    // builder-only because the trip is already locked.
    if (w.type === "festival_near_miss" && w.action) return false;
    return true;
  });

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
