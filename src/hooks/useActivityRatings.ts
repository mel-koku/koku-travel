"use client";

import { useCallback, useMemo, useState } from "react";
import { extractFetchErrorMessage } from "@/lib/api/fetchError";

export type ActivityRatingData = {
  activityId: string;
  locationId?: string;
  rating: number;
  comment?: string;
};

type RatingsMap = Map<string, ActivityRatingData>;

/**
 * Hook to manage activity ratings for a trip.
 * Fetches existing ratings on mount and provides optimistic upsert.
 */
export function useActivityRatings(tripId: string | undefined) {
  const [ratings, setRatings] = useState<RatingsMap>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchRatings = useCallback(async () => {
    if (!tripId || hasFetched) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ratings?trip_id=${encodeURIComponent(tripId)}`);
      if (!res.ok) return;
      const data = await res.json();
      const map: RatingsMap = new Map();
      for (const r of data.ratings ?? []) {
        map.set(r.activity_id, {
          activityId: r.activity_id,
          locationId: r.location_id ?? undefined,
          rating: r.rating,
          comment: r.comment ?? undefined,
        });
      }
      setRatings(map);
      setHasFetched(true);
    } catch {
      // Silently fail — ratings are non-critical
    } finally {
      setIsLoading(false);
    }
  }, [tripId, hasFetched]);

  const submitRating = useCallback(
    async (params: {
      activityId: string;
      dayId: string;
      locationId?: string;
      rating: number;
      comment?: string;
    }) => {
      if (!tripId) return;

      // Optimistic update
      setRatings((prev) => {
        const next = new Map(prev);
        next.set(params.activityId, {
          activityId: params.activityId,
          locationId: params.locationId,
          rating: params.rating,
          comment: params.comment,
        });
        return next;
      });

      try {
        const res = await fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId,
            dayId: params.dayId,
            activityId: params.activityId,
            locationId: params.locationId,
            rating: params.rating,
            comment: params.comment,
          }),
        });
        if (!res.ok) {
          throw new Error(await extractFetchErrorMessage(res));
        }
      } catch {
        // Revert optimistic update on failure
        setRatings((prev) => {
          const next = new Map(prev);
          next.delete(params.activityId);
          return next;
        });
      }
    },
    [tripId],
  );

  return useMemo(
    () => ({ ratings, isLoading, fetchRatings, submitRating }),
    [ratings, isLoading, fetchRatings, submitRating],
  );
}
