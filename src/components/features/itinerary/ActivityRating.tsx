"use client";

import { useState, useCallback } from "react";

type ActivityRatingProps = {
  activityId: string;
  dayId: string;
  locationId?: string;
  currentRating?: number;
  isReadOnly?: boolean;
  onRate: (params: {
    activityId: string;
    dayId: string;
    locationId?: string;
    rating: number;
  }) => void;
};

export function ActivityRating({
  activityId,
  dayId,
  locationId,
  currentRating,
  isReadOnly,
  onRate,
}: ActivityRatingProps) {
  const [hoveredStar, setHoveredStar] = useState(0);

  const handleRate = useCallback(
    (star: number) => {
      if (isReadOnly) return;
      onRate({ activityId, dayId, locationId, rating: star });
    },
    [activityId, dayId, locationId, isReadOnly, onRate],
  );

  const displayRating = hoveredStar || currentRating || 0;

  return (
    <div className="mt-2 flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone">
        Your Rating
      </span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={isReadOnly}
            onClick={() => handleRate(star)}
            onMouseEnter={() => !isReadOnly && setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            className={`h-5 w-5 transition-colors ${
              isReadOnly ? "cursor-default" : "cursor-pointer"
            }`}
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
          >
            <svg
              viewBox="0 0 20 20"
              fill={star <= displayRating ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={1.5}
              className={
                star <= displayRating
                  ? "text-brand-secondary"
                  : "text-stone/30"
              }
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
