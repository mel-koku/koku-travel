/**
 * Shared types for gap detection.
 */

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
  | "early_arrival"
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
      type: "acknowledge_early_arrival";
      city: string;
    }
  | {
      type: "browse_experts";
      city: string;
      personType: "guide" | "artisan";
    };
