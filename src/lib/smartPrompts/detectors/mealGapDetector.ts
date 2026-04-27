/**
 * Meal gap detection - identifies missing breakfast, lunch, and dinner.
 */

import type { ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { DetectedGap } from "./types";
import { getCoveredMealTypes } from "@/lib/smartPrompts/foodDetection";
import { formatCityName } from "@/lib/itinerary/dayLabel";

type Bucket = "morning" | "afternoon" | "evening";

/**
 * Resolve an activity's effective time bucket.
 *
 * Prefers `schedule.arrivalTime` (set fresh by the planner on every replan)
 * over `activity.timeOfDay` (set at generation, can drift after a reorder).
 * Without this, an activity rescheduled to 13:00 but still tagged "evening"
 * from a prior layout would mis-bucket and the lunch gap would not fire.
 */
function effectiveTimeBucket(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
): Bucket {
  const arrivalTime = activity.schedule?.arrivalTime;
  if (arrivalTime) {
    const parts = arrivalTime.split(":").map(Number);
    const hour = parts[0];
    if (hour !== undefined && !Number.isNaN(hour)) {
      if (hour < 12) return "morning";
      if (hour < 18) return "afternoon";
      return "evening";
    }
  }
  return activity.timeOfDay;
}

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
  const morningActivities = activities.filter((a) => effectiveTimeBucket(a) === "morning");
  const hasBreakfast = coveredMealTypes.has("breakfast");

  if (morningActivities.length > 0 && !hasBreakfast) {
    const firstActivity = morningActivities[0];
    const cityName = day.cityId ? formatCityName(day.cityId) : "the area";

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

  // Check for lunch (any day with stops spanning lunch hours, no lunch covered)
  const afternoonActivities = activities.filter(
    (a) => effectiveTimeBucket(a) === "afternoon" || effectiveTimeBucket(a) === "morning"
  );
  const hasLunch = coveredMealTypes.has("lunch");

  if (afternoonActivities.length >= 2 && !hasLunch) {
    const lastMorningActivity = morningActivities[morningActivities.length - 1];
    const firstAfternoonActivity = activities.find((a) => effectiveTimeBucket(a) === "afternoon");
    const cityName = day.cityId ? formatCityName(day.cityId) : "the area";

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
    const lastAfternoonActivity = activities.filter((a) => effectiveTimeBucket(a) === "afternoon").pop();
    const contextActivity = lastAfternoonActivity ?? lastActivity;
    const cityName = day.cityId ? formatCityName(day.cityId) : "the area";

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
