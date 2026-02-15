"use client";

import { useCallback, useState } from "react";
import { useAppState } from "@/state/AppState";
import { useToast } from "@/context/ToastContext";
import { logger } from "@/lib/logger";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";
import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";

export type RefinementFilters = {
  budget?: "cheaper";
  indoor?: boolean;
  cuisineExclude?: string[];
  proximity?: "closer";
};

export type PreviewRecommendation = {
  id: string;
  name: string;
  category?: string;
  shortDescription?: string;
  neighborhood?: string;
  rating?: number;
  googlePrimaryType?: string;
};

export type PreviewState = {
  gap: DetectedGap;
  recommendation: PreviewRecommendation;
  activity: ItineraryActivity;
  position: number;
  shownLocationIds: string[];
  showCount: number;
  activeFilters: RefinementFilters;
};

type RecommendResponse = {
  recommendation: {
    id: string;
    name: string;
    category?: string;
    shortDescription?: string;
    neighborhood?: string;
    rating?: number;
    googlePrimaryType?: string;
  } | null;
  activity: ItineraryActivity;
  position: number;
};

export type AcceptGapResult = {
  success: boolean;
  activity?: ItineraryActivity;
  position?: number;
  dayId?: string;
};

const MAX_PREVIEW_ATTEMPTS = 3;

type SmartPromptActionsResult = {
  acceptGap: (gap: DetectedGap) => Promise<AcceptGapResult>;
  isLoading: boolean;
  loadingGapId: string | null;
  previewState: PreviewState | null;
  confirmPreview: () => void;
  showAnother: () => Promise<void>;
  cancelPreview: () => void;
  setRefinementFilter: (filter: Partial<RefinementFilters>) => void;
};

/**
 * Hook to handle smart prompt accept actions with preview-first flow.
 *
 * For add_meal and add_experience actions:
 *   Click "Add" → API returns recommendation → preview card shown →
 *   user can "Add this", "Show another" (up to 3), or apply filter chips → confirm inserts activity.
 *
 * For quick_meal: inserts immediately (no preview).
 * For acknowledge_guidance: no-op (just dismiss the card).
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
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);

  /** Call the recommend API with optional exclusions and filters */
  const fetchRecommendation = useCallback(
    async (
      gap: DetectedGap,
      day: ItineraryDay,
      cityId: string,
      excludeLocationIds?: string[],
      filters?: RefinementFilters
    ): Promise<RecommendResponse | null> => {
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
          excludeLocationIds,
          refinementFilters: filters,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to get recommendation";
        showToast(errorMessage, { variant: "error" });
        return null;
      }

      return (await response.json()) as RecommendResponse;
    },
    [tripBuilderData, getUsedLocationIds, showToast]
  );

  const acceptGap = useCallback(
    async (gap: DetectedGap): Promise<AcceptGapResult> => {
      // Guidance gaps: just acknowledge, no API call
      if (gap.action.type === "acknowledge_guidance") {
        return { success: true };
      }

      if (!tripId) {
        showToast("No trip selected", { variant: "error" });
        return { success: false };
      }

      const day = getDay(gap.dayId);
      if (!day) {
        showToast("Could not find day in itinerary", { variant: "error" });
        return { success: false };
      }

      const cityId = day.cityId;
      if (!cityId) {
        showToast("No city assigned to this day", { variant: "error" });
        return { success: false };
      }

      setIsLoading(true);
      setLoadingGapId(gap.id);

      try {
        const data = await fetchRecommendation(gap, day, cityId);
        if (!data) {
          return { success: false };
        }

        // Quick meal: insert immediately, no preview
        if (gap.action.type === "quick_meal") {
          addActivity(tripId, gap.dayId, data.activity, data.position);
          showToast("Added konbini meal tip", { variant: "success" });
          return {
            success: true,
            activity: data.activity,
            position: data.position,
            dayId: gap.dayId,
          };
        }

        // add_meal / add_experience: enter preview mode
        if (data.recommendation) {
          setPreviewState({
            gap,
            recommendation: {
              id: data.recommendation.id,
              name: data.recommendation.name,
              category: data.recommendation.category,
              shortDescription: data.recommendation.shortDescription,
              neighborhood: data.recommendation.neighborhood,
              rating: data.recommendation.rating,
              googlePrimaryType: data.recommendation.googlePrimaryType,
            },
            activity: data.activity,
            position: data.position,
            shownLocationIds: [data.recommendation.id],
            showCount: 1,
            activeFilters: {},
          });
          return { success: true };
        }

        // Fallback: insert directly if no recommendation object
        addActivity(tripId, gap.dayId, data.activity, data.position);
        showToast("Added to itinerary", { variant: "success" });
        return {
          success: true,
          activity: data.activity,
          position: data.position,
          dayId: gap.dayId,
        };
      } catch (error) {
        logger.error("Smart prompt accept error", error instanceof Error ? error : new Error(String(error)));
        showToast("Failed to add recommendation", { variant: "error" });
        return { success: false };
      } finally {
        setIsLoading(false);
        setLoadingGapId(null);
      }
    },
    [tripId, tripBuilderData, getDay, getUsedLocationIds, addActivity, showToast, fetchRecommendation]
  );

  /** Confirm the previewed recommendation — insert into itinerary */
  const confirmPreview = useCallback(() => {
    if (!previewState || !tripId) return;
    addActivity(tripId, previewState.gap.dayId, previewState.activity, previewState.position);
    showToast(`Added ${previewState.recommendation.name}`, { variant: "success" });
    setPreviewState(null);
  }, [previewState, tripId, addActivity, showToast]);

  /** Show another recommendation (up to MAX_PREVIEW_ATTEMPTS) */
  const showAnother = useCallback(async () => {
    if (!previewState || !tripId) return;
    if (previewState.showCount >= MAX_PREVIEW_ATTEMPTS) return;

    const day = getDay(previewState.gap.dayId);
    if (!day) return;

    const cityId = day.cityId;
    if (!cityId) return;

    setIsLoading(true);
    setLoadingGapId(previewState.gap.id);

    try {
      const data = await fetchRecommendation(
        previewState.gap,
        day,
        cityId,
        previewState.shownLocationIds,
        previewState.activeFilters
      );

      if (!data || !data.recommendation) {
        showToast("No more options. Try different filters or skip.", { variant: "error" });
        return;
      }

      setPreviewState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          recommendation: {
            id: data.recommendation!.id,
            name: data.recommendation!.name,
            category: data.recommendation!.category,
            shortDescription: data.recommendation!.shortDescription,
            neighborhood: data.recommendation!.neighborhood,
            rating: data.recommendation!.rating,
            googlePrimaryType: data.recommendation!.googlePrimaryType,
          },
          activity: data.activity,
          position: data.position,
          shownLocationIds: [...prev.shownLocationIds, data.recommendation!.id],
          showCount: prev.showCount + 1,
        };
      });
    } catch (error) {
      logger.error("Show another error", error instanceof Error ? error : new Error(String(error)));
      showToast("Failed to get another recommendation", { variant: "error" });
    } finally {
      setIsLoading(false);
      setLoadingGapId(null);
    }
  }, [previewState, tripId, getDay, fetchRecommendation, showToast]);

  /** Cancel the preview without inserting anything */
  const cancelPreview = useCallback(() => {
    setPreviewState(null);
  }, []);

  /** Update refinement filters on the current preview */
  const setRefinementFilter = useCallback((filter: Partial<RefinementFilters>) => {
    setPreviewState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        activeFilters: { ...prev.activeFilters, ...filter },
      };
    });
  }, []);

  return {
    acceptGap,
    isLoading,
    loadingGapId,
    previewState,
    confirmPreview,
    showAnother,
    cancelPreview,
    setRefinementFilter,
  };
}
