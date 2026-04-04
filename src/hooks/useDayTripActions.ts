import { useCallback, useState } from "react";
import type { Itinerary } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { DayTripSuggestion } from "@/types/dayTrips";

type UseDayTripActionsParams = {
  model: Itinerary;
  tripId: string;
  isUsingMock: boolean;
  onItineraryChange?: (next: Itinerary) => void;
  tripBuilderData?: TripBuilderData;
  tripStartDate?: string;
  updateDayActivities: (
    tripId: string,
    dayId: string,
    updater: (itinerary: Itinerary) => Itinerary,
    meta: { dayIndex: number; targetLocationId: string },
  ) => void;
  setModelState: (next: Itinerary) => void;
  scheduleUserPlanningRef: React.RefObject<((itinerary: Itinerary) => void) | null>;
};

export function useDayTripActions({
  model,
  tripId,
  isUsingMock,
  onItineraryChange,
  tripBuilderData,
  tripStartDate,
  updateDayActivities,
  setModelState,
  scheduleUserPlanningRef,
}: UseDayTripActionsParams) {
  const [isAcceptingDayTrip, setIsAcceptingDayTrip] = useState(false);

  const handleAcceptDayTrip = useCallback(
    async (suggestion: DayTripSuggestion, dayIndex: number) => {
      if (!onItineraryChange || isUsingMock) return;
      const target = model.days[dayIndex];
      if (!target) return;

      setIsAcceptingDayTrip(true);
      try {
        const res = await fetch("/api/day-trips/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseCityId: suggestion.baseCityId,
            targetLocationId: suggestion.targetLocationId,
            dayIndex,
            dayId: target.id,
            vibes: tripBuilderData?.vibes || [],
            usedLocationIds: model.days.flatMap((d) =>
              d.activities
                .filter((a): a is Extract<typeof a, { kind: "place" }> => a.kind === "place")
                .map((a) => a.locationId)
                .filter(Boolean),
            ),
            tripDate: tripStartDate,
          }),
        });

        if (!res.ok) return;
        const plan = await res.json();

        updateDayActivities(
          tripId,
          target.id,
          (itinerary) => ({
            ...itinerary,
            days: itinerary.days.map((d, i) =>
              i === dayIndex
                ? {
                    ...d,
                    activities: plan.activities,
                    isDayTrip: true,
                    baseCityId: suggestion.baseCityId,
                    cityId: plan.targetCityId || suggestion.targetCity.toLowerCase(),
                    dayTripTravelMinutes: plan.totalTravelMinutes,
                    dateLabel: plan.dayLabel || `Day ${dayIndex + 1} (Day Trip: ${suggestion.baseCityName} \u2192 ${suggestion.targetLocationName})`,
                  }
                : d,
            ),
          }),
          { dayIndex, targetLocationId: suggestion.targetLocationId },
        );

        const nextDays = [...model.days];
        nextDays[dayIndex] = {
          ...target,
          activities: plan.activities,
          isDayTrip: true,
          baseCityId: suggestion.baseCityId,
          cityId: plan.targetCityId || suggestion.targetCity.toLowerCase(),
          dayTripTravelMinutes: plan.totalTravelMinutes,
          dateLabel: plan.dayLabel || `Day ${dayIndex + 1} (Day Trip: ${suggestion.baseCityName} \u2192 ${suggestion.targetLocationName})`,
        };
        const nextItinerary = { ...model, days: nextDays };
        setModelState(nextItinerary);
        setTimeout(() => {
          scheduleUserPlanningRef.current?.(nextItinerary);
        }, 0);
      } finally {
        setIsAcceptingDayTrip(false);
      }
    },
    [model, tripId, isUsingMock, onItineraryChange, tripBuilderData, tripStartDate, updateDayActivities, setModelState, scheduleUserPlanningRef],
  );

  return { isAcceptingDayTrip, handleAcceptDayTrip };
}
