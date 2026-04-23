"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { StoredTrip } from "@/services/trip/types";
import { getTripStatus } from "@/lib/trip/tripStatus";
import { useToast } from "@/context/ToastContext";
import { useTrips } from "@/state/slices/TripsSlice";
import { logTipEvent } from "@/lib/telemetry/tipEvents";
import { useTipEventContext } from "@/lib/telemetry/useTipEventContext";

/**
 * Checks if trip itinerary includes any shrine or temple activities.
 * Reads from `trip.itinerary?.days` (persisted data), not a live planning model.
 */
function hasVisitedShrineOrTemple(trip: StoredTrip): boolean {
  if (!trip.itinerary?.days) return false;
  for (const day of trip.itinerary.days) {
    if (!day.activities) continue;
    for (const activity of day.activities) {
      if (activity.kind === "place") {
        const tags = (activity.tags as string[]) ?? [];
        if (tags.some((tag) => tag === "shrine" || tag === "temple")) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Single source of truth for "should the goshuin banner / tray entry show?"
 * Returns false when ANY of:
 *   - trip is not upcoming
 *   - no shrine/temple in the itinerary
 *   - user previously dismissed (planningWarnings.goshuinShown)
 *   - user dismissed in the current session (sessionStorage)
 *
 * Used both by GoshuinBanner (render gate) and ItineraryShell (tray entry gate).
 */
export function shouldShowGoshuin(trip: StoredTrip): boolean {
  if (getTripStatus(trip) !== "upcoming") return false;
  if (!hasVisitedShrineOrTemple(trip)) return false;
  if (trip.planningWarnings?.goshuinShown === true) return false;
  if (
    typeof window !== "undefined" &&
    window.sessionStorage.getItem(`yuku-goshuin-dismissed-${trip.id}`) === "1"
  ) {
    return false;
  }
  return true;
}

type Props = {
  trip: StoredTrip;
};

export function GoshuinBanner({ trip }: Props) {
  const sessionKey = `yuku-goshuin-dismissed-${trip.id}`;
  const { showToast } = useToast();
  const { actions: tripsActions } = useTrips();
  const tipContext = useTipEventContext(trip.id);

  // Check if already dismissed in session or in trip state
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    // Check session storage first (take precedence for quick dismiss)
    const sessionDismissed = window.sessionStorage.getItem(sessionKey) === "1";
    if (sessionDismissed) return true;
    // Fall back to trip state
    return trip.planningWarnings?.goshuinShown === true;
  });

  // Derive shouldShow from the canonical predicate. isDismissed is local
  // React state for optimistic updates; when it flips the effect re-runs.
  const shouldShow = useMemo(
    () => !isDismissed && shouldShowGoshuin(trip),
    [isDismissed, trip],
  );

  useEffect(() => {
    if (!shouldShow) return;
    void logTipEvent("goshuin", "rendered", tipContext);
  }, [shouldShow, tipContext]);

  const handleDismiss = useCallback(async () => {
    void logTipEvent("goshuin", "dismissed", tipContext);
    // Optimistic update
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(sessionKey, "1");
    }

    try {
      const res = await fetch(`/api/trips/${trip.id}/planning-warnings`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goshuinShown: true }),
      });
      if (!res.ok) throw new Error("patch-failed");

      // Sync trip state with server response
      const body = (await res.json().catch(() => null)) as {
        planningWarnings?: Record<string, unknown>;
      } | null;
      if (body?.planningWarnings) {
        tripsActions.updateTripPlanningWarnings(trip.id, body.planningWarnings);
      }
    } catch {
      // Roll back on error
      setIsDismissed(false);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(sessionKey);
      }
      showToast("Couldn't save — try again", { variant: "error" });
    }
  }, [trip.id, sessionKey, showToast, tripsActions, tipContext]);

  if (!shouldShow) return null;

  return (
    <section className="rounded-md bg-surface px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-medium text-foreground">Goshuin etiquette</h3>
          <p className="mt-2 text-sm text-foreground-secondary">
            Temple stamps (goshuin) are spiritual records. Purchase a fresh book (¥1,000–1,500)
            at your first visit. Monks stamp it with their temple&rsquo;s mark. Don&rsquo;t lend it out;
            keep it safe.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="mt-1 flex-shrink-0 text-sm font-medium text-brand-primary hover:underline"
          aria-label="Dismiss goshuin etiquette banner"
        >
          Got it
        </button>
      </div>
    </section>
  );
}
