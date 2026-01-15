import type { Location } from "@/types/location";
import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import { MOCK_LOCATIONS } from "@/data/mocks/mockLocations";
import { scoreLocation, type LocationScoringCriteria } from "@/lib/scoring/locationScoring";
import { detectMealGap, getMealTypeForTime, type MealType } from "@/data/mealCategories";
import type { InterestId, TripBuilderData } from "@/types/trip";

/**
 * Find restaurants that match dietary restrictions
 */
function filterRestaurantsByDietary(
  restaurants: Location[],
  dietaryRestrictions: string[],
): Location[] {
  if (dietaryRestrictions.length === 0) {
    return restaurants;
  }

  // For now, we'll return all restaurants since we don't have dietary metadata
  // In the future, this would filter based on restaurant metadata
  return restaurants;
}

/**
 * Find a restaurant for a meal slot
 */
export function findMealRecommendation(
  availableRestaurants: Location[],
  mealType: MealType,
  criteria: {
    interests: InterestId[];
    travelStyle: "relaxed" | "balanced" | "fast";
    budgetLevel?: "budget" | "moderate" | "luxury";
    budgetTotal?: number;
    budgetPerDay?: number;
    dietaryRestrictions: string[];
    currentLocation?: { lat: number; lng: number };
  },
): Location | null {
  if (availableRestaurants.length === 0) {
    return null;
  }

  // Filter by dietary restrictions
  const filtered = filterRestaurantsByDietary(availableRestaurants, criteria.dietaryRestrictions);

  if (filtered.length === 0) {
    return null;
  }

  // Score restaurants
  const scoringCriteria: LocationScoringCriteria = {
    interests: criteria.interests.length > 0 ? criteria.interests : ["food"],
    travelStyle: criteria.travelStyle,
    budgetLevel: criteria.budgetLevel,
    budgetTotal: criteria.budgetTotal,
    budgetPerDay: criteria.budgetPerDay,
    currentLocation: criteria.currentLocation,
    availableMinutes: 60, // Typical meal duration
    recentCategories: ["restaurant"], // Avoid too many restaurants in a row
  };

  const scored = filtered.map((restaurant) => scoreLocation(restaurant, scoringCriteria));

  // Sort by score and pick top candidate
  scored.sort((a, b) => b.score - a.score);

  return scored[0]?.location ?? null;
}

/**
 * Detect meal gaps in a day's activities and suggest meal insertions
 */
export function detectMealGapsInDay(
  day: ItineraryDay,
): Array<{ index: number; mealType: MealType; suggestedTime: string }> {
  const gaps: Array<{ index: number; mealType: MealType; suggestedTime: string }> = [];
  const activities = day.activities.filter((a) => a.kind === "place");

  for (let i = 0; i < activities.length - 1; i++) {
    const current = activities[i];
    const next = activities[i + 1];

    if (!current || !next) continue;

    // Get end time of current activity
    const currentEndTime =
      current.schedule?.departureTime ??
      (current.timeOfDay === "morning"
        ? "12:00"
        : current.timeOfDay === "afternoon"
          ? "17:00"
          : "21:00");

    // Get start time of next activity
    const nextStartTime =
      next.schedule?.arrivalTime ??
      (next.timeOfDay === "morning"
        ? "09:00"
        : next.timeOfDay === "afternoon"
          ? "12:00"
          : "18:00");

    // Detect meal gap
    const gap = detectMealGap(currentEndTime, nextStartTime);

    if (gap.hasGap && gap.mealType) {
      // Suggest meal time (middle of gap or at meal window start)
      const prevParts = currentEndTime.split(":");
      const nextParts = nextStartTime.split(":");

      if (prevParts.length >= 2 && nextParts.length >= 2) {
        const prevHours = Number(prevParts[0]);
        const prevMinutes = Number(prevParts[1]);
        const nextHours = Number(nextParts[0]);
        const nextMinutes = Number(nextParts[1]);

        if (!Number.isNaN(prevHours) && !Number.isNaN(prevMinutes) && !Number.isNaN(nextHours) && !Number.isNaN(nextMinutes)) {
          const prevMinutesTotal = prevHours * 60 + prevMinutes;
          const nextMinutesTotal = nextHours * 60 + nextMinutes;
          const gapMiddle = Math.floor((prevMinutesTotal + nextMinutesTotal) / 2);

          const suggestedHours = Math.floor(gapMiddle / 60);
          const suggestedMinutes = gapMiddle % 60;
          const suggestedTime = `${String(suggestedHours).padStart(2, "0")}:${String(suggestedMinutes).padStart(2, "0")}`;

          gaps.push({
            index: i + 1, // Insert after current activity
            mealType: gap.mealType,
            suggestedTime,
          });
        }
      }
    }
  }

  return gaps;
}

/**
 * Insert meal activities into a day's itinerary
 */
export function insertMealActivities(
  day: ItineraryDay,
  builderData: TripBuilderData,
  availableRestaurants: Location[],
): ItineraryDay {
  const gaps = detectMealGapsInDay(day);
  const newActivities: ItineraryActivity[] = [...day.activities];

  // Process gaps in reverse order to maintain indices
  for (let gapIndex = gaps.length - 1; gapIndex >= 0; gapIndex--) {
    const gap = gaps[gapIndex];
    if (!gap) continue;

    // Find restaurant recommendation
    const travelerProfile = builderData.travelerProfile;
    const recommendation = findMealRecommendation(
      availableRestaurants,
      gap.mealType,
      {
        interests: builderData.interests ?? [],
        travelStyle: builderData.style ?? "balanced",
        budgetLevel: travelerProfile?.budget.level,
        budgetTotal: travelerProfile?.budget.total,
        budgetPerDay: travelerProfile?.budget.perDay,
        dietaryRestrictions: builderData.accessibility?.dietary ?? [],
        // Use previous activity location if available
        currentLocation: newActivities[gap.index - 1]?.kind === "place"
          ? MOCK_LOCATIONS.find(
              (loc) => loc.name === (newActivities[gap.index - 1] as Extract<ItineraryActivity, { kind: "place" }>).title,
            )?.coordinates
          : undefined,
      },
    );

    if (recommendation) {
      // Determine time slot based on meal type
      const timeSlot: "morning" | "afternoon" | "evening" =
        gap.mealType === "breakfast"
          ? "morning"
          : gap.mealType === "lunch"
            ? "afternoon"
            : "evening";

      const mealActivity: ItineraryActivity = {
        kind: "place",
        id: `meal-${gap.mealType}-${day.id}-${gap.index}`,
        title: recommendation.name,
        timeOfDay: timeSlot,
        durationMin: 60, // Typical meal duration
        neighborhood: recommendation.city,
        tags: ["dining", gap.mealType],
        locationId: recommendation.id,
        notes: `${gap.mealType.charAt(0).toUpperCase() + gap.mealType.slice(1)} recommendation`,
      };

      newActivities.splice(gap.index, 0, mealActivity);
    }
  }

  return {
    ...day,
    activities: newActivities,
  };
}

