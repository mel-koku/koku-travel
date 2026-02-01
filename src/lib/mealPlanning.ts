import type { Location } from "@/types/location";
import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import { scoreLocation, type LocationScoringCriteria } from "@/lib/scoring/locationScoring";
import { detectMealGap, type MealType } from "@/data/mealCategories";
import type { InterestId, TripBuilderData } from "@/types/trip";
import { findLocationsForActivities } from "@/lib/itineraryLocations";

/**
 * Default durations for different meal types in minutes
 */
const MEAL_DURATIONS: Record<MealType, number> = {
  breakfast: 45,
  lunch: 60,
  dinner: 90,
  snack: 30,
};

/**
 * Find restaurants that match dietary restrictions
 * Uses Google Places dietaryOptions when available
 */
function filterRestaurantsByDietary(
  restaurants: Location[],
  dietaryRestrictions: string[],
): Location[] {
  if (dietaryRestrictions.length === 0) {
    return restaurants;
  }

  // Normalize dietary restrictions to lowercase for comparison
  const normalizedRestrictions = dietaryRestrictions.map((r) => r.toLowerCase());

  // Check for vegetarian/vegan requirements
  const requiresVegetarian = normalizedRestrictions.includes("vegetarian") || normalizedRestrictions.includes("vegan");

  // If vegetarian/vegan is required, filter based on dietaryOptions
  if (requiresVegetarian) {
    const filteredByVegetarian = restaurants.filter((restaurant) => {
      // If we have dietary data, check servesVegetarianFood
      if (restaurant.dietaryOptions?.servesVegetarianFood !== undefined) {
        return restaurant.dietaryOptions.servesVegetarianFood;
      }
      // If no dietary data, include restaurant (don't exclude based on missing data)
      // But restaurants with explicit data will be prioritized
      return true;
    });

    // If we filtered too aggressively (< 3 options), relax the filter
    // This prevents empty results when few restaurants have dietary metadata
    if (filteredByVegetarian.length < 3) {
      return restaurants;
    }
    return filteredByVegetarian;
  }

  // For other dietary restrictions (halal, kosher, gluten-free, dairy-free)
  // we don't have Google Places data, so return all restaurants
  // These could be enhanced in the future with additional data sources
  return restaurants;
}

/**
 * Normalize a restaurant name for comparison
 * Handles case, whitespace, and common variations
 */
function normalizeRestaurantName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Normalize whitespace
    .replace(/\s+/g, " ")
    // Remove common suffixes that might vary
    .replace(/\s+(restaurant|cafe|café|bar|bistro|kitchen|eatery)$/i, "")
    // Remove branch indicators
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s*-\s*(main|branch|station|central).*$/i, "")
    .trim();
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
    usedLocationIds?: Set<string>;
    usedLocationNames?: Set<string>;
  },
): Location | null {
  if (availableRestaurants.length === 0) {
    return null;
  }

  // Filter by dietary restrictions
  let filtered = filterRestaurantsByDietary(availableRestaurants, criteria.dietaryRestrictions);

  // Filter out already-used locations by ID
  if (criteria.usedLocationIds && criteria.usedLocationIds.size > 0) {
    filtered = filtered.filter((r) => !criteria.usedLocationIds!.has(r.id));
  }

  // Filter out already-used locations by normalized name
  // This prevents same restaurant appearing multiple times even with slight name variations
  if (criteria.usedLocationNames && criteria.usedLocationNames.size > 0) {
    filtered = filtered.filter((r) => {
      const normalizedName = normalizeRestaurantName(r.name);
      return !criteria.usedLocationNames!.has(normalizedName);
    });
  }

  if (filtered.length === 0) {
    return null;
  }

  // Get meal-specific duration
  const mealDuration = MEAL_DURATIONS[mealType];

  // Score restaurants
  const scoringCriteria: LocationScoringCriteria = {
    interests: criteria.interests.length > 0 ? criteria.interests : ["food"],
    travelStyle: criteria.travelStyle,
    budgetLevel: criteria.budgetLevel,
    budgetTotal: criteria.budgetTotal,
    budgetPerDay: criteria.budgetPerDay,
    currentLocation: criteria.currentLocation,
    availableMinutes: mealDuration,
    recentCategories: ["restaurant"], // Avoid too many restaurants in a row
  };

  const scored = filtered.map((restaurant) => scoreLocation(restaurant, scoringCriteria));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Pick randomly from top candidates for variety
  // Use top 5 or all if fewer than 5 candidates
  const topCandidates = scored.slice(0, Math.min(5, scored.length));
  const randomIndex = Math.floor(Math.random() * topCandidates.length);

  return topCandidates[randomIndex]?.location ?? null;
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
 * Insert meal activities into a day's itinerary.
 * Now async because it needs to fetch location data from the database.
 *
 * @param usedLocationIds - Set of location IDs already used in the itinerary (mutated as meals are added)
 * @param usedLocationNames - Set of location names already used (mutated as meals are added)
 */
export async function insertMealActivities(
  day: ItineraryDay,
  builderData: TripBuilderData,
  availableRestaurants: Location[],
  usedLocationIds: Set<string> = new Set(),
  usedLocationNames: Set<string> = new Set(),
): Promise<ItineraryDay> {
  const gaps = detectMealGapsInDay(day);
  const newActivities: ItineraryActivity[] = [...day.activities];

  // Pre-fetch all locations for activities to get coordinates
  const placeActivities = newActivities
    .filter((a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place");
  const locationsMap = await findLocationsForActivities(placeActivities);

  // Process gaps in reverse order to maintain indices
  for (let gapIndex = gaps.length - 1; gapIndex >= 0; gapIndex--) {
    const gap = gaps[gapIndex];
    if (!gap) continue;

    // Find restaurant recommendation
    const travelerProfile = builderData.travelerProfile;

    // Get previous activity location for distance calculation
    const prevActivity = newActivities[gap.index - 1];
    let currentLocation: { lat: number; lng: number } | undefined;

    if (prevActivity?.kind === "place") {
      const prevLocation = locationsMap.get(prevActivity.id);
      currentLocation = prevLocation?.coordinates;
    }

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
        currentLocation,
        usedLocationIds,
        usedLocationNames,
      },
    );

    if (recommendation) {
      // Track this meal location to prevent duplicates (use normalized name for consistency)
      usedLocationIds.add(recommendation.id);
      usedLocationNames.add(normalizeRestaurantName(recommendation.name));

      // Determine time slot based on meal type
      const timeSlot: "morning" | "afternoon" | "evening" =
        gap.mealType === "breakfast"
          ? "morning"
          : gap.mealType === "lunch"
            ? "afternoon"
            : "evening";

      // Use meal-specific duration
      const mealDuration = MEAL_DURATIONS[gap.mealType];

      const mealActivity: ItineraryActivity = {
        kind: "place",
        id: `meal-${gap.mealType}-${day.id}-${gap.index}`,
        title: recommendation.name,
        timeOfDay: timeSlot,
        durationMin: mealDuration,
        neighborhood: recommendation.neighborhood ?? recommendation.city,
        tags: ["dining", gap.mealType],
        locationId: recommendation.id,
        coordinates: recommendation.coordinates,
        mealType: gap.mealType,
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
