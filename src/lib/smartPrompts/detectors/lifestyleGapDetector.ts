/**
 * Lifestyle gap detection - evening free time, omiyage reminders.
 */

import type { Itinerary, ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { DetectedGap } from "./types";
import { getEveningSuggestions, formatEveningSuggestions } from "@/data/nightActivities";
import { getOmiyageForCity, formatOmiyageItems } from "@/data/omiyageGuide";
import { parseTimeToMinutes } from "@/lib/utils/timeUtils";
import { formatCityName } from "@/lib/itinerary/dayLabel";

/**
 * Detect days ending before 20:00 that could benefit from evening activities.
 */
export function detectEveningFree(day: ItineraryDay, dayIndex: number): DetectedGap[] {
  const placeActivities = day.activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place"
  );

  if (placeActivities.length === 0) return [];

  const EVENING_THRESHOLD = 20 * 60; // 8pm

  const lastActivity = placeActivities[placeActivities.length - 1];
  if (!lastActivity) return [];

  const lastDeparture = parseTimeToMinutes(lastActivity.schedule?.departureTime);
  if (lastDeparture === null || lastDeparture >= EVENING_THRESHOLD) return [];

  // Already has evening activities? Skip
  const hasEvening = placeActivities.some((a) => a.timeOfDay === "evening");
  if (hasEvening) return [];

  const city = day.cityId ?? "the area";

  // Get city-specific evening suggestions from night activities data
  const topActivities = getEveningSuggestions(city, 3);
  const suggestionNames = topActivities.map((a) => a.name);
  const suggestionText = formatEveningSuggestions(topActivities);

  return [{
    id: `evening-free-${day.id}`,
    type: "evening_free",
    dayIndex,
    dayId: day.id,
    title: "Free evening",
    description: `Evening is open. ${suggestionText}.`,
    icon: "Moon",
    action: {
      type: "add_evening",
      suggestions: suggestionNames,
      city,
    },
  }];
}

/**
 * Detect last day in each city for omiyage (souvenir) reminders.
 */
export function detectOmiyageReminders(
  itinerary: Itinerary,
): DetectedGap[] {
  const gaps: DetectedGap[] = [];

  // Find last day index for each city
  const lastDayPerCity = new Map<string, number>();
  itinerary.days.forEach((day, idx) => {
    if (day.cityId) lastDayPerCity.set(day.cityId, idx);
  });

  for (const [city, dayIndex] of lastDayPerCity) {
    const day = itinerary.days[dayIndex];
    if (!day) continue;

    const cityLabel = formatCityName(city);
    const omiyage = getOmiyageForCity(city, 3);
    const omiyageItems = formatOmiyageItems(omiyage);
    const omiyageText = omiyage.length > 0
      ? ` Try: ${omiyage.map((o) => o.name).join(", ")}.`
      : "";

    gaps.push({
      id: `omiyage-${day.id}`,
      type: "omiyage_reminder",
      dayIndex,
      dayId: day.id,
      title: `${cityLabel} souvenirs`,
      description: `Last day in ${cityLabel}. Pick up local omiyage before you leave.${omiyageText}`,
      icon: "Gift",
      action: {
        type: "acknowledge_omiyage",
        city,
        items: omiyageItems,
      },
    });
  }

  return gaps;
}
