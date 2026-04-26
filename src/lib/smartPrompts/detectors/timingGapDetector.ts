/**
 * Timing gap detection - long gaps, early end, late start, lunch rush, late arrival.
 */

import type { ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { DetectedGap } from "./types";
import { resolveActivityCategory } from "@/lib/guide/templateMatcher";
import { parseTimeToMinutes } from "@/lib/utils/timeUtils";
import { getEveningSuggestions } from "@/data/nightActivities";
import { formatCityName } from "@/lib/itinerary/dayLabel";

/**
 * Detect long gaps between activities (>2.5 hours).
 */
export function detectLongGaps(day: ItineraryDay, dayIndex: number): DetectedGap[] {
  const gaps: DetectedGap[] = [];
  const placeActivities = day.activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place"
  );

  const LONG_GAP_THRESHOLD = 150; // 2.5 hours in minutes

  for (let i = 0; i < placeActivities.length - 1; i++) {
    const current = placeActivities[i];
    const next = placeActivities[i + 1];

    if (!current || !next) continue;

    const currentDeparture = parseTimeToMinutes(current.schedule?.departureTime);
    const nextArrival = parseTimeToMinutes(next.schedule?.arrivalTime);

    if (currentDeparture === null || nextArrival === null) continue;

    // Account for travel time if available
    const travelTime = next.travelFromPrevious?.durationMinutes ?? 0;
    const freeTime = nextArrival - currentDeparture - travelTime;

    if (freeTime >= LONG_GAP_THRESHOLD) {
      const hours = Math.floor(freeTime / 60);
      const minutes = freeTime % 60;
      const timeLabel = minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;

      gaps.push({
        id: `long-gap-${current.id}-${next.id}`,
        type: "long_gap",
        dayIndex,
        dayId: day.id,
        title: `${timeLabel} free`,
        description: `You have ${timeLabel} free after ${current.title}. Want to add something nearby?`,
        icon: "Clock",
        action: {
          type: "fill_long_gap",
          afterActivityId: current.id,
          gapMinutes: freeTime,
          timeSlot: current.timeOfDay,
          context: {
            previousActivityName: current.title,
            nextActivityName: next.title,
            nearbyArea: current.neighborhood,
          },
        },
      });
    }
  }

  return gaps;
}

/**
 * Detect early end days (ending before 5pm).
 */
export function detectEarlyEnd(day: ItineraryDay, dayIndex: number): DetectedGap[] {
  const gaps: DetectedGap[] = [];
  const placeActivities = day.activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place"
  );

  if (placeActivities.length === 0) return gaps;

  const EARLY_END_THRESHOLD = 17 * 60; // 5pm in minutes

  // Find the last activity
  const lastActivity = placeActivities[placeActivities.length - 1];
  if (!lastActivity) return gaps;

  const lastDeparture = parseTimeToMinutes(lastActivity.schedule?.departureTime);

  if (lastDeparture !== null && lastDeparture < EARLY_END_THRESHOLD) {
    const endHour = Math.floor(lastDeparture / 60);
    const endMinute = lastDeparture % 60;
    const timeLabel = `${endHour}:${endMinute.toString().padStart(2, "0")}`;

    gaps.push({
      id: `early-end-${day.id}`,
      type: "early_end",
      dayIndex,
      dayId: day.id,
      title: `Ends at ${timeLabel}`,
      description: `Day ${dayIndex + 1} wraps early. Evening is open.`,
      icon: "Sunset",
      action: {
        type: "extend_day",
        direction: "evening",
        currentEndTime: timeLabel,
        context: {
          currentLastActivity: lastActivity.title,
        },
      },
    });
  }

  return gaps;
}

/**
 * Detect late start days (starting after 11am).
 */
export function detectLateStart(day: ItineraryDay, dayIndex: number): DetectedGap[] {
  const gaps: DetectedGap[] = [];
  const placeActivities = day.activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place"
  );

  if (placeActivities.length === 0) return gaps;

  const LATE_START_THRESHOLD = 11 * 60; // 11am in minutes

  // Find the first activity
  const firstActivity = placeActivities[0];
  if (!firstActivity) return gaps;

  const firstArrival = parseTimeToMinutes(firstActivity.schedule?.arrivalTime);

  if (firstArrival !== null && firstArrival >= LATE_START_THRESHOLD) {
    const startHour = Math.floor(firstArrival / 60);
    const startMinute = firstArrival % 60;
    const timeLabel = `${startHour}:${startMinute.toString().padStart(2, "0")}`;

    gaps.push({
      id: `late-start-${day.id}`,
      type: "late_start",
      dayIndex,
      dayId: day.id,
      title: `Starts at ${timeLabel}`,
      description: "Morning is open.",
      icon: "Sunrise",
      action: {
        type: "extend_day",
        direction: "morning",
        context: {
          currentFirstActivity: firstActivity.title,
        },
      },
    });
  }

  return gaps;
}

/**
 * Detect lunch rush timing — restaurant/cafe at peak 11:30–13:00 with high rating.
 * Suggests arriving 30 min early or later to avoid the crowd.
 * Max 1 per day.
 */
export function detectLunchRush(day: ItineraryDay, dayIndex: number): DetectedGap[] {
  const placeActivities = day.activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place"
  );

  const LUNCH_RUSH_CATEGORIES = new Set(["restaurant", "cafe", "bar"]);

  for (const activity of placeActivities) {
    const arrivalMinutes = parseTimeToMinutes(activity.schedule?.arrivalTime);
    if (arrivalMinutes === null) continue;

    // Check if scheduled during peak lunch (11:30-13:00 = 690-780 minutes)
    if (arrivalMinutes < 690 || arrivalMinutes > 780) continue;

    // Check if it's a dining activity
    const category = resolveActivityCategory(activity.tags)?.sub?.toLowerCase();
    const isDining = (category && LUNCH_RUSH_CATEGORIES.has(category)) || !!activity.mealType;
    if (!isDining) continue;

    return [{
      id: `lunch-rush-${day.id}`,
      type: "lunch_rush",
      dayIndex,
      dayId: day.id,
      title: "Peak lunch hour",
      description: `${activity.title} is scheduled during peak lunch. Consider arriving 30 min early to beat the crowd.`,
      icon: "UtensilsCrossed",
      action: {
        type: "acknowledge_lunch_rush",
        timeSlot: activity.schedule?.arrivalTime ?? "12:00",
      },
    }];
  }

  return [];
}

/**
 * Detect late arrival on Day 1 — traveler arrives too late for regular activities.
 * Returns a friendly prompt with evening suggestions for the arrival city.
 */
export function detectLateArrival(day: ItineraryDay, dayIndex: number): DetectedGap[] {
  if (dayIndex !== 0 || !day.isLateArrival) return [];

  const city = day.cityId ?? "your destination";
  const cityLabel = day.cityId ? formatCityName(day.cityId) : "your destination";
  const suggestions = getEveningSuggestions(city, 3);
  const suggestionNames = suggestions.map((s) => s.name);

  return [
    {
      id: `late-arrival-${day.id}`,
      type: "late_arrival",
      dayIndex,
      dayId: day.id,
      title: "You get in late today",
      description: `Take it easy tonight and start fresh tomorrow, or explore late-night ${cityLabel}: ${suggestionNames.join(", ")}.`,
      icon: "Moon",
      action: {
        type: "acknowledge_late_arrival",
        suggestions: suggestionNames,
        city,
      },
    },
  ];
}

/**
 * Detect pre-dawn arrival on Day 1 — traveler lands before shrines, museums,
 * and shops open. Returns an acknowledge-and-defer prompt explaining the strip.
 */
export function detectEarlyArrival(day: ItineraryDay, dayIndex: number): DetectedGap[] {
  if (dayIndex !== 0 || !day.isEarlyArrival) return [];

  const city = day.cityId ?? "your destination";
  const cityLabel = day.cityId ? formatCityName(day.cityId) : "your destination";

  return [
    {
      id: `early-arrival-${day.id}`,
      type: "early_arrival",
      dayIndex,
      dayId: day.id,
      title: "Arrived before sunrise",
      description: `Most things open from 09:00. We've cleared Day 1 so you can settle in. Pick up activities tomorrow in ${cityLabel}.`,
      icon: "Sunrise",
      action: {
        type: "acknowledge_early_arrival",
        city,
      },
    },
  ];
}
