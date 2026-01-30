/**
 * Gap detection utilities for smart prompts.
 *
 * Analyzes generated itineraries to identify opportunities for
 * meals, transport, and experience enhancements.
 */

import type { Itinerary, ItineraryDay, ItineraryActivity } from "@/types/itinerary";

/**
 * Types of gaps that can be detected in an itinerary.
 */
export type GapType = "meal" | "transport" | "experience";

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
    };


/**
 * Detect meal gaps in a day.
 */
function detectMealGaps(day: ItineraryDay, dayIndex: number): DetectedGap[] {
  const gaps: DetectedGap[] = [];
  const activities = day.activities.filter((a) => a.kind === "place");

  // Check for breakfast (morning activities without breakfast)
  const morningActivities = activities.filter((a) => a.timeOfDay === "morning");
  const hasBreakfast = morningActivities.some(
    (a) => a.kind === "place" && a.mealType === "breakfast"
  );

  if (morningActivities.length > 0 && !hasBreakfast) {
    gaps.push({
      id: `meal-breakfast-${day.id}`,
      type: "meal",
      dayIndex,
      dayId: day.id,
      title: "Add breakfast",
      description: `Start Day ${dayIndex + 1} with a local breakfast spot`,
      icon: "Coffee",
      action: {
        type: "add_meal",
        mealType: "breakfast",
        timeSlot: "morning",
      },
    });
  }

  // Check for lunch (afternoon activities without lunch)
  const afternoonActivities = activities.filter(
    (a) => a.timeOfDay === "afternoon" || a.timeOfDay === "morning"
  );
  const hasLunch = activities.some((a) => a.kind === "place" && a.mealType === "lunch");

  if (afternoonActivities.length >= 2 && !hasLunch) {
    const lastMorningActivity = morningActivities[morningActivities.length - 1];
    gaps.push({
      id: `meal-lunch-${day.id}`,
      type: "meal",
      dayIndex,
      dayId: day.id,
      title: "Add lunch",
      description: `Refuel with lunch in ${day.cityId ?? "the area"}`,
      icon: "Utensils",
      action: {
        type: "add_meal",
        mealType: "lunch",
        timeSlot: "afternoon",
        afterActivityId: lastMorningActivity?.id,
      },
    });
  }

  // Check for dinner (evening activities without dinner)
  const eveningActivities = activities.filter((a) => a.timeOfDay === "evening");
  const hasDinner = activities.some((a) => a.kind === "place" && a.mealType === "dinner");

  if (eveningActivities.length > 0 && !hasDinner) {
    gaps.push({
      id: `meal-dinner-${day.id}`,
      type: "meal",
      dayIndex,
      dayId: day.id,
      title: "Add dinner",
      description: `End Day ${dayIndex + 1} with a memorable dinner`,
      icon: "UtensilsCrossed",
      action: {
        type: "add_meal",
        mealType: "dinner",
        timeSlot: "evening",
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
    maxGapsPerDay?: number;
  } = {}
): DetectedGap[] {
  const {
    includeMeals = true,
    includeTransport = true,
    includeExperiences = true,
    maxGapsPerDay = 3,
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

    // Prioritize and limit gaps per day
    // Priority: meals > transport > experience
    const prioritized = dayGaps.sort((a, b) => {
      const priority = { meal: 0, transport: 1, experience: 2 };
      return priority[a.type] - priority[b.type];
    });

    allGaps.push(...prioritized.slice(0, maxGapsPerDay));
  });

  return allGaps;
}

/**
 * Get a summary of gaps by type.
 */
export function getGapsSummary(gaps: DetectedGap[]): {
  total: number;
  byType: Record<GapType, number>;
  byDay: Record<number, number>;
} {
  const byType: Record<GapType, number> = { meal: 0, transport: 0, experience: 0 };
  const byDay: Record<number, number> = {};

  for (const gap of gaps) {
    byType[gap.type]++;
    byDay[gap.dayIndex] = (byDay[gap.dayIndex] ?? 0) + 1;
  }

  return {
    total: gaps.length,
    byType,
    byDay,
  };
}
