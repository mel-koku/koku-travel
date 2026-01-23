import type { Trip } from "@/types/tripDomain";
import type { Itinerary, ItineraryActivity, ItineraryDay } from "@/types/itinerary";

/**
 * Converts a Trip (domain model) to Itinerary (legacy format) for compatibility
 */
export function convertTripToItinerary(trip: Trip): Itinerary {
  const days: ItineraryDay[] = trip.days.map((day) => {
    const activities: ItineraryActivity[] = day.activities.map((activity) => ({
      kind: "place",
      id: activity.id,
      title: activity.location?.name ?? `Activity ${activity.id}`,
      timeOfDay: activity.timeSlot,
      durationMin: activity.duration,
      neighborhood: activity.location?.city ?? day.cityId,
      tags: activity.location?.category ? [activity.location.category] : [],
      locationId: activity.locationId,
      coordinates: activity.location?.coordinates,
      schedule: activity.startTime && activity.endTime
        ? {
            arrivalTime: activity.startTime,
            departureTime: activity.endTime,
          }
        : undefined,
    }));

    return {
      id: day.id,
      dateLabel: `Day ${trip.days.indexOf(day) + 1} (${day.cityId})`,
      cityId: day.cityId,
      activities,
    };
  });

  return {
    days,
  };
}

