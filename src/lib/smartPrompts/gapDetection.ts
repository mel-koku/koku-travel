/**
 * Gap detection utilities for smart prompts.
 *
 * Analyzes generated itineraries to identify opportunities for
 * meals, transport, and experience enhancements.
 */

import type { Itinerary, ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { TravelGuidance } from "@/types/travelGuidance";
import type { WeatherForecast } from "@/types/weather";
import { getCoveredMealTypes } from "./foodDetection";
import { resolveActivityCategory } from "@/lib/guide/templateMatcher";
import { isRainyForecast } from "@/lib/weather/weatherScoring";
import { getCrowdLevel, getCrowdWarning } from "@/data/crowdPatterns";
import { getFestivalsForDay, type Festival } from "@/data/festivalCalendar";
import { getEveningSuggestions, formatEveningSuggestions } from "@/data/nightActivities";
import { getOmiyageForCity, formatOmiyageItems } from "@/data/omiyageGuide";
import { parseTimeToMinutes } from "@/lib/utils/timeUtils";

/**
 * Types of gaps that can be detected in an itinerary.
 */
export type GapType =
  | "meal"
  | "transport"
  | "experience"
  | "long_gap"
  | "early_end"
  | "late_start"
  | "category_imbalance"
  | "guidance"
  | "reservation_alert"
  | "lunch_rush"
  | "rain_contingency"
  | "luggage_needs"
  | "crowd_alert"
  | "festival_alert"
  | "evening_free"
  | "omiyage_reminder"
  | "late_arrival"
  | "guide_suggestion";

/**
 * A detected gap with contextual information for prompting.
 */
export type DetectedGap = {
  id: string;
  type: GapType;
  dayIndex: number;
  dayId: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name
  action: GapAction;
};

/**
 * Action payload for handling a gap.
 */
export type GapAction =
  | {
      type: "add_meal";
      mealType: "breakfast" | "lunch" | "dinner";
      timeSlot: "morning" | "afternoon" | "evening";
      afterActivityId?: string;
      /** Context for smarter messaging */
      context?: {
        previousActivityName?: string;
        timeContext?: string;
        nearbyArea?: string;
      };
    }
  | {
      type: "quick_meal";
      mealType: "breakfast" | "lunch" | "dinner";
      timeSlot: "morning" | "afternoon" | "evening";
      afterActivityId?: string;
      /** Context for smarter messaging */
      context?: {
        previousActivityName?: string;
        nearbyArea?: string;
      };
    }
  | {
      type: "add_transport";
      fromActivityId: string;
      toActivityId: string;
    }
  | {
      type: "add_experience";
      timeSlot: "morning" | "afternoon" | "evening";
      category?: string;
      /** Context for smarter messaging */
      context?: {
        previousActivityName?: string;
        gapDurationMinutes?: number;
        suggestedCategories?: string[];
      };
    }
  | {
      type: "fill_long_gap";
      afterActivityId: string;
      gapMinutes: number;
      timeSlot: "morning" | "afternoon" | "evening";
      context?: {
        previousActivityName?: string;
        nextActivityName?: string;
        nearbyArea?: string;
      };
    }
  | {
      type: "extend_day";
      direction: "morning" | "evening";
      currentEndTime?: string;
      context?: {
        currentFirstActivity?: string;
        currentLastActivity?: string;
      };
    }
  | {
      type: "diversify_categories";
      dominantCategory: string;
      suggestedCategories: string[];
      timeSlot: "morning" | "afternoon" | "evening";
    }
  | {
      type: "acknowledge_guidance";
      guidanceId: string;
      guidanceType: string;
    }
  | {
      type: "acknowledge_reservation";
      locations: Array<{
        name: string;
        dayIndex: number;
        reservationInfo: string;
      }>;
    }
  | {
      type: "acknowledge_lunch_rush";
      timeSlot: string;
    }
  | {
      type: "swap_for_weather";
      outdoorActivityId: string;
      reason: string;
    }
  | {
      type: "acknowledge_luggage";
      fromCity: string;
      toCity: string;
    }
  | {
      type: "acknowledge_crowd";
      activityName: string;
      crowdLevel: number;
    }
  | {
      type: "inject_festival";
      festivalId: string;
      festivalName: string;
      suggestedActivity?: string;
    }
  | {
      type: "acknowledge_festival";
      festivalId: string;
      festivalName: string;
    }
  | {
      type: "add_evening";
      suggestions: string[];
      city: string;
    }
  | {
      type: "acknowledge_omiyage";
      city: string;
      items: Array<{ name: string; nameJa: string }>;
    }
  | {
      type: "acknowledge_late_arrival";
      suggestions: string[];
      city: string;
    }
  | {
      type: "browse_experts";
      city: string;
      personType: "guide" | "artisan";
    };


/**
 * Detect meal gaps in a day with smarter contextual messaging.
 * Uses food detection to recognize restaurants already in the itinerary,
 * even if they weren't added via smart prompts flow.
 */
function detectMealGaps(day: ItineraryDay, dayIndex: number): DetectedGap[] {
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
      title: "Add breakfast",
      description: firstActivity
        ? `Fuel up before ${firstActivity.title} with a local breakfast spot`
        : `Start Day ${dayIndex + 1} with a local breakfast in ${cityName}`,
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
      description: "Grab onigiri, sandwiches, or a hot drink from a convenience store",
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

    let description = `Refuel with lunch in ${cityName}`;
    if (lastMorningActivity) {
      description = `After visiting ${lastMorningActivity.title}, you might be hungry—add lunch nearby?`;
    } else if (firstAfternoonActivity) {
      description = `Add lunch before heading to ${firstAfternoonActivity.title}`;
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
      description: "Save time with bento, onigiri, or noodles from 7-Eleven, Lawson, or FamilyMart",
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

    let description = `End Day ${dayIndex + 1} with a memorable dinner`;
    if (contextActivity) {
      description = `After ${contextActivity.title}, find a great dinner spot in ${cityName}`;
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
      description: "Tired? Grab a hot bento or nikuman from a konbini to eat at your hotel",
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

/**
 * Detect transport gaps (long walks or missing connections).
 */
function detectTransportGaps(day: ItineraryDay, dayIndex: number): DetectedGap[] {
  const gaps: DetectedGap[] = [];
  const activities = day.activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place"
  );

  for (let i = 0; i < activities.length - 1; i++) {
    const current = activities[i];
    const next = activities[i + 1];

    if (!current || !next) continue;

    // Check for long walking segments
    const travelSegment = current.travelToNext ?? next.travelFromPrevious;
    if (travelSegment && travelSegment.mode === "walk" && (travelSegment.durationMinutes ?? 0) > 20) {
      gaps.push({
        id: `transport-${current.id}-${next.id}`,
        type: "transport",
        dayIndex,
        dayId: day.id,
        title: "Consider transit",
        description: `${Math.round(travelSegment.durationMinutes ?? 0)} min walk between stops - take the train?`,
        icon: "Train",
        action: {
          type: "add_transport",
          fromActivityId: current.id,
          toActivityId: next.id,
        },
      });
    }
  }

  return gaps;
}

/**
 * Detect experience gaps (light days that could use more activities).
 */
function detectExperienceGaps(day: ItineraryDay, dayIndex: number): DetectedGap[] {
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
      title: "Add more experiences",
      description: `Day ${dayIndex + 1} has room for more activities`,
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
      title: "Start earlier",
      description: "Add a morning activity to make the most of the day",
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
      title: "Extend your day",
      description: "Add an evening activity or night views",
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
 * Detect long gaps between activities (>2.5 hours).
 */
function detectLongGaps(day: ItineraryDay, dayIndex: number): DetectedGap[] {
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
function detectEarlyEnd(day: ItineraryDay, dayIndex: number): DetectedGap[] {
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
      title: "Day ends early",
      description: `Day ${dayIndex + 1} ends at ${timeLabel}. Extend into the evening?`,
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
function detectLateStart(day: ItineraryDay, dayIndex: number): DetectedGap[] {
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
      title: "Late start",
      description: `Day ${dayIndex + 1} starts at ${timeLabel}. Add a morning activity?`,
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
 * Detect category imbalance (3+ activities of the same category in a day).
 */
function detectCategoryImbalance(day: ItineraryDay, dayIndex: number): DetectedGap[] {
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
        description: `Day ${dayIndex + 1} has ${count} ${categoryLabel} activities. Mix in something different?`,
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
 * Detect lunch rush timing — restaurant/cafe at peak 11:30–13:00 with high rating.
 * Suggests arriving 30 min early or later to avoid the crowd.
 * Max 1 per day.
 */
function detectLunchRush(day: ItineraryDay, dayIndex: number): DetectedGap[] {
  const placeActivities = day.activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place"
  );

  const DINING_CATEGORIES = new Set(["restaurant", "cafe"]);

  for (const activity of placeActivities) {
    const arrivalMinutes = parseTimeToMinutes(activity.schedule?.arrivalTime);
    if (arrivalMinutes === null) continue;

    // Check if scheduled during peak lunch (11:30–13:00 = 690–780 minutes)
    if (arrivalMinutes < 690 || arrivalMinutes > 780) continue;

    // Check if it's a dining activity
    const category = resolveActivityCategory(activity.tags)?.sub?.toLowerCase();
    const isDining = (category && DINING_CATEGORIES.has(category)) || !!activity.mealType;
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
 * Detect outdoor activities scheduled on rainy-forecast days.
 * Suggests swapping for indoor alternatives. Max 2 per day.
 */
function detectRainContingency(
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
      description: `${activity.title} is an outdoor activity and rain is forecast. Consider an indoor alternative.`,
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
function detectLuggageNeeds(day: ItineraryDay, dayIndex: number): DetectedGap[] {
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
function detectCrowdAlerts(
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
          : `${activity.title} is scheduled during peak hours. ${crowdLevel >= 5 ? "Expect long queues." : "Arrive early to beat the rush."}`,
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
function detectFestivalOverlaps(
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

/**
 * Detect days ending before 20:00 that could benefit from evening activities.
 */
function detectEveningFree(day: ItineraryDay, dayIndex: number): DetectedGap[] {
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
    description: `Your day ends early. Explore ${city}'s evening scene — ${suggestionText}.`,
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
function detectOmiyageReminders(
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

    const cityLabel = city.charAt(0).toUpperCase() + city.slice(1);
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

/**
 * Get suggested alternative categories based on the dominant category.
 */
function getSuggestedAlternatives(dominantCategory: string): string[] {
  const alternatives: Record<string, string[]> = {
    temple: ["garden", "shopping", "restaurant", "museum", "craft"],
    shrine: ["garden", "market", "restaurant", "nature", "craft"],
    museum: ["garden", "shopping", "cafe", "nature", "craft"],
    shopping: ["temple", "garden", "museum", "nature"],
    restaurant: ["temple", "garden", "museum", "nature"],
    garden: ["temple", "museum", "shopping", "cafe"],
    nature: ["temple", "museum", "shopping", "restaurant"],
    landmark: ["garden", "shopping", "restaurant", "museum"],
    onsen: ["temple", "garden", "nature", "cafe"],
    craft: ["temple", "garden", "museum", "shopping", "cafe"],
  };

  return alternatives[dominantCategory] ?? ["garden", "cafe", "shopping"];
}

/**
 * Format category name for display.
 */
function formatCategoryName(category: string): string {
  const names: Record<string, string> = {
    temple: "temples",
    shrine: "shrines",
    museum: "museums",
    shopping: "shopping spots",
    restaurant: "restaurants",
    garden: "gardens",
    nature: "nature spots",
    landmark: "landmarks",
    cafe: "cafes",
    onsen: "onsen spots",
    bar: "bars",
    craft: "craft workshops",
  };

  return names[category] ?? category;
}

/**
 * Extract month/day/weekend info for a day in the itinerary.
 */
function getDayDateInfo(
  day: ItineraryDay,
  dayIndex: number,
  tripStartDate?: string,
): { month?: number; dayOfMonth?: number; isWeekend?: boolean } {
  // Prefer dateLabel from the day itself
  const dateStr = day.dateLabel ?? (tripStartDate ? addDays(tripStartDate, dayIndex) : undefined);
  if (!dateStr) return {};

  const parts = dateStr.split("-");
  const year = parseInt(parts[0] ?? "0", 10);
  const month = parseInt(parts[1] ?? "0", 10);
  const dayOfMonth = parseInt(parts[2] ?? "0", 10);

  // Use local date constructor to avoid UTC offset issue
  const date = new Date(year, month - 1, dayOfMonth);
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return { month, dayOfMonth, isWeekend };
}

function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split("-");
  const d = new Date(
    parseInt(parts[0] ?? "0", 10),
    parseInt(parts[1] ?? "0", 10) - 1,
    parseInt(parts[2] ?? "0", 10) + days,
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Detect late arrival on Day 1 — traveler arrives too late for regular activities.
 * Returns a friendly prompt with evening suggestions for the arrival city.
 */
function detectLateArrival(day: ItineraryDay, dayIndex: number): DetectedGap[] {
  if (dayIndex !== 0 || !day.isLateArrival) return [];

  const city = day.cityId ?? "your destination";
  const suggestions = getEveningSuggestions(city, 3);
  const suggestionNames = suggestions.map((s) => s.name);

  return [
    {
      id: `late-arrival-${day.id}`,
      type: "late_arrival",
      dayIndex,
      dayId: day.id,
      title: "You get in late today",
      description: `Take it easy tonight and start fresh tomorrow — or explore late-night ${city}: ${suggestionNames.join(", ")}.`,
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
 * Analyze an itinerary and detect all gaps.
 *
 * @param itinerary - The itinerary to analyze
 * @param options - Options for gap detection
 * @returns Array of detected gaps with actionable suggestions
 */
/**
 * Detect days heavy in cultural/craft activities that would benefit from a local expert.
 */
const GUIDE_ELIGIBLE_CATEGORIES = new Set([
  "craft", "culture", "shrine", "temple", "museum", "garden", "historic_site",
]);

function detectGuideSuggestions(day: ItineraryDay, dayIndex: number): DetectedGap[] {
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
  const cityName = day.cityId ?? "this area";

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

export function detectGaps(
  itinerary: Itinerary,
  options: {
    includeMeals?: boolean;
    includeTransport?: boolean;
    includeExperiences?: boolean;
    includeLongGaps?: boolean;
    includeTimingGaps?: boolean;
    includeCategoryBalance?: boolean;
    includeLunchRush?: boolean;
    includeRainContingency?: boolean;
    includeCrowdAlerts?: boolean;
    includeFestivalAlerts?: boolean;
    includeEveningFree?: boolean;
    includeOmiyageReminders?: boolean;
    forecasts?: Map<string, WeatherForecast>;
    maxGapsPerDay?: number;
    /** When "ryokan", skip breakfast + dinner gap detection (included with stay) */
    accommodationStyle?: "hotel" | "ryokan" | "hostel" | "mix";
    /** Trip start date for date-based features */
    tripStartDate?: string;
  } = {}
): DetectedGap[] {
  const {
    includeMeals = true,
    includeTransport = false, // Disabled by default (too noisy)
    includeExperiences = true,
    includeLongGaps = true,
    includeTimingGaps = true,
    includeCategoryBalance = true,
    includeLunchRush = true,
    includeRainContingency = true,
    includeCrowdAlerts = true,
    includeFestivalAlerts = true,
    includeEveningFree = true,
    includeOmiyageReminders = true,
    forecasts,
    maxGapsPerDay = 4,
    accommodationStyle,
    tripStartDate,
  } = options;

  const allGaps: DetectedGap[] = [];

  itinerary.days.forEach((day, dayIndex) => {
    const dayGaps: DetectedGap[] = [];

    // Late arrival: if Day 1 is a late arrival, skip all other detectors
    // (prevents false "missing breakfast" / "early end" etc.)
    const lateArrivalGaps = detectLateArrival(day, dayIndex);
    if (lateArrivalGaps.length > 0) {
      allGaps.push(...lateArrivalGaps);
      return;
    }

    if (includeMeals) {
      let mealGaps = detectMealGaps(day, dayIndex);
      // Ryokan: dinner and breakfast are included with the stay
      if (accommodationStyle === "ryokan") {
        mealGaps = mealGaps.filter((g) => {
          if (g.action.type !== "add_meal" && g.action.type !== "quick_meal") return true;
          return g.action.mealType === "lunch"; // keep lunch gaps only
        });
      }
      dayGaps.push(...mealGaps);
    }

    if (includeTransport) {
      dayGaps.push(...detectTransportGaps(day, dayIndex));
    }

    if (includeExperiences) {
      dayGaps.push(...detectExperienceGaps(day, dayIndex));
    }

    if (includeLongGaps) {
      dayGaps.push(...detectLongGaps(day, dayIndex));
    }

    if (includeTimingGaps) {
      dayGaps.push(...detectEarlyEnd(day, dayIndex));
      dayGaps.push(...detectLateStart(day, dayIndex));
    }

    if (includeCategoryBalance) {
      dayGaps.push(...detectCategoryImbalance(day, dayIndex));
    }

    if (includeLunchRush) {
      dayGaps.push(...detectLunchRush(day, dayIndex));
    }

    if (includeRainContingency) {
      dayGaps.push(...detectRainContingency(day, dayIndex, forecasts));
    }

    // Luggage needs (city transition days)
    dayGaps.push(...detectLuggageNeeds(day, dayIndex));

    // Crowd alerts
    if (includeCrowdAlerts) {
      const dateInfo = getDayDateInfo(day, dayIndex, tripStartDate);
      dayGaps.push(...detectCrowdAlerts(day, dayIndex, dateInfo));
    }

    // Festival alerts
    if (includeFestivalAlerts) {
      const dateInfo = getDayDateInfo(day, dayIndex, tripStartDate);
      dayGaps.push(...detectFestivalOverlaps(day, dayIndex, dateInfo));
    }

    // Evening free
    if (includeEveningFree) {
      dayGaps.push(...detectEveningFree(day, dayIndex));
    }

    // Guide/artisan suggestions for cultural-heavy days
    dayGaps.push(...detectGuideSuggestions(day, dayIndex));

    // Prioritize and limit gaps per day
    const prioritized = dayGaps.sort((a, b) => {
      const priority: Record<GapType, number> = {
        late_arrival: -2,
        reservation_alert: -1,
        festival_alert: -0.5,
        meal: 0,
        luggage_needs: 1.5,
        late_start: 1,
        early_end: 1,
        rain_contingency: 2,
        long_gap: 2,
        crowd_alert: 2.5,
        lunch_rush: 3,
        category_imbalance: 4,
        transport: 5,
        experience: 6,
        guidance: 5.5,
        evening_free: 6.5,
        omiyage_reminder: 7,
        guide_suggestion: 6.8,
      };
      return priority[a.type] - priority[b.type];
    });

    allGaps.push(...prioritized.slice(0, maxGapsPerDay));
  });

  // Trip-level detections (not per-day)
  if (includeOmiyageReminders) {
    allGaps.push(...detectOmiyageReminders(itinerary));
  }

  return allGaps;
}

/**
 * Get a summary of gaps by type.
 */
/**
 * Detect activities across all days that require or recommend reservations.
 * Returns a single smart prompt on Day 0 listing all reservation-needed locations.
 *
 * @param itinerary - The itinerary to scan
 * @param locationLookup - Function to look up reservation info by location ID
 */
export function detectReservationNeeds(
  itinerary: Itinerary,
  locationLookup: (locationId: string) => { reservationInfo?: string } | undefined
): DetectedGap[] {
  const reservationLocations: Array<{
    name: string;
    dayIndex: number;
    reservationInfo: string;
  }> = [];

  for (let dayIndex = 0; dayIndex < itinerary.days.length; dayIndex++) {
    const day = itinerary.days[dayIndex];
    if (!day) continue;

    for (const activity of day.activities) {
      if (activity.kind !== "place" || !activity.locationId) continue;

      const location = locationLookup(activity.locationId);
      if (location?.reservationInfo) {
        reservationLocations.push({
          name: activity.title,
          dayIndex,
          reservationInfo: location.reservationInfo,
        });
      }
    }
  }

  if (reservationLocations.length === 0) return [];

  const requiredCount = reservationLocations.filter((l) => l.reservationInfo === "required").length;
  const description =
    requiredCount > 0
      ? `${requiredCount} spot${requiredCount > 1 ? "s" : ""} on your trip require${requiredCount === 1 ? "s" : ""} a reservation. Book before you go.`
      : `${reservationLocations.length} spot${reservationLocations.length > 1 ? "s" : ""} recommend booking ahead.`;

  // Always attach to Day 0 so it appears first
  const firstDay = itinerary.days[0];
  return [
    {
      id: "reservation-alert-trip",
      type: "reservation_alert",
      dayIndex: 0,
      dayId: firstDay?.id ?? "day-0",
      title: "Book ahead",
      description,
      icon: "CalendarCheck",
      action: {
        type: "acknowledge_reservation",
        locations: reservationLocations,
      },
    },
  ];
}

/**
 * Guidance type icon mapping
 */
const GUIDANCE_ICON_MAP: Record<string, string> = {
  etiquette: "BookOpen",
  practical: "Info",
  environmental: "Leaf",
  seasonal: "Calendar",
  accessibility: "Accessibility",
  photography: "Camera",
  budget: "PiggyBank",
  nightlife: "Moon",
  family: "Users",
  solo: "User",
  food_culture: "UtensilsCrossed",
  cultural_context: "BookMarked",
  transit: "Train",
};

/**
 * Detect high-priority guidance tips that should be surfaced as smart prompt cards.
 * Only etiquette and practical tips with priority >= 7 are included.
 *
 * This is async because it fetches from the travel_guidance table.
 * Call separately from detectGaps() and merge the results.
 */
export async function detectGuidanceGaps(
  day: ItineraryDay,
  dayIndex: number,
  options: {
    fetchDayGuidance: (criteria: {
      categories: string[];
      city?: string;
      region?: string;
      season?: "spring" | "summer" | "fall" | "winter";
      month?: number;
    }) => Promise<TravelGuidance[]>;
    season?: "spring" | "summer" | "fall" | "winter";
    month?: number;
    maxPerDay?: number;
  }
): Promise<DetectedGap[]> {
  const { fetchDayGuidance, season, month, maxPerDay = 2 } = options;

  const placeActivities = day.activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place"
  );

  const categories = [
    ...new Set(
      placeActivities
        .map((a) => resolveActivityCategory(a.tags)?.sub)
        .filter(Boolean) as string[]
    ),
  ];

  const guidance = await fetchDayGuidance({
    categories,
    city: day.cityId,
    season,
    month,
  });

  // Filter to high-value types with priority >= 7.
  // Transit tips only qualify at priority >= 9 (critical safety/logistics).
  const HIGH_PRIORITY_TYPES = new Set([
    "etiquette",
    "practical",
    "accessibility",
    "food_culture",
    "cultural_context",
    "transit",
  ]);
  const highPriority = guidance.filter(
    (g) =>
      HIGH_PRIORITY_TYPES.has(g.guidanceType) &&
      g.priority >= (g.guidanceType === "transit" ? 9 : 7),
  );

  return highPriority.slice(0, maxPerDay).map((g) => ({
    id: `guidance-${day.id}-${g.id}`,
    type: "guidance" as const,
    dayIndex,
    dayId: day.id,
    title: g.title,
    description: g.summary,
    icon: GUIDANCE_ICON_MAP[g.guidanceType] ?? "Info",
    action: {
      type: "acknowledge_guidance" as const,
      guidanceId: g.id,
      guidanceType: g.guidanceType,
    },
  }));
}
