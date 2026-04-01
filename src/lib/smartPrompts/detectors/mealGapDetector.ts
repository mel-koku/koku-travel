/**
 * Meal gap detection - identifies missing breakfast, lunch, and dinner.
 */

import type { ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { DetectedGap } from "./types";
import { getCoveredMealTypes } from "@/lib/smartPrompts/foodDetection";

/**
 * Detect meal gaps in a day with smarter contextual messaging.
 * Uses food detection to recognize restaurants already in the itinerary,
 * even if they weren't added via smart prompts flow.
 */
export function detectMealGaps(day: ItineraryDay, dayIndex: number): DetectedGap[] {
  const gaps: DetectedGap[] = [];
  const activities = day.activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place"
  );

  // Build set of covered meal types by checking ALL food activities
  // This catches restaurants that were added manually or imported without mealType
  const coveredMealTypes = getCoveredMealTypes(activities);

  // Check for breakfast (morning activities without breakfast)
  const morningActivities = activities.filter((a) => a.timeOfDay === "morning");
  const hasBreakfast = coveredMealTypes.has("breakfast");

  if (morningActivities.length > 0 && !hasBreakfast) {
    const firstActivity = morningActivities[0];
    const cityName = day.cityId ?? "the area";

    // Restaurant breakfast option
    gaps.push({
      id: `meal-breakfast-${day.id}`,
      type: "meal",
      dayIndex,
      dayId: day.id,
      title: "Breakfast",
      description: firstActivity
        ? `No breakfast before ${firstActivity.title}.`
        : `No breakfast planned in ${cityName}.`,
      icon: "Coffee",
      action: {
        type: "add_meal",
        mealType: "breakfast",
        timeSlot: "morning",
        context: {
          nearbyArea: firstActivity?.neighborhood ?? cityName,
        },
      },
    });

    // Konbini quick breakfast option
    gaps.push({
      id: `quick-breakfast-${day.id}`,
      type: "meal",
      dayIndex,
      dayId: day.id,
      title: "Quick breakfast (konbini)",
      description: "Onigiri, sandwiches, or hot drinks at any convenience store.",
      icon: "ShoppingBag",
      action: {
        type: "quick_meal",
        mealType: "breakfast",
        timeSlot: "morning",
        context: {
          nearbyArea: firstActivity?.neighborhood ?? cityName,
        },
      },
    });
  }

  // Check for lunch (afternoon activities without lunch)
  const afternoonActivities = activities.filter(
    (a) => a.timeOfDay === "afternoon" || a.timeOfDay === "morning"
  );
  const hasLunch = coveredMealTypes.has("lunch");

  if (afternoonActivities.length >= 2 && !hasLunch) {
    const lastMorningActivity = morningActivities[morningActivities.length - 1];
    const firstAfternoonActivity = activities.find((a) => a.timeOfDay === "afternoon");
    const cityName = day.cityId ?? "the area";

    let description = `No lunch planned in ${cityName}.`;
    if (lastMorningActivity) {
      description = `Gap after ${lastMorningActivity.title}. Good spot for lunch.`;
    } else if (firstAfternoonActivity) {
      description = `No lunch before ${firstAfternoonActivity.title}.`;
    }

    // Restaurant lunch option
    gaps.push({
      id: `meal-lunch-${day.id}`,
      type: "meal",
      dayIndex,
      dayId: day.id,
      title: "Add lunch",
      description,
      icon: "Utensils",
      action: {
        type: "add_meal",
        mealType: "lunch",
        timeSlot: "afternoon",
        afterActivityId: lastMorningActivity?.id,
        context: {
          previousActivityName: lastMorningActivity?.title,
          nearbyArea: lastMorningActivity?.neighborhood ?? cityName,
        },
      },
    });

    // Konbini quick lunch option
    gaps.push({
      id: `quick-lunch-${day.id}`,
      type: "meal",
      dayIndex,
      dayId: day.id,
      title: "Quick lunch (konbini)",
      description: "Bento, onigiri, or noodles from any konbini.",
      icon: "ShoppingBag",
      action: {
        type: "quick_meal",
        mealType: "lunch",
        timeSlot: "afternoon",
        afterActivityId: lastMorningActivity?.id,
        context: {
          previousActivityName: lastMorningActivity?.title,
          nearbyArea: lastMorningActivity?.neighborhood ?? cityName,
        },
      },
    });
  }

  // Check for dinner (any day with activities but no dinner)
  const hasDinner = coveredMealTypes.has("dinner");

  if (activities.length > 0 && !hasDinner) {
    const lastActivity = activities[activities.length - 1];
    const lastAfternoonActivity = activities.filter((a) => a.timeOfDay === "afternoon").pop();
    const contextActivity = lastAfternoonActivity ?? lastActivity;
    const cityName = day.cityId ?? "the area";

    let description = `No dinner on Day ${dayIndex + 1}.`;
    if (contextActivity) {
      description = `Nothing after ${contextActivity.title}. Add dinner in ${cityName}.`;
    }

    // Restaurant dinner option
    gaps.push({
      id: `meal-dinner-${day.id}`,
      type: "meal",
      dayIndex,
      dayId: day.id,
      title: "Add dinner",
      description,
      icon: "UtensilsCrossed",
      action: {
        type: "add_meal",
        mealType: "dinner",
        timeSlot: "evening",
        context: {
          previousActivityName: contextActivity?.title,
          nearbyArea: contextActivity?.neighborhood ?? cityName,
        },
      },
    });

    // Konbini quick dinner option
    gaps.push({
      id: `quick-dinner-${day.id}`,
      type: "meal",
      dayIndex,
      dayId: day.id,
      title: "Quick dinner (konbini)",
      description: "Hot bento or nikuman from a konbini. Eat at your hotel.",
      icon: "ShoppingBag",
      action: {
        type: "quick_meal",
        mealType: "dinner",
        timeSlot: "evening",
        context: {
          previousActivityName: contextActivity?.title,
          nearbyArea: contextActivity?.neighborhood ?? cityName,
        },
      },
    });
  }

  return gaps;
}
