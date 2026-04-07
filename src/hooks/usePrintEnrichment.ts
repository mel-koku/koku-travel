import { useEffect, useState } from "react";
import type { StoredTrip } from "@/services/trip/types";
import type { PrintEnrichmentMap } from "@/app/api/locations/print-enrichment/route";

/**
 * Fetches print-relevant location metadata (Japanese names, stations,
 * cash-only, reservation info) for all activities in a trip.
 *
 * Returns a map keyed by locationId. Empty map while loading or on error.
 */
export function usePrintEnrichment(trip: StoredTrip | undefined): {
  enrichment: PrintEnrichmentMap;
  isLoading: boolean;
} {
  const [enrichment, setEnrichment] = useState<PrintEnrichmentMap>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!trip) return;

    const locationIds = new Set<string>();
    for (const day of trip.itinerary.days) {
      for (const activity of day.activities) {
        if (activity.kind === "place" && activity.locationId) {
          locationIds.add(activity.locationId);
        }
      }
    }

    if (locationIds.size === 0) return;

    const controller = new AbortController();
    setIsLoading(true);

    fetch(`/api/locations/print-enrichment?ids=${[...locationIds].join(",")}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          setEnrichment(json.data);
        }
      })
      .catch(() => {
        // Enrichment is optional; book renders fine without it
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [trip?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { enrichment, isLoading };
}
