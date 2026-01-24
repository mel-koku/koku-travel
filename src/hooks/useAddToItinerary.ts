"use client";

import { useCallback, useMemo } from "react";
import { useAppState, type StoredTrip } from "@/state/AppState";
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
    neighborhood: location.city,
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

function addLocationToItinerary(itinerary: Itinerary, location: Location): Itinerary {
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

  const activity = createActivityFromLocation(location);
  const targetDay = days[0]!;
  const existingActivities = Array.isArray(targetDay.activities)
    ? [...targetDay.activities]
    : [];

  existingActivities.push(activity);

  days[0] = {
    ...targetDay,
    activities: existingActivities,
  };

  return {
    ...baseItinerary,
    days,
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

export function useAddToItinerary(): AddToItineraryResult {
  const { trips, createTrip, updateTripItinerary, isFavorite, toggleFavorite } = useAppState();
  const { showToast } = useToast();

  const needsTripPicker = trips.length > 1;

  const isInItinerary = useCallback(
    (locationId: string): boolean => {
      return trips.some((trip) => isLocationInItinerary(trip.itinerary, locationId));
    },
    [trips]
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
      let targetTrip: StoredTrip | undefined;

      // Determine which trip to use
      if (trips.length === 0) {
        // Auto-create a new trip
        const tripName = getNextTripName(trips);
        const newTripId = createTrip({
          name: tripName,
          itinerary: { days: [] },
          builderData: {
            dates: {},
          },
        });
        // Get the newly created trip (it's added to state)
        targetTrip = {
          id: newTripId,
          name: tripName,
          itinerary: { days: [] },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          builderData: { dates: {} },
        };
      } else if (trips.length === 1) {
        targetTrip = trips[0];
      } else if (tripId) {
        targetTrip = trips.find((t) => t.id === tripId);
      }

      if (!targetTrip) {
        // Need trip picker but no tripId provided - caller should handle this
        return;
      }

      // Add location to itinerary
      const newItinerary = addLocationToItinerary(targetTrip.itinerary, location);
      updateTripItinerary(targetTrip.id, newItinerary);

      // Auto-favorite if not already favorited
      if (!isFavorite(locationId)) {
        toggleFavorite(locationId);
      }

      // Show toast notification
      showToast(`Added to ${targetTrip.name}`, {
        variant: "success",
        actionLabel: "View",
        actionHref: `/trip-builder/${targetTrip.id}`,
      });
    },
    [trips, createTrip, updateTripItinerary, isFavorite, toggleFavorite, showToast]
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
