import { useEffect, useMemo, useState } from "react";
import type { Itinerary } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { TripGuide } from "@/types/itineraryGuide";
import type { GeneratedGuide } from "@/types/llmConstraints";

// Lazy-load guide builder to keep ~90KB of template data out of the main bundle
const buildGuideAsync = () => import("@/lib/guide/guideBuilder").then((m) => m.buildGuide);

/**
 * Lazy-loads and builds the trip guide from itinerary data.
 * Returns the full guide and the guide for the current day.
 *
 * When `guideProse` is provided, uses LLM-generated prose for each segment
 * with template fallback for any missing pieces.
 */
export function useItineraryGuide(
  model: Itinerary,
  tripBuilderData?: TripBuilderData,
  dayIntros?: Record<string, string>,
  currentDayId?: string,
  guideProse?: GeneratedGuide,
) {
  const [tripGuide, setTripGuide] = useState<TripGuide | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildGuideAsync().then((buildGuide) => {
      if (!cancelled) {
        setTripGuide(buildGuide(model, tripBuilderData, dayIntros, guideProse));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [model, tripBuilderData, dayIntros, guideProse]);

  const currentDayGuide = useMemo(() => {
    if (!tripGuide || !currentDayId) return null;
    return tripGuide.days.find((dg) => dg.dayId === currentDayId) ?? null;
  }, [tripGuide, currentDayId]);

  return { tripGuide, currentDayGuide };
}
