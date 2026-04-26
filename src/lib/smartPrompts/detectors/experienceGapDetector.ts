/**
 * Experience gap detection - light days, category imbalance, guide suggestions.
 */

import type { ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { DetectedGap } from "./types";
import { resolveActivityCategory } from "@/lib/guide/templateMatcher";
import { getSuggestedAlternatives, formatCategoryName } from "./helpers";
import { formatCityName } from "@/lib/itinerary/dayLabel";

/**
 * Detect experience gaps (light days that could use more activities).
 */
export function detectExperienceGaps(day: ItineraryDay, dayIndex: number): DetectedGap[] {
  const gaps: DetectedGap[] = [];
  const placeActivities = day.activities.filter(
    (a) => a.kind === "place" && !a.mealType
  );

  // If very few activities in a day, suggest adding more
  if (placeActivities.length <= 2) {
    gaps.push({
      id: `experience-${day.id}`,
      type: "experience",
      dayIndex,
      dayId: day.id,
      title: "Light day",
      description: `Day ${dayIndex + 1} has room if you want it.`,
      icon: "Plus",
      action: {
        type: "add_experience",
        timeSlot: "afternoon",
      },
    });
  }

  // Check for gaps in time slots
  const morningPlaces = placeActivities.filter((a) => a.timeOfDay === "morning");
  const afternoonPlaces = placeActivities.filter((a) => a.timeOfDay === "afternoon");
  const eveningPlaces = placeActivities.filter((a) => a.timeOfDay === "evening");

  if (morningPlaces.length === 0 && placeActivities.length > 0) {
    gaps.push({
      id: `experience-morning-${day.id}`,
      type: "experience",
      dayIndex,
      dayId: day.id,
      title: "Morning open",
      description: "Nothing before noon. Add something or sleep in.",
      icon: "Sunrise",
      action: {
        type: "add_experience",
        timeSlot: "morning",
      },
    });
  }

  if (eveningPlaces.length === 0 && afternoonPlaces.length > 0) {
    gaps.push({
      id: `experience-evening-${day.id}`,
      type: "experience",
      dayIndex,
      dayId: day.id,
      title: "Evening open",
      description: "Free after dark.",
      icon: "Moon",
      action: {
        type: "add_experience",
        timeSlot: "evening",
      },
    });
  }

  return gaps;
}

/**
 * Detect category imbalance (3+ activities of the same category in a day).
 */
export function detectCategoryImbalance(day: ItineraryDay, dayIndex: number): DetectedGap[] {
  const gaps: DetectedGap[] = [];
  const placeActivities = day.activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> =>
      a.kind === "place" && !a.mealType
  );

  if (placeActivities.length < 3) return gaps;

  // Count categories
  const categoryCounts = new Map<string, number>();
  for (const activity of placeActivities) {
    const category = resolveActivityCategory(activity.tags)?.sub ?? "unknown";
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }

  // Find dominant categories (3+ occurrences)
  const IMBALANCE_THRESHOLD = 3;
  for (const [category, count] of categoryCounts) {
    if (count >= IMBALANCE_THRESHOLD && category !== "unknown") {
      // Suggest alternative categories
      const suggestedCategories = getSuggestedAlternatives(category);

      const categoryLabel = formatCategoryName(category);
      gaps.push({
        id: `category-imbalance-${day.id}-${category}`,
        type: "category_imbalance",
        dayIndex,
        dayId: day.id,
        title: `Lots of ${categoryLabel}`,
        description: `Day ${dayIndex + 1} has ${count} ${categoryLabel} visits back to back. A garden or meal between would improve the rhythm.`,
        icon: "Shuffle",
        action: {
          type: "diversify_categories",
          dominantCategory: category,
          suggestedCategories,
          timeSlot: "afternoon", // Default to afternoon for variety
        },
      });
    }
  }

  return gaps;
}

/**
 * Detect days heavy in cultural/craft activities that would benefit from a local expert.
 */
const GUIDE_ELIGIBLE_CATEGORIES = new Set([
  "craft", "culture", "shrine", "temple", "museum", "garden", "historic_site",
]);

export function detectGuideSuggestions(day: ItineraryDay, dayIndex: number): DetectedGap[] {
  const placeActivities = day.activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place"
  );

  let eligibleCount = 0;
  let craftCount = 0;

  for (const a of placeActivities) {
    const cat = resolveActivityCategory(a.tags ?? []);
    const sub = cat?.sub;
    if (sub && GUIDE_ELIGIBLE_CATEGORIES.has(sub)) {
      eligibleCount++;
      if (sub === "craft") craftCount++;
    }
  }

  if (eligibleCount < 2) return [];

  const isCraftMajority = craftCount > eligibleCount / 2;
  const personType = isCraftMajority ? "artisan" : "guide";
  const cityName = day.cityId ? formatCityName(day.cityId) : "this area";

  return [
    {
      id: `guide-suggestion-${day.id}`,
      type: "guide_suggestion",
      dayIndex,
      dayId: day.id,
      title: isCraftMajority ? "Add a local artisan" : "Add a local guide",
      description: `Day ${dayIndex + 1} in ${cityName} has ${eligibleCount} cultural sites. A local ${personType} could deepen the experience.`,
      icon: "Users",
      action: {
        type: "browse_experts",
        city: cityName,
        personType,
      },
    },
  ];
}
