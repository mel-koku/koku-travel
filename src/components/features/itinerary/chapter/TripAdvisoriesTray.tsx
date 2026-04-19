"use client";

import { useState } from "react";
import type { AdvisoryKey } from "@/types/tripAdvisories";

export type AdvisoryEntry = {
  key: AdvisoryKey;
  title: string;
  body: string;
};

export type TripAdvisoriesTrayProps = {
  tripId: string;
  entries: AdvisoryEntry[];
  dismissed: Set<AdvisoryKey>;
  onDismiss: (key: AdvisoryKey) => void;
};

export function TripAdvisoriesTray({
  entries,
  dismissed,
  onDismiss,
}: TripAdvisoriesTrayProps) {
  const [showDismissed, setShowDismissed] = useState(false);
  const active = entries.filter((e) => !dismissed.has(e.key));
  const dismissedEntries = entries.filter((e) => dismissed.has(e.key));

  return (
    <aside
      aria-label="Trip advisories"
      className="w-full max-w-md bg-surface rounded-md border border-border p-4"
    >
      <h3 className="text-sm font-medium text-foreground mb-3">
        Trip advisories ({active.length})
      </h3>
      <div className="border-t border-border" />
      <ul className="divide-y divide-border">
        {active.map((entry) => (
          <li key={entry.key} className="py-3 flex items-start gap-3">
            <span aria-hidden className="text-warning text-xs pt-1">◈</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">{entry.title}</div>
              <p className="text-xs text-foreground-secondary leading-relaxed mt-0.5">
                {entry.body}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(entry.key)}
              className="text-xs text-accent underline underline-offset-2 whitespace-nowrap"
            >
              Got it
            </button>
          </li>
        ))}
      </ul>
      {dismissedEntries.length > 0 && (
        <>
          <div className="border-t border-border mt-2" />
          <button
            type="button"
            className="text-xs text-foreground-secondary mt-2"
            onClick={() => setShowDismissed((v) => !v)}
          >
            Dismissed ({dismissedEntries.length}) {showDismissed ? "↑" : "↓"}
          </button>
          {showDismissed && (
            <ul className="mt-2 space-y-2 opacity-70">
              {dismissedEntries.map((entry) => (
                <li key={entry.key} className="text-xs text-foreground-secondary">
                  {entry.title}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </aside>
  );
}
