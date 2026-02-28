"use client";

import { createContext, useContext } from "react";
import type { ActivityRatingData } from "@/hooks/useActivityRatings";

type ActivityRatingsContextValue = {
  ratings: Map<string, ActivityRatingData>;
  submitRating: (params: {
    activityId: string;
    dayId: string;
    locationId?: string;
    rating: number;
    comment?: string;
  }) => Promise<void>;
};

const ActivityRatingsContext = createContext<ActivityRatingsContextValue | null>(null);

export const ActivityRatingsProvider = ActivityRatingsContext.Provider;

export function useActivityRatingsContext() {
  return useContext(ActivityRatingsContext);
}
