"use client";

import { useCallback, useState } from "react";
import { useAppState } from "@/state/AppState";
import { useToast } from "@/context/ToastContext";
import { logger } from "@/lib/logger";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";
import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";

type SmartPromptActionsResult = {
  acceptGap: (gap: DetectedGap) => Promise<boolean>;
  isLoading: boolean;
  loadingGapId: string | null;
};

type RecommendResponse = {
  recommendation: {
    id: string;
    name: string;
  };
  activity: ItineraryActivity;
  position: number;
};

/**
 * Hook to handle smart prompt accept actions.
 *
 * When a user clicks "Add" on a smart prompt suggestion, this hook:
 * 1. Calls the API to get the top recommendation
 * 2. Adds the activity to the itinerary at the correct position
 * 3. Shows a toast notification
 */
export function useSmartPromptActions(
  tripId: string | null,
  tripBuilderData: TripBuilderData | undefined,
  getDay: (dayId: string) => ItineraryDay | undefined,
  getUsedLocationIds: () => string[]
): SmartPromptActionsResult {
  const { addActivity } = useAppState();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingGapId, setLoadingGapId] = useState<string | null>(null);

  const acceptGap = useCallback(
    async (gap: DetectedGap): Promise<boolean> => {
      if (!tripId) {
        showToast("No trip selected", { variant: "error" });
        return false;
      }

      const day = getDay(gap.dayId);
      if (!day) {
        showToast("Could not find day in itinerary", { variant: "error" });
        return false;
      }

      const cityId = day.cityId;
      if (!cityId) {
        showToast("No city assigned to this day", { variant: "error" });
        return false;
      }

      setIsLoading(true);
      setLoadingGapId(gap.id);

      try {
        const response = await fetch("/api/smart-prompts/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gap: {
              id: gap.id,
              type: gap.type,
              dayId: gap.dayId,
              dayIndex: gap.dayIndex,
              action: gap.action,
            },
            dayActivities: day.activities,
            cityId,
            tripBuilderData: tripBuilderData ?? { dates: {} },
            usedLocationIds: getUsedLocationIds(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || "Failed to get recommendation";
          showToast(errorMessage, { variant: "error" });
          return false;
        }

        const data = (await response.json()) as RecommendResponse;

        // Add the activity to the itinerary
        addActivity(tripId, gap.dayId, data.activity, data.position);

        // Show success toast
        const actionType = gap.action.type === "add_meal" ? "meal" : "experience";
        showToast(`Added ${data.recommendation.name} as ${actionType}`, {
          variant: "success",
        });

        return true;
      } catch (error) {
        logger.error("Smart prompt accept error", error instanceof Error ? error : new Error(String(error)));
        showToast("Failed to add recommendation", { variant: "error" });
        return false;
      } finally {
        setIsLoading(false);
        setLoadingGapId(null);
      }
    },
    [tripId, tripBuilderData, getDay, getUsedLocationIds, addActivity, showToast]
  );

  return {
    acceptGap,
    isLoading,
    loadingGapId,
  };
}
