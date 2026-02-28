/**
 * Gap detection utilities for smart prompts.
 *
 * Analyzes generated itineraries to identify opportunities for
 * meals, transport, and experience enhancements.
 */

import type { Itinerary, ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { TravelGuidance } from "@/types/travelGuidance";
import { getCoveredMealTypes } from "./foodDetection";
import { resolveActivityCategory } from "@/lib/guide/templateMatcher";

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
  | "reservation_alert";

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
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string | undefined): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
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
 * Get suggested alternative categories based on the dominant category.
 */
function getSuggestedAlternatives(dominantCategory: string): string[] {
  const alternatives: Record<string, string[]> = {
    temple: ["garden", "shopping", "restaurant", "museum"],
    shrine: ["garden", "market", "restaurant", "nature"],
    museum: ["garden", "shopping", "cafe", "nature"],
    shopping: ["temple", "garden", "museum", "nature"],
    restaurant: ["temple", "garden", "museum", "nature"],
    garden: ["temple", "museum", "shopping", "cafe"],
    nature: ["temple", "museum", "shopping", "restaurant"],
    landmark: ["garden", "shopping", "restaurant", "museum"],
    onsen: ["temple", "garden", "nature", "cafe"],
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
  };

  return names[category] ?? category;
}

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
    maxGapsPerDay?: number;
  } = {}
): DetectedGap[] {
  const {
    includeMeals = true,
    includeTransport = false, // Disabled by default (too noisy)
    includeExperiences = true,
    includeLongGaps = true,
    includeTimingGaps = true,
    includeCategoryBalance = true,
    maxGapsPerDay = 4,
  } = options;

  const allGaps: DetectedGap[] = [];

  itinerary.days.forEach((day, dayIndex) => {
    const dayGaps: DetectedGap[] = [];

    if (includeMeals) {
      dayGaps.push(...detectMealGaps(day, dayIndex));
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

    // Prioritize and limit gaps per day
    // Priority: meals > timing > long gaps > category > transport > experience
    const prioritized = dayGaps.sort((a, b) => {
      const priority: Record<GapType, number> = {
        reservation_alert: -1,
        meal: 0,
        late_start: 1,
        early_end: 1,
        long_gap: 2,
        category_imbalance: 3,
        transport: 4,
        experience: 5,
        guidance: 6,
      };
      return priority[a.type] - priority[b.type];
    });

    allGaps.push(...prioritized.slice(0, maxGapsPerDay));
  });

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

  // Filter to high-value types with priority >= 7
  const HIGH_PRIORITY_TYPES = new Set([
    "etiquette",
    "practical",
    "accessibility",
    "food_culture",
    "cultural_context",
  ]);
  const highPriority = guidance.filter(
    (g) => HIGH_PRIORITY_TYPES.has(g.guidanceType) && g.priority >= 7
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
