"use client";

import { useCallback, useMemo } from "react";
import { useAppState, type StoredTrip } from "@/state/AppState";
import { useTripBuilderOptional } from "@/context/TripBuilderContext";
import { useToast } from "@/context/ToastContext";
import type { Location } from "@/types/location";
import type { Itinerary, ItineraryActivity } from "@/types/itinerary";

type AddToItineraryResult = {
  trips: StoredTrip[];
  needsTripPicker: boolean;
  isInItinerary: (locationId: string) => boolean;
  addToItinerary: (locationId: string, location: Location, tripId?: string) => void;
  removeFromItinerary: (locationId: string) => void;
};

function generateActivityId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `activity_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createActivityFromLocation(location: Location): ItineraryActivity {
  const durationMinutes =
    location.recommendedVisit?.typicalMinutes ??
    parseDurationLabelToMinutes(location.estimatedDuration) ??
    undefined;
  const tags = location.category ? [location.category] : undefined;

  return {
    kind: "place",
    id: generateActivityId(),
    title: location.name,
    timeOfDay: "morning",
    durationMin: durationMinutes,
    neighborhood: location.neighborhood ?? location.city,
    tags,
    notes: location.shortDescription?.trim() || undefined,
    locationId: location.id,
  };
}

function parseDurationLabelToMinutes(label?: string): number | null {
  if (!label) return null;
  const trimmed = label.trim().toLowerCase();
  if (!trimmed) return null;

  const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/);
  const minuteMatch = trimmed.match(/(\d+)\s*m/);

  let minutes = 0;
  if (hourMatch?.[1]) {
    minutes += Number.parseFloat(hourMatch[1]) * 60;
  }
  if (minuteMatch?.[1]) {
    minutes += Number.parseInt(minuteMatch[1], 10);
  }

  if (minutes === 0 && /^\d+$/.test(trimmed)) {
    minutes = Number.parseInt(trimmed, 10);
  }

  return minutes > 0 ? Math.round(minutes) : null;
}

function isLocationInItinerary(itinerary: Itinerary, locationId: string): boolean {
  if (!itinerary?.days) return false;
  return itinerary.days.some((day) =>
    day.activities?.some(
      (activity) => activity.kind === "place" && activity.locationId === locationId
    )
  );
}

/**
 * Finds the best day to place a location based on city matching.
 * Prioritizes days that already have activities in the same city.
 */
function findBestDayForLocation(
  itinerary: Itinerary,
  location: Location
): { dayIndex: number; day: Itinerary["days"][number] } {
  const locationCity = location.city?.toLowerCase().trim();
  const days = itinerary.days;

  if (!days || days.length === 0) {
    throw new Error("Itinerary has no days");
  }

  // First pass: find a day in the same city
  if (locationCity) {
    for (let i = 0; i < days.length; i++) {
      const day = days[i]!;

      // Check if any activity in this day is in the same city
      const hasSameCity = day.activities?.some(
        (a) =>
          a.kind === "place" &&
          a.neighborhood?.toLowerCase().trim() === locationCity
      );
      if (hasSameCity) {
        return { dayIndex: i, day };
      }

      // Also check dateLabel which often contains city (e.g., "Day 1 (Kyoto)")
      if (day.dateLabel?.toLowerCase().includes(locationCity)) {
        return { dayIndex: i, day };
      }

      // Check cityId directly
      if (day.cityId?.toLowerCase() === locationCity) {
        return { dayIndex: i, day };
      }
    }
  }

  // Fallback: return last day
  const lastIndex = days.length - 1;
  return { dayIndex: lastIndex, day: days[lastIndex]! };
}

function removeLocationFromItinerary(itinerary: Itinerary, locationId: string): Itinerary {
  if (!itinerary?.days) return itinerary;

  return {
    ...itinerary,
    days: itinerary.days.map((day) => ({
      ...day,
      activities:
        day.activities?.filter(
          (activity) => !(activity.kind === "place" && activity.locationId === locationId)
        ) ?? [],
    })),
  };
}

function getNextTripName(trips: StoredTrip[]): string {
  const japanTripPattern = /^Japan Trip (\d+)$/;
  let maxNumber = 0;

  for (const trip of trips) {
    const match = trip.name.match(japanTripPattern);
    if (match?.[1]) {
      const num = Number.parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  return `Japan Trip ${maxNumber + 1}`;
}

function addLocationToItinerary(itinerary: Itinerary, location: Location): { itinerary: Itinerary; dayIndex: number } {
  const baseItinerary: Itinerary = {
    timezone: itinerary?.timezone,
    days: Array.isArray(itinerary?.days) ? [...itinerary.days] : [],
  };

  const days = baseItinerary.days;

  // Ensure at least one day exists
  if (days.length === 0) {
    days.push({
      id: `day-${Date.now().toString(36)}`,
      dateLabel: "Day 1",
      activities: [],
    });
  }

  // Find best day for this location using smart city matching
  const { dayIndex, day } = findBestDayForLocation(baseItinerary, location);

  const activity = createActivityFromLocation(location);
  const existingActivities = Array.isArray(day.activities)
    ? [...day.activities]
    : [];

  existingActivities.push(activity);

  days[dayIndex] = {
    ...day,
    activities: existingActivities,
  };

  return {
    itinerary: {
      ...baseItinerary,
      days,
    },
    dayIndex,
  };
}


export function useAddToItinerary(): AddToItineraryResult {
  const { trips, createTrip, updateTripItinerary, isFavorite, toggleFavorite } = useAppState();
  const tripBuilderContext = useTripBuilderOptional();
  const { showToast } = useToast();

  const needsTripPicker = trips.length > 1;

  const isInItinerary = useCallback(
    (locationId: string): boolean => {
      return trips.some((trip) => isLocationInItinerary(trip.itinerary, locationId));
    },
    [trips]
  );

  /**
   * Check if a location is already queued for the trip builder
   */
  const isQueued = useCallback(
    (locationId: string): boolean => {
      if (!tripBuilderContext) return false;
      return tripBuilderContext.data.savedLocationIds?.includes(locationId) ?? false;
    },
    [tripBuilderContext]
  );

  const removeFromItinerary = useCallback(
    (locationId: string) => {
      // Find trips containing this location, sorted by most recently updated
      const tripsWithLocation = trips
        .filter((trip) => isLocationInItinerary(trip.itinerary, locationId))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      if (tripsWithLocation.length === 0) return;

      // Remove from the most recently modified trip
      const targetTrip = tripsWithLocation[0]!;
      const newItinerary = removeLocationFromItinerary(targetTrip.itinerary, locationId);
      updateTripItinerary(targetTrip.id, newItinerary);

      showToast(`Removed from ${targetTrip.name}`, {
        variant: "success",
      });
    },
    [trips, updateTripItinerary, showToast]
  );

  const addToItinerary = useCallback(
    (locationId: string, location: Location, tripId?: string) => {
      // Always add to favorites first
      if (!isFavorite(locationId)) {
        toggleFavorite(locationId);
      }

      // If no trips exist
      if (trips.length === 0) {
        // If we have TripBuilder context, queue for trip builder
        if (tripBuilderContext) {
          // Check if already queued
          if (isQueued(locationId)) {
            showToast(`"${location.name}" is already saved for your trip`, {
              variant: "info",
            });
            return;
          }

          // Queue in TripBuilderContext
          tripBuilderContext.setData((prev) => ({
            ...prev,
            savedLocationIds: [...(prev.savedLocationIds ?? []), locationId],
          }));

          showToast(`Saved "${location.name}" - will be included when you create a trip`, {
            variant: "success",
            actionLabel: "Plan Trip",
            actionHref: "/trip-builder",
          });
          return;
        }

        // No TripBuilder context - fall back to auto-creating a trip
        const tripName = getNextTripName(trips);
        const newTripId = createTrip({
          name: tripName,
          itinerary: { days: [] },
          builderData: { dates: {} },
        });

        // Create activity and add to new trip
        const activity = createActivityFromLocation(location);
        const newItinerary: Itinerary = {
          days: [
            {
              id: `day-${Date.now().toString(36)}`,
              dateLabel: "Day 1",
              activities: [activity],
            },
          ],
        };
        updateTripItinerary(newTripId, newItinerary);

        showToast(`Added to ${tripName}`, {
          variant: "success",
          actionLabel: "View",
          actionHref: `/itinerary?trip=${newTripId}`,
        });
        return;
      }

      // Determine which trip to use
      let targetTrip: StoredTrip | undefined;

      if (trips.length === 1) {
        targetTrip = trips[0];
      } else if (tripId) {
        targetTrip = trips.find((t) => t.id === tripId);
      }

      if (!targetTrip) {
        // Need trip picker but no tripId provided - caller should handle this
        return;
      }

      // Check if location is already in the itinerary
      if (isLocationInItinerary(targetTrip.itinerary, locationId)) {
        showToast(`"${location.name}" is already in ${targetTrip.name}`, {
          variant: "info",
        });
        return;
      }

      // Add location to itinerary with smart city matching
      const { itinerary: newItinerary, dayIndex } = addLocationToItinerary(
        targetTrip.itinerary,
        location
      );
      updateTripItinerary(targetTrip.id, newItinerary);

      // Show toast notification with day info
      showToast(`Added to Day ${dayIndex + 1} of ${targetTrip.name}`, {
        variant: "success",
        actionLabel: "View",
        actionHref: `/itinerary?trip=${targetTrip.id}`,
      });
    },
    [
      trips,
      createTrip,
      updateTripItinerary,
      isFavorite,
      toggleFavorite,
      isQueued,
      tripBuilderContext,
      showToast,
    ]
  );

  return useMemo(
    () => ({
      trips,
      needsTripPicker,
      isInItinerary,
      addToItinerary,
      removeFromItinerary,
    }),
    [trips, needsTripPicker, isInItinerary, addToItinerary, removeFromItinerary]
  );
}
