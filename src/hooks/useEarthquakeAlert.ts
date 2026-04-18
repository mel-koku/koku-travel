"use client";

import { useEffect, useState } from "react";
import type { EarthquakeAlert } from "@/lib/alerts/usgs";

/**
 * Fetches the live earthquake alert for a trip. One fetch per mount,
 * no polling, no revalidation. Silent on error — banner does not render.
 */
export function useEarthquakeAlert(tripId: string | null | undefined): EarthquakeAlert | null {
  const [alert, setAlert] = useState<EarthquakeAlert | null>(null);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/alerts/earthquakes?tripId=${encodeURIComponent(tripId)}`);
        if (!res.ok) return;
        const body = (await res.json()) as { alert: EarthquakeAlert | null };
        if (!cancelled) setAlert(body.alert ?? null);
      } catch {
        // silent — absence of an alert is the default state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  return alert;
}
