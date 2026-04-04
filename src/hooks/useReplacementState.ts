import { useCallback, useState } from "react";
import type { Itinerary, ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import {
  useReplacementCandidates,
  locationToActivity,
  type ReplacementCandidate,
} from "@/hooks/useReplacementCandidates";
import type { TripBuilderData } from "@/types/trip";
import { logger } from "@/lib/logger";

type UseReplacementStateParams = {
  tripId: string;
  isUsingMock: boolean;
  currentTrip: { builderData: TripBuilderData } | null | undefined;
  model: Itinerary;
  selectedDay: number;
  replaceActivity: (tripId: string, dayId: string, activityId: string, newActivity: ItineraryActivity) => void;
  setModelState: (next: Itinerary) => void;
  scheduleUserPlanningRef: React.RefObject<((itinerary: Itinerary) => void) | null>;
};

export function useReplacementState({
  tripId,
  isUsingMock,
  currentTrip,
  model,
  selectedDay,
  replaceActivity,
  setModelState,
  scheduleUserPlanningRef,
}: UseReplacementStateParams) {
  const [replacementActivityId, setReplacementActivityId] = useState<string | null>(null);
  const [replacementCandidates, setReplacementCandidates] = useState<ReplacementCandidate[]>([]);
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(null);

  const replacementMutation = useReplacementCandidates();
  const isLoadingReplacements = replacementMutation.isPending;

  const handleReplace = useCallback(
    (activityId: string) => {
      if (!tripId || isUsingMock || !currentTrip) return;

      const currentDay = model.days[selectedDay];
      if (!currentDay) return;

      const activity = currentDay.activities.find((a) => a.id === activityId);
      if (!activity || activity.kind !== "place") return;

      setReplacementActivityId(activityId);

      replacementMutation.mutate(
        {
          activity,
          tripData: currentTrip.builderData,
          allActivities: model.days.flatMap((d) => d.activities),
          dayActivities: currentDay.activities,
          currentDayIndex: selectedDay,
          maxCandidates: 10,
        },
        {
          onSuccess: (options) => {
            setReplacementCandidates(options.candidates);
          },
          onError: (error) => {
            logger.error("Failed to find replacement candidates", error);
            setReplacementCandidates([]);
          },
        },
      );
    },
    [tripId, isUsingMock, currentTrip, model, selectedDay, replacementMutation],
  );

  const handleReplaceSelect = useCallback(
    (candidate: ReplacementCandidate) => {
      if (!tripId || isUsingMock || !replacementActivityId) return;

      const currentDay = model.days[selectedDay];
      if (!currentDay) return;

      const activity = currentDay.activities.find((a) => a.id === replacementActivityId);
      if (!activity || activity.kind !== "place") return;

      const newActivity = locationToActivity(candidate.location, activity);

      if (tripId && !isUsingMock) {
        replaceActivity(tripId, currentDay.id, replacementActivityId, newActivity);
      }

      const nextDays = model.days.map((d) => {
        if (d.id !== currentDay.id) return d;
        return {
          ...d,
          activities: d.activities.map((a) => (a.id === replacementActivityId ? newActivity : a)),
        };
      });
      const nextItinerary = { ...model, days: nextDays };

      setModelState(nextItinerary);

      setTimeout(() => {
        scheduleUserPlanningRef.current?.(nextItinerary);
      }, 0);

      setReplacementActivityId(null);
      setReplacementCandidates([]);
    },
    [tripId, isUsingMock, replacementActivityId, model, selectedDay, replaceActivity, setModelState, scheduleUserPlanningRef],
  );

  const handleViewDetails = useCallback((location: Location) => {
    setExpandedLocation(location);
  }, []);

  const handleCloseExpanded = useCallback(() => {
    setExpandedLocation(null);
  }, []);

  return {
    replacementActivityId,
    setReplacementActivityId,
    replacementCandidates,
    setReplacementCandidates,
    expandedLocation,
    isLoadingReplacements,
    handleReplace,
    handleReplaceSelect,
    handleViewDetails,
    handleCloseExpanded,
  };
}
