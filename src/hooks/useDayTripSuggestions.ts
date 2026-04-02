/**
 * Hook to fetch day trip suggestions for the current itinerary.
 *
 * Calls POST /api/day-trips/suggest once on mount when the itinerary
 * has a city with 3+ days. Results are cached in state.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import type { Itinerary } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { DayTripSuggestion } from "@/types/dayTrips";

const MIN_DAYS_FOR_SUGGESTION = 3;

export function useDayTripSuggestions(
  itinerary: Itinerary | null,
  tripBuilderData: TripBuilderData | undefined,
  usedLocationIds: string[],
): {
  suggestions: DayTripSuggestion[];
  isLoading: boolean;
  suggestionsForDay: (dayIndex: number) => DayTripSuggestion[];
} {
  const [suggestions, setSuggestions] = useState<DayTripSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedKey, setFetchedKey] = useState<string>("");

  // Extract unique cities and count days per city
  const { cities, hasEligibleCity, cacheKey } = useMemo(() => {
    if (!itinerary?.days) return { cities: [], hasEligibleCity: false, cacheKey: "" };

    const dayCounts = new Map<string, number>();
    for (const day of itinerary.days) {
      if (day.cityId) {
        dayCounts.set(day.cityId, (dayCounts.get(day.cityId) || 0) + 1);
      }
    }

    const uniqueCities = [...dayCounts.keys()];
    const eligible = [...dayCounts.values()].some((c) => c >= MIN_DAYS_FOR_SUGGESTION);
    const key = uniqueCities.sort().join(",") + "|" + (tripBuilderData?.vibes?.sort().join(",") || "");

    return { cities: uniqueCities, hasEligibleCity: eligible, cacheKey: key };
  }, [itinerary?.days, tripBuilderData?.vibes]);

  useEffect(() => {
    if (!hasEligibleCity || cities.length === 0) {
      setSuggestions((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    // Don't re-fetch if the key hasn't changed
    if (fetchedKey === cacheKey) return;

    let cancelled = false;

    async function fetchSuggestions() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/day-trips/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cities,
            vibes: tripBuilderData?.vibes || [],
            usedLocationIds,
            tripStart: tripBuilderData?.dates?.start,
          }),
        });

        if (!cancelled && res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setFetchedKey(cacheKey);
        }
      } catch {
        // Silently fail -- day trip suggestions are non-critical
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchSuggestions();
    return () => { cancelled = true; };
  }, [hasEligibleCity, cities, cacheKey, fetchedKey, tripBuilderData, usedLocationIds]);

  // Map base city -> suggestions for efficient per-day lookup
  const byCityMap = useMemo(() => {
    const map = new Map<string, DayTripSuggestion[]>();
    for (const s of suggestions) {
      const list = map.get(s.baseCityId) || [];
      list.push(s);
      map.set(s.baseCityId, list);
    }
    return map;
  }, [suggestions]);

  const suggestionsForDay = useCallback(
    (dayIndex: number): DayTripSuggestion[] => {
      if (!itinerary?.days?.[dayIndex]) return [];
      const day = itinerary.days[dayIndex];
      if (!day.cityId || day.isDayTrip) return [];
      return byCityMap.get(day.cityId) || [];
    },
    [itinerary?.days, byCityMap],
  );

  return { suggestions, isLoading, suggestionsForDay };
}
