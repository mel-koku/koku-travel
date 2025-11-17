import type { Trip, TripDay } from "@/types/tripDomain";
import type { Location } from "@/types/location";
import { MOCK_LOCATIONS } from "@/data/mockLocations";
import { scoreLocation, type LocationScoringCriteria } from "@/lib/scoring/locationScoring";

/**
 * Refinement types
 */
export type RefinementType =
  | "too_busy"
  | "too_light"
  | "more_food"
  | "more_culture"
  | "more_kid_friendly"
  | "more_rest";

/**
 * Refinement request
 */
export type RefinementRequest = {
  trip: Trip;
  dayIndex: number;
  type: RefinementType;
};

/**
 * Refines a specific day based on the refinement type
 */
export function refineDay(request: RefinementRequest): TripDay {
  const { trip, dayIndex, type } = request;
  const day = trip.days[dayIndex];

  if (!day) {
    throw new Error(`Day ${dayIndex} not found`);
  }

  switch (type) {
    case "too_busy":
      return refineTooBusy(day, trip);
    case "too_light":
      return refineTooLight(day, trip);
    case "more_food":
      return refineMoreFood(day, trip);
    case "more_culture":
      return refineMoreCulture(day, trip);
    case "more_kid_friendly":
      return refineMoreKidFriendly(day, trip);
    case "more_rest":
      return refineMoreRest(day, trip);
    default:
      return day;
  }
}

/**
 * Removes some activities to make the day less busy
 */
function refineTooBusy(day: TripDay, trip: Trip): TripDay {
  // Remove activities from the middle of the day, keeping first and last
  const activities = [...day.activities];
  if (activities.length <= 2) {
    return day; // Already minimal
  }

  // Remove middle activities (keep first and last)
  const toRemove = Math.floor((activities.length - 2) / 2);
  const newActivities = [
    activities[0],
    ...activities.slice(1 + toRemove, activities.length - 1),
    activities[activities.length - 1],
  ].filter((a): a is typeof activities[0] => a !== undefined);

  return {
    ...day,
    activities: newActivities,
    explanation: generateRefinementExplanation(day, "too_busy"),
  };
}

/**
 * Adds more activities to make the day less light
 */
function refineTooLight(day: TripDay, trip: Trip): TripDay {
  const activities = [...day.activities];
  const usedLocationIds = new Set(activities.map((a) => a.locationId));

  // Find available locations in the same city
  const availableLocations = MOCK_LOCATIONS.filter(
    (loc) => loc.city.toLowerCase() === day.cityId && !usedLocationIds.has(loc.id),
  );

  if (availableLocations.length === 0) {
    return day; // No more locations available
  }

  // Score and pick best locations
  const criteria: LocationScoringCriteria = {
    interests: trip.travelerProfile.interests,
    travelStyle: trip.travelerProfile.pace,
    availableMinutes: 120, // 2 hours for new activity
    recentCategories: day.activities.map((a) => a.location?.category ?? "").filter(Boolean),
  };

  const scored = availableLocations.map((loc) => scoreLocation(loc, criteria));
  scored.sort((a, b) => b.score - a.score);

  // Add 1-2 new activities
  const toAdd = Math.min(2, scored.length);
  const newActivities = activities.concat(
    scored.slice(0, toAdd).map((scoredLoc, index) => ({
      id: `${day.id}-added-${Date.now()}-${index}`,
      locationId: scoredLoc.location.id,
      location: scoredLoc.location,
      timeSlot: "afternoon" as const,
      duration: 90,
    })),
  );

  return {
    ...day,
    activities: newActivities,
    explanation: generateRefinementExplanation(day, "too_light"),
  };
}

/**
 * Adds more food-related activities
 */
function refineMoreFood(day: TripDay, trip: Trip): TripDay {
  const activities = [...day.activities];
  const usedLocationIds = new Set(activities.map((a) => a.locationId));

  // Find food locations
  const foodLocations = MOCK_LOCATIONS.filter(
    (loc) =>
      (loc.category === "restaurant" || loc.category === "market") &&
      loc.city.toLowerCase() === day.cityId &&
      !usedLocationIds.has(loc.id),
  );

  if (foodLocations.length === 0) {
    return day;
  }

  // Add a food activity
  const newFoodActivity = {
    id: `${day.id}-food-${Date.now()}`,
    locationId: foodLocations[0]!.id,
    location: foodLocations[0],
    timeSlot: "afternoon" as const,
    duration: 60,
    mealType: "lunch" as const,
  };

  // Insert before afternoon activities or at the end
  const afternoonIndex = activities.findIndex((a) => a.timeSlot === "afternoon");
  const insertIndex = afternoonIndex >= 0 ? afternoonIndex : activities.length;

  const newActivities = [
    ...activities.slice(0, insertIndex),
    newFoodActivity,
    ...activities.slice(insertIndex),
  ];

  return {
    ...day,
    activities: newActivities,
    explanation: generateRefinementExplanation(day, "more_food"),
  };
}

/**
 * Adds more culture-related activities
 */
function refineMoreCulture(day: TripDay, trip: Trip): TripDay {
  const activities = [...day.activities];
  const usedLocationIds = new Set(activities.map((a) => a.locationId));

  // Find culture locations
  const cultureLocations = MOCK_LOCATIONS.filter(
    (loc) =>
      (loc.category === "shrine" ||
        loc.category === "temple" ||
        loc.category === "museum" ||
        loc.category === "historic") &&
      loc.city.toLowerCase() === day.cityId &&
      !usedLocationIds.has(loc.id),
  );

  if (cultureLocations.length === 0) {
    return day;
  }

  // Score and pick best culture location
  const criteria: LocationScoringCriteria = {
    interests: trip.travelerProfile.interests.filter((i) => i === "culture" || i === "history"),
    travelStyle: trip.travelerProfile.pace,
    availableMinutes: 120,
    recentCategories: day.activities.map((a) => a.location?.category ?? "").filter(Boolean),
  };

  const scored = cultureLocations.map((loc) => scoreLocation(loc, criteria));
  scored.sort((a, b) => b.score - a.score);

  const newCultureActivity = {
    id: `${day.id}-culture-${Date.now()}`,
    locationId: scored[0]!.location.id,
    location: scored[0]!.location,
    timeSlot: "morning" as const,
    duration: 90,
  };

  // Insert at the beginning
  const newActivities = [newCultureActivity, ...activities];

  return {
    ...day,
    activities: newActivities,
    explanation: generateRefinementExplanation(day, "more_culture"),
  };
}

/**
 * Makes the day more kid-friendly
 */
function refineMoreKidFriendly(day: TripDay, trip: Trip): TripDay {
  // Replace activities with more kid-friendly alternatives
  // This is a simplified version - would need more sophisticated logic
  const activities = day.activities.map((activity) => {
    // If activity is not kid-friendly, try to find alternative
    // For now, just add explanation
    return activity;
  });

  return {
    ...day,
    activities,
    explanation: generateRefinementExplanation(day, "more_kid_friendly"),
  };
}

/**
 * Adds more rest time
 */
function refineMoreRest(day: TripDay, trip: Trip): TripDay {
  // Remove some activities and add rest gaps
  const activities = [...day.activities];
  if (activities.length <= 1) {
    return day; // Already minimal
  }

  // Remove middle activities
  const toRemove = Math.floor(activities.length / 3);
  const newActivities = activities.slice(0, activities.length - toRemove);

  return {
    ...day,
    activities: newActivities,
    constraints: {
      ...day.constraints,
      restGaps: 30, // 30 minutes between activities
    },
    explanation: generateRefinementExplanation(day, "more_rest"),
  };
}

/**
 * Generates explanation text for refinement
 */
function generateRefinementExplanation(day: TripDay, type: RefinementType): string {
  switch (type) {
    case "too_busy":
      return "Reduced activities to make the day more relaxed.";
    case "too_light":
      return "Added more activities to fill out the day.";
    case "more_food":
      return "Added dining options to enhance your culinary experience.";
    case "more_culture":
      return "Added cultural sites to deepen your cultural immersion.";
    case "more_kid_friendly":
      return "Adjusted activities to be more suitable for children.";
    case "more_rest":
      return "Added more rest time between activities.";
    default:
      return day.explanation ?? "";
  }
}

