"use client";

import { useEffect, useRef } from "react";
import type { AdvisoryKey } from "@/types/tripAdvisories";
import { getGtag } from "@/lib/analytics/customLocations";

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
  tripId,
  entries,
  dismissed,
  onDismiss,
}: TripAdvisoriesTrayProps) {
  const hasLoggedOpen = useRef(false);
  useEffect(() => {
    if (hasLoggedOpen.current) return;
    hasLoggedOpen.current = true;
    getGtag()?.("event", "trip_advisories_tray.open_rate", {
      trip_id: tripId,
      entry_count: entries.length,
    });
  }, [tripId, entries.length]);

  const active = entries.filter((e) => !dismissed.has(e.key));

  if (active.length === 0) {
    return (
      <p className="py-4 text-sm text-foreground-secondary">
        No advisories right now.
      </p>
    );
  }

  return (
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
  );
}
