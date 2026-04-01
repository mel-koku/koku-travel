/**
 * Context gap detection - rain contingency, crowd alerts, festival overlaps, luggage needs.
 */

import type { ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { WeatherForecast } from "@/types/weather";
import type { DetectedGap } from "./types";
import { resolveActivityCategory } from "@/lib/guide/templateMatcher";
import { isRainyForecast } from "@/lib/weather/weatherScoring";
import { getCrowdLevel, getCrowdWarning } from "@/data/crowdPatterns";
import { getFestivalsForDay, type Festival } from "@/data/festivalCalendar";
import { parseTimeToMinutes } from "@/lib/utils/timeUtils";

/**
 * Detect outdoor activities scheduled on rainy-forecast days.
 * Suggests swapping for indoor alternatives. Max 2 per day.
 */
export function detectRainContingency(
  day: ItineraryDay,
  dayIndex: number,
  forecasts?: Map<string, WeatherForecast>,
): DetectedGap[] {
  if (!forecasts) return [];

  // Try to match by dateLabel (ISO date like "2025-03-25")
  const dayForecast = day.dateLabel ? forecasts.get(day.dateLabel) : undefined;
  if (!dayForecast || !isRainyForecast(dayForecast)) return [];

  const OUTDOOR_CATEGORIES = new Set([
    "park", "garden", "viewpoint", "nature", "shrine", "temple", "beach",
  ]);

  const gaps: DetectedGap[] = [];
  const placeActivities = day.activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place",
  );

  for (const activity of placeActivities) {
    if (gaps.length >= 2) break;

    const category = resolveActivityCategory(activity.tags)?.sub?.toLowerCase();
    const isOutdoor =
      activity.tags?.includes("outdoor") ||
      (category && OUTDOOR_CATEGORIES.has(category));

    if (!isOutdoor) continue;

    gaps.push({
      id: `rain-${day.id}-${activity.id}`,
      type: "rain_contingency",
      dayIndex,
      dayId: day.id,
      title: "Rain expected",
      description: `${activity.title} is outdoors and rain is forecast. Have an indoor backup.`,
      icon: "CloudRain",
      action: {
        type: "swap_for_weather",
        outdoorActivityId: activity.id,
        reason: `Rain forecast for ${day.dateLabel ?? `Day ${dayIndex + 1}`}`,
      },
    });
  }

  return gaps;
}

/**
 * Detect luggage logistics needs on city transition days.
 * Suggests takkyubin forwarding service.
 */
export function detectLuggageNeeds(day: ItineraryDay, dayIndex: number): DetectedGap[] {
  if (!day.cityTransition) return [];

  const { fromCityId, toCityId } = day.cityTransition;
  const fromLabel = fromCityId.charAt(0).toUpperCase() + fromCityId.slice(1);
  const toLabel = toCityId.charAt(0).toUpperCase() + toCityId.slice(1);

  return [{
    id: `luggage-${day.id}`,
    type: "luggage_needs",
    dayIndex,
    dayId: day.id,
    title: "Send bags ahead",
    description: `Moving from ${fromLabel} to ${toLabel}. Send bags via takkyubin (~\u00A52,000\u20133,000/bag). Drop off at any convenience store or hotel front desk the day before.`,
    icon: "Package",
    action: {
      type: "acknowledge_luggage",
      fromCity: fromCityId,
      toCity: toCityId,
    },
  }];
}

/**
 * Detect activities scheduled at high crowd levels (>=4).
 * Returns a single crowd_alert per day with the worst offender.
 */
export function detectCrowdAlerts(
  day: ItineraryDay,
  dayIndex: number,
  options?: { month?: number; dayOfMonth?: number; isWeekend?: boolean }
): DetectedGap[] {
  const placeActivities = day.activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place"
  );

  const CROWD_THRESHOLD = 4;

  for (const activity of placeActivities) {
    const arrivalMinutes = parseTimeToMinutes(activity.schedule?.arrivalTime);
    if (arrivalMinutes === null) continue;

    const hour = Math.floor(arrivalMinutes / 60);
    const category = resolveActivityCategory(activity.tags)?.sub?.toLowerCase() ?? "";
    const crowdLevel = getCrowdLevel(category, hour, {
      locationId: activity.locationId,
      month: options?.month,
      day: options?.dayOfMonth,
      isWeekend: options?.isWeekend,
    });

    if (crowdLevel >= CROWD_THRESHOLD) {
      const warning = activity.locationId
        ? getCrowdWarning(activity.locationId)
        : undefined;

      return [{
        id: `crowd-${day.id}-${activity.id}`,
        type: "crowd_alert",
        dayIndex,
        dayId: day.id,
        title: crowdLevel >= 5 ? "Expect large crowds" : "Busy period ahead",
        description: warning
          ? `${activity.title}: ${warning}`
          : `${activity.title} is at peak hours. ${crowdLevel >= 5 ? "Long queues likely." : "Arrive early."}`,
        icon: "Users",
        action: {
          type: "acknowledge_crowd",
          activityName: activity.title,
          crowdLevel,
        },
      }];
    }
  }

  return [];
}

/**
 * Detect festivals overlapping a day in the day's city.
 * Returns up to 1 festival_alert per day.
 */
export function detectFestivalOverlaps(
  day: ItineraryDay,
  dayIndex: number,
  options?: { month?: number; dayOfMonth?: number }
): DetectedGap[] {
  if (!options?.month || !options?.dayOfMonth || !day.cityId) return [];

  const festivals = getFestivalsForDay(options.month, options.dayOfMonth, day.cityId);
  if (festivals.length === 0) return [];

  const festival = festivals[0] as Festival;

  if (festival.suggestedActivity) {
    return [{
      id: `festival-${day.id}-${festival.id}`,
      type: "festival_alert",
      dayIndex,
      dayId: day.id,
      title: `${festival.name}`,
      description: `${festival.description}${festival.crowdImpact >= 4 ? " Expect heavy crowds." : ""}`,
      icon: "PartyPopper",
      action: {
        type: "inject_festival",
        festivalId: festival.id,
        festivalName: festival.name,
        suggestedActivity: festival.suggestedActivity,
      },
    }];
  }

  return [{
    id: `festival-${day.id}-${festival.id}`,
    type: "festival_alert",
    dayIndex,
    dayId: day.id,
    title: `${festival.name}`,
    description: `${festival.description}${festival.crowdImpact >= 4 ? " Expect heavy crowds." : ""}`,
    icon: "PartyPopper",
    action: {
      type: "acknowledge_festival",
      festivalId: festival.id,
      festivalName: festival.name,
    },
  }];
}
