/**
 * Food detection utilities for smart prompts.
 *
 * Identifies food activities and infers meal types from various signals
 * to enable smarter gap detection that recognizes restaurants already
 * in the itinerary.
 */

import type { ItineraryActivity } from "@/types/itinerary";
import { getMealTypeForTime } from "@/data/mealCategories";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

/**
 * Tags that indicate a food/dining activity.
 */
const FOOD_TAGS = new Set([
  "dining",
  "restaurant",
  "food",
  "cafe",
  "bakery",
  "ramen",
  "sushi",
  "izakaya",
  "coffee",
  "tea",
  "dessert",
  "sweets",
  "bar",
  "pub",
  "brewery",
  "steak",
  "yakiniku",
  "tempura",
  "udon",
  "soba",
  "curry",
  "kaiseki",
  "wagyu",
  "okonomiyaki",
  "takoyaki",
  "tonkatsu",
  "gyudon",
  "bento",
]);

/**
 * Tags that explicitly indicate a meal type.
 */
const MEAL_TYPE_TAGS: Record<string, MealType> = {
  breakfast: "breakfast",
  brunch: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
  snack: "snack",
};

/**
 * Check if an activity is a food-related activity.
 *
 * Detection signals:
 * 1. Has explicit mealType set
 * 2. Has "dining" tag
 * 3. Has other food-related tags
 *
 * @param activity - The activity to check
 * @returns true if the activity is food-related
 */
export function isFoodActivity(
  activity: Extract<ItineraryActivity, { kind: "place" }>
): boolean {
  // 1. Has explicit mealType
  if (activity.mealType) {
    return true;
  }

  // 2. Check tags for food-related indicators
  if (activity.tags && activity.tags.length > 0) {
    for (const tag of activity.tags) {
      const normalizedTag = tag.toLowerCase();
      if (FOOD_TAGS.has(normalizedTag)) {
        return true;
      }
      // Check for partial matches (e.g., "japanese-restaurant")
      for (const foodTag of FOOD_TAGS) {
        if (normalizedTag.includes(foodTag)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Infer the meal type from an activity based on various signals.
 *
 * Inference order:
 * 1. Explicit mealType -> use it
 * 2. Tags contain meal type -> use it
 * 3. schedule.arrivalTime -> use getMealTypeForTime()
 * 4. timeOfDay fallback -> morning=breakfast, afternoon=lunch, evening=dinner
 *
 * @param activity - The activity to infer meal type from
 * @returns The inferred meal type, or null if not a food activity
 */
export function inferMealType(
  activity: Extract<ItineraryActivity, { kind: "place" }>
): MealType | null {
  // Must be a food activity to infer meal type
  if (!isFoodActivity(activity)) {
    return null;
  }

  // 1. Explicit mealType takes priority
  if (activity.mealType) {
    return activity.mealType;
  }

  // 2. Check tags for explicit meal type indicators
  if (activity.tags && activity.tags.length > 0) {
    for (const tag of activity.tags) {
      const normalizedTag = tag.toLowerCase();
      const mealType = MEAL_TYPE_TAGS[normalizedTag];
      if (mealType) {
        return mealType;
      }
    }
  }

  // 3. Use arrival time to determine meal type
  if (activity.schedule?.arrivalTime) {
    const mealType = getMealTypeForTime(activity.schedule.arrivalTime);
    if (mealType) {
      return mealType;
    }
    // If arrival time doesn't fall in a meal window, use extended heuristics
    return inferMealTypeFromTime(activity.schedule.arrivalTime);
  }

  // 4. Fall back to timeOfDay
  return inferMealTypeFromTimeOfDay(activity.timeOfDay);
}

/**
 * Infer meal type from a specific time string using extended time ranges.
 *
 * Extended ranges (beyond strict meal windows):
 * - Before 11:00 -> breakfast
 * - 11:00 to 16:00 -> lunch
 * - After 16:00 -> dinner
 */
function inferMealTypeFromTime(time: string): MealType | null {
  const parts = time.split(":");
  if (parts.length < 2) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  const totalMinutes = hours * 60 + minutes;

  // Before 11:00 -> breakfast
  if (totalMinutes < 11 * 60) {
    return "breakfast";
  }

  // 11:00 to 16:00 -> lunch
  if (totalMinutes < 16 * 60) {
    return "lunch";
  }

  // After 16:00 -> dinner
  return "dinner";
}

/**
 * Infer meal type from timeOfDay field.
 *
 * Mapping:
 * - morning -> breakfast
 * - afternoon -> lunch
 * - evening -> dinner
 */
function inferMealTypeFromTimeOfDay(
  timeOfDay: "morning" | "afternoon" | "evening"
): MealType {
  switch (timeOfDay) {
    case "morning":
      return "breakfast";
    case "afternoon":
      return "lunch";
    case "evening":
      return "dinner";
  }
}

/**
 * Get all covered meal types from a list of activities.
 *
 * Scans activities to find food activities and infers their meal types,
 * returning a set of meal types that are already covered.
 *
 * @param activities - Array of place activities to scan
 * @returns Set of meal types that are covered by existing food activities
 */
export function getCoveredMealTypes(
  activities: Extract<ItineraryActivity, { kind: "place" }>[]
): Set<MealType> {
  const covered = new Set<MealType>();

  for (const activity of activities) {
    const mealType = inferMealType(activity);
    if (mealType && mealType !== "snack") {
      covered.add(mealType);
    }
  }

  return covered;
}
