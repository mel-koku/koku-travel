/**
 * Gap detection utilities for smart prompts.
 *
 * Analyzes generated itineraries to identify opportunities for
 * meals, transport, and experience enhancements.
 *
 * This file is the orchestrator that composes individual detectors.
 */

import type { Itinerary, ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { TravelGuidance } from "@/types/travelGuidance";
import type { WeatherForecast } from "@/types/weather";
import { resolveActivityCategory } from "@/lib/guide/templateMatcher";
import { getDayDateInfo } from "./detectors/helpers";

// Re-export all shared types
export type { GapType, DetectedGap, GapAction } from "./detectors/types";
import type { GapType, DetectedGap } from "./detectors/types";

// Import all detectors
import { detectMealGaps } from "./detectors/mealGapDetector";
import { detectTransportGaps } from "./detectors/transportGapDetector";
import {
  detectExperienceGaps,
  detectCategoryImbalance,
  detectGuideSuggestions,
} from "./detectors/experienceGapDetector";
import {
  detectLongGaps,
  detectEarlyEnd,
  detectLateStart,
  detectLunchRush,
  detectLateArrival,
} from "./detectors/timingGapDetector";
import {
  detectRainContingency,
  detectLuggageNeeds,
  detectCrowdAlerts,
  detectFestivalOverlaps,
} from "./detectors/contextGapDetector";
import {
  detectEveningFree,
  detectOmiyageReminders,
} from "./detectors/lifestyleGapDetector";

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
 * Analyze an itinerary and detect all gaps.
 *
 * @param itinerary - The itinerary to analyze
 * @param options - Options for gap detection
 * @returns Array of detected gaps with actionable suggestions
 */
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
