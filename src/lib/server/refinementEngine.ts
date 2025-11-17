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
 * Considers TravelerProfile pace preference when determining how many to remove
 */
function refineTooBusy(day: TripDay, trip: Trip): TripDay {
  // Remove activities from the middle of the day, keeping first and last
  const activities = [...day.activities];
  if (activities.length <= 2) {
    return day; // Already minimal
  }

  // Adjust removal based on pace preference
  // Relaxed pace: remove more activities, Fast pace: remove fewer
  const paceMultiplier = {
    relaxed: 0.7, // Remove 70% of removable activities
    balanced: 0.5, // Remove 50% of removable activities
    fast: 0.3, // Remove 30% of removable activities
  }[trip.travelerProfile.pace] ?? 0.5;

  // Remove middle activities (keep first and last)
  const removableCount = activities.length - 2;
  const toRemove = Math.max(1, Math.floor(removableCount * paceMultiplier));
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

  // Score and pick best locations using comprehensive TravelerProfile
  const criteria: LocationScoringCriteria = {
    interests: trip.travelerProfile.interests,
    travelStyle: trip.travelerProfile.pace,
    budgetLevel: trip.travelerProfile.budget.level,
    budgetTotal: trip.travelerProfile.budget.total,
    budgetPerDay: trip.travelerProfile.budget.perDay,
    accessibility: trip.travelerProfile.mobility.required
      ? {
          wheelchairAccessible: trip.travelerProfile.mobility.required,
          elevatorRequired: trip.travelerProfile.mobility.needs?.includes("elevator") ?? false,
        }
      : undefined,
    group: trip.travelerProfile.group,
    availableMinutes: 120, // 2 hours for new activity
    recentCategories: day.activities.map((a) => a.location?.category ?? "").filter(Boolean),
    travelerProfile: trip.travelerProfile, // Pass full TravelerProfile for comprehensive scoring
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

  // Score food locations using TravelerProfile for better selection
  const criteria: LocationScoringCriteria = {
    interests: trip.travelerProfile.interests,
    travelStyle: trip.travelerProfile.pace,
    budgetLevel: trip.travelerProfile.budget.level,
    budgetTotal: trip.travelerProfile.budget.total,
    budgetPerDay: trip.travelerProfile.budget.perDay,
    accessibility: trip.travelerProfile.mobility.required
      ? {
          wheelchairAccessible: trip.travelerProfile.mobility.required,
          elevatorRequired: trip.travelerProfile.mobility.needs?.includes("elevator") ?? false,
        }
      : undefined,
    group: trip.travelerProfile.group,
    availableMinutes: 90, // 1.5 hours for meal
    recentCategories: day.activities.map((a) => a.location?.category ?? "").filter(Boolean),
    timeSlot: "afternoon",
    travelerProfile: trip.travelerProfile,
  };

  const scored = foodLocations.map((loc) => scoreLocation(loc, criteria));
  scored.sort((a, b) => b.score - a.score);

  // Add best-scoring food activity
  const bestFoodLocation = scored[0];
  if (!bestFoodLocation) {
    return day;
  }

  const newFoodActivity = {
    id: `${day.id}-food-${Date.now()}`,
    locationId: bestFoodLocation.location.id,
    location: bestFoodLocation.location,
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

  // Score and pick best culture location using comprehensive TravelerProfile
  const criteria: LocationScoringCriteria = {
    interests: trip.travelerProfile.interests.filter((i) => i === "culture" || i === "history"),
    travelStyle: trip.travelerProfile.pace,
    budgetLevel: trip.travelerProfile.budget.level,
    budgetTotal: trip.travelerProfile.budget.total,
    budgetPerDay: trip.travelerProfile.budget.perDay,
    accessibility: trip.travelerProfile.mobility.required
      ? {
          wheelchairAccessible: trip.travelerProfile.mobility.required,
          elevatorRequired: trip.travelerProfile.mobility.needs?.includes("elevator") ?? false,
        }
      : undefined,
    group: trip.travelerProfile.group,
    availableMinutes: 120,
    recentCategories: day.activities.map((a) => a.location?.category ?? "").filter(Boolean),
    timeSlot: "morning",
    travelerProfile: trip.travelerProfile, // Pass full TravelerProfile for comprehensive scoring
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
  const activities = [...day.activities];
  const usedLocationIds = new Set(activities.map((a) => a.locationId));

  // Find kid-friendly locations (parks, gardens, family-friendly attractions)
  const kidFriendlyLocations = MOCK_LOCATIONS.filter(
    (loc) =>
      (loc.category === "park" ||
        loc.category === "garden" ||
        loc.category === "museum" ||
        loc.category === "entertainment") &&
      loc.city.toLowerCase() === day.cityId &&
      !usedLocationIds.has(loc.id),
  );

  if (kidFriendlyLocations.length === 0) {
    // If no kid-friendly alternatives, just return day with explanation
    return {
      ...day,
      explanation: generateRefinementExplanation(day, "more_kid_friendly"),
    };
  }

  // Score kid-friendly locations using TravelerProfile, prioritizing group fit
  const criteria: LocationScoringCriteria = {
    interests: trip.travelerProfile.interests,
    travelStyle: trip.travelerProfile.pace,
    budgetLevel: trip.travelerProfile.budget.level,
    budgetTotal: trip.travelerProfile.budget.total,
    budgetPerDay: trip.travelerProfile.budget.perDay,
    accessibility: trip.travelerProfile.mobility.required
      ? {
          wheelchairAccessible: trip.travelerProfile.mobility.required,
          elevatorRequired: trip.travelerProfile.mobility.needs?.includes("elevator") ?? false,
        }
      : undefined,
    group: trip.travelerProfile.group, // Group info important for kid-friendly scoring
    availableMinutes: 120,
    recentCategories: day.activities.map((a) => a.location?.category ?? "").filter(Boolean),
    travelerProfile: trip.travelerProfile,
  };

  const scored = kidFriendlyLocations.map((loc) => scoreLocation(loc, criteria));
  scored.sort((a, b) => b.score - a.score);

  // Replace one non-kid-friendly activity with a kid-friendly one, or add if day is light
  const bestKidFriendly = scored[0];
  if (!bestKidFriendly) {
    return {
      ...day,
      explanation: generateRefinementExplanation(day, "more_kid_friendly"),
    };
  }

  // If day has few activities, add the kid-friendly one
  // Otherwise, replace a less kid-friendly activity
  if (activities.length <= 2) {
    const newKidActivity = {
      id: `${day.id}-kid-friendly-${Date.now()}`,
      locationId: bestKidFriendly.location.id,
      location: bestKidFriendly.location,
      timeSlot: "afternoon" as const,
      duration: 90,
    };
    return {
      ...day,
      activities: [...activities, newKidActivity],
      explanation: generateRefinementExplanation(day, "more_kid_friendly"),
    };
  }

  // Replace middle activity with kid-friendly one
  const replaceIndex = Math.floor(activities.length / 2);
  const newActivities = [...activities];
  newActivities[replaceIndex] = {
    id: `${day.id}-kid-friendly-${Date.now()}`,
    locationId: bestKidFriendly.location.id,
    location: bestKidFriendly.location,
    timeSlot: activities[replaceIndex]?.timeSlot ?? "afternoon",
    duration: 90,
  };

  return {
    ...day,
    activities: newActivities,
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

