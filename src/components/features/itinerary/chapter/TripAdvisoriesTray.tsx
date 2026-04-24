"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import type { AdvisoryKey } from "@/types/tripAdvisories";
import { getGtag } from "@/lib/analytics/customLocations";

export type AdvisoryActionKey = "open-prep-checklist" | "open-trip-overview";

export type AdvisoryEntry = {
  key: AdvisoryKey;
  title: string;
  body: string;
  action?: {
    label: string;
    key: AdvisoryActionKey;
  };
};

export type TripAdvisoriesTrayProps = {
  tripId: string;
  entries: AdvisoryEntry[];
  dismissed: Set<AdvisoryKey>;
  onDismiss: (key: AdvisoryKey) => void;
  onAction?: (key: AdvisoryActionKey) => void;
};

export function TripAdvisoriesTray({
  tripId,
  entries,
  dismissed,
  onDismiss,
  onAction,
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
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
          <div className="flex-1">
            <div className="text-sm font-medium text-foreground">{entry.title}</div>
            <p className="text-xs text-foreground-secondary leading-relaxed mt-0.5">
              {entry.body}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {entry.action && onAction && (
              <button
                type="button"
                onClick={() => onAction(entry.action!.key)}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 active:scale-[0.98] transition-colors whitespace-nowrap"
              >
                {entry.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => onDismiss(entry.key)}
              className="text-xs text-foreground-secondary underline underline-offset-2 whitespace-nowrap"
            >
              Got it
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
