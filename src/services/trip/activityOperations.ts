/**
 * Activity operations for itinerary editing
 *
 * Pure functions for manipulating activities within itineraries.
 */

import type { Itinerary, ItineraryActivity } from "@/types/itinerary";

/**
 * Replaces an activity in an itinerary
 */
export function replaceActivity(
  itinerary: Itinerary,
  dayId: string,
  activityId: string,
  newActivity: ItineraryActivity,
): Itinerary {
  return {
    ...itinerary,
    days: itinerary.days.map((day) => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        activities: day.activities.map((activity) =>
          activity.id === activityId ? newActivity : activity,
        ),
      };
    }),
  };
}

/**
 * Deletes an activity from an itinerary
 */
export function deleteActivity(
  itinerary: Itinerary,
  dayId: string,
  activityId: string,
): Itinerary {
  return {
    ...itinerary,
    days: itinerary.days.map((day) => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        activities: day.activities.filter((activity) => activity.id !== activityId),
      };
    }),
  };
}

/**
 * Reorders activities in a day
 */
export function reorderActivities(
  itinerary: Itinerary,
  dayId: string,
  activityIds: string[],
): Itinerary {
  return {
    ...itinerary,
    days: itinerary.days.map((day) => {
      if (day.id !== dayId) return day;
      // Create a map for quick lookup
      const activityMap = new Map(day.activities.map((a) => [a.id, a]));
      // Reorder activities based on the provided order
      const reorderedActivities = activityIds
        .map((id) => activityMap.get(id))
        .filter((a): a is ItineraryActivity => a !== undefined);
      return {
        ...day,
        activities: reorderedActivities,
      };
    }),
  };
}

/**
 * Adds an activity to a day
 */
export function addActivity(
  itinerary: Itinerary,
  dayId: string,
  activity: ItineraryActivity,
  position?: number,
): Itinerary {
  return {
    ...itinerary,
    days: itinerary.days.map((day) => {
      if (day.id !== dayId) return day;
      const activities = [...day.activities];
      if (position !== undefined && position >= 0 && position <= activities.length) {
        activities.splice(position, 0, activity);
      } else {
        activities.push(activity);
      }
      return {
        ...day,
        activities,
      };
    }),
  };
}
