"use client";

import { useEffect, useMemo, useState } from "react";
import { Plane } from "lucide-react";
import type { StoredTrip } from "@/services/trip/types";
import { getTripStatus } from "@/lib/trip/tripStatus";
import { PREP_CHECKLIST, type PrepItem, type PrepSection } from "@/data/prepChecklist";
import { useToast } from "@/context/ToastContext";
import { useTrips } from "@/state/slices/TripsSlice";
import { logTipEvent } from "@/lib/telemetry/tipEvents";
import { useTipEventContext } from "@/lib/telemetry/useTipEventContext";

const SECTION_LABELS: Record<PrepSection, string> = {
  if_you_havent_already: "If you haven't already",
  a_week_before: "A week before",
  last_few_days: "Last few days",
  japan_context: "Japan context",
  if_your_trip_has: "If your trip has…",
};

const SECTION_ORDER: PrepSection[] = [
  "if_you_havent_already",
  "a_week_before",
  "last_few_days",
  "japan_context",
  "if_your_trip_has",
];

function daysUntil(startDate: string): number {
  const [y, m, d] = startDate.split("-").map(Number);
  if (!y || !m || !d) return 0;
  const start = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((start.getTime() - today.getTime()) / msPerDay);
}

function countdownLabel(startDate: string, primaryCity: string | undefined): string {
  const days = daysUntil(startDate);
  const where = primaryCity ? primaryCity.charAt(0).toUpperCase() + primaryCity.slice(1) : "your trip";
  if (days <= 1) return `${where} tomorrow`;
  return `${where} in ${days} days`;
}

/**
 * Returns true when the trip has at least one applicable prep checklist item.
 * Used both by PrepBanner (render gate) and ItineraryShell (tray entry gate)
 * so the two surfaces stay in sync.
 */
export function hasApplicablePrepItems(trip: StoredTrip): boolean {
  return PREP_CHECKLIST.some((item) => (item.condition ? item.condition(trip) : true));
}

type Props = {
  trip: StoredTrip;
};

export function PrepBanner({ trip }: Props) {
  const status = getTripStatus(trip);
  const sessionKey = `yuku-prep-collapsed-${trip.id}`;

  const [state, setState] = useState<Record<string, boolean>>(trip.prepState ?? {});
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(sessionKey) === "1";
  });
  const { showToast } = useToast();
  const { actions: tripsActions } = useTrips();
  const tipContext = useTipEventContext(trip.id);

  // Log rendered once per mount when the banner is visible (upcoming trips
  // with applicable items). PrepBanner's "dismissal" is the collapse toggle.
  useEffect(() => {
    if (status !== "upcoming") return;
    void logTipEvent("prep", "rendered", tipContext);
  }, [status, tipContext]);

  const applicableItems = useMemo<PrepItem[]>(
    () => PREP_CHECKLIST.filter((item) => (item.condition ? item.condition(trip) : true)),
    [trip],
  );

  const { done, total } = useMemo(() => {
    const applicable = applicableItems;
    const doneCount = applicable.filter((item) => state[item.id] === true).length;
    return { done: doneCount, total: applicable.length };
  }, [applicableItems, state]);

  if (status !== "upcoming") return null;
  if (applicableItems.length === 0) return null;

  const startDate = trip.builderData?.dates?.start ?? "";
  const primaryCity = trip.builderData?.cities?.[0];
  const label = startDate ? countdownLabel(startDate, primaryCity) : "Upcoming trip";

  const allDone = done === total && total > 0;

  const toggleCollapse = () => {
    const next = !isCollapsed;
    // "Dismissed" = user chose to collapse. Expanding back up isn't a
    // second event; we only log the transition to collapsed.
    if (next) void logTipEvent("prep", "dismissed", tipContext);
    setIsCollapsed(next);
    if (typeof window !== "undefined") {
      if (next) window.sessionStorage.setItem(sessionKey, "1");
      else window.sessionStorage.removeItem(sessionKey);
    }
  };

  async function handleToggleItem(itemId: string, nextChecked: boolean) {
    const prev = state[itemId] ?? false;
    // Optimistic update (local state keeps UI correct while mounted)
    setState((s) => ({ ...s, [itemId]: nextChecked }));
    try {
      const res = await fetch(`/api/trips/${trip.id}/prep-state`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId, checked: nextChecked }),
      });
      if (!res.ok) throw new Error("patch-failed");
      // Sync the TripsSlice cache with the server's merged state so that
      // navigating away and back within the session shows the tick. Fallback
      // to a locally-merged object if the server response doesn't include it.
      const body = (await res.json().catch(() => null)) as { prepState?: Record<string, boolean> } | null;
      const merged = body?.prepState ?? { ...(trip.prepState ?? {}), [itemId]: nextChecked };
      tripsActions.updateTripPrepState(trip.id, merged);
    } catch {
      // Roll back
      setState((s) => ({ ...s, [itemId]: prev }));
      showToast("Couldn't save. Try again.", { variant: "error" });
    }
  }

  // Collapsed states: manual or all-done
  if (allDone || isCollapsed) {
    return (
      <section className="rounded-md bg-surface px-4 py-3">
        <button
          type="button"
          onClick={toggleCollapse}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={false}
        >
          <span className="flex items-center gap-2 text-sm text-foreground">
            {!allDone && <Plane className="h-3.5 w-3.5 shrink-0 text-foreground-secondary" aria-hidden="true" />}
            {allDone ? `Prep complete. ${done} of ${total} done` : `${label}`}
            <span className="text-foreground-secondary">· {done} of {total} done</span>
          </span>
          <span aria-hidden="true" className="text-foreground-secondary">+</span>
        </button>
      </section>
    );
  }

  // Expanded state
  const sections: Record<PrepSection, PrepItem[]> = {
    if_you_havent_already: [],
    a_week_before: [],
    last_few_days: [],
    japan_context: [],
    if_your_trip_has: [],
  };
  for (const item of applicableItems) sections[item.section].push(item);

  return (
    <section className="rounded-md bg-surface px-4 py-3">
      <button
        type="button"
        onClick={toggleCollapse}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={true}
      >
        <span className="flex items-center gap-2 text-sm text-foreground">
          <Plane className="h-3.5 w-3.5 shrink-0 text-foreground-secondary" aria-hidden="true" />
          {label}
          <span className="text-foreground-secondary">· {done} of {total} done</span>
        </span>
        <span aria-hidden="true" className="text-foreground-secondary">−</span>
      </button>

      <div className="mt-4 space-y-6">
        {SECTION_ORDER.map((sectionKey) => {
          const items = sections[sectionKey];
          if (items.length === 0) return null;
          return (
            <div key={sectionKey}>
              <h3 className="eyebrow-mono">
                {SECTION_LABELS[sectionKey]}
              </h3>
              <ul className="mt-2 space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <input
                      id={`prep-${item.id}`}
                      type="checkbox"
                      checked={state[item.id] ?? false}
                      onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-primary"
                    />
                    <label htmlFor={`prep-${item.id}`} className="flex-1 cursor-pointer">
                      <span className="text-sm font-medium text-foreground">{item.title}</span>
                      <p className="mt-0.5 text-sm text-foreground-secondary leading-relaxed">{item.body}</p>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
