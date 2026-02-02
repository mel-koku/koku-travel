import type { ItineraryActivity } from "@/types/itinerary";

export type ActivityColorScheme = {
  border: string;
  background: string;
  badge: string;
  badgeText: string;
};

/**
 * Color schemes for different activity types
 * Using consistent brand-primary for all badges for visual cohesion
 */
const COLOR_SCHEMES = {
  // Meals
  breakfast: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  lunch: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  dinner: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  snack: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  // Activities
  culture: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  nature: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  shopping: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  view: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  entertainment: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  // Food (non-meal)
  food: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  // Travel
  travel: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  transport: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  // Notes
  note: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  // Entry points - keep distinct with earthy-sage for start/end differentiation
  entryPointStart: {
    border: "border-l-earthy-sage",
    background: "bg-earthy-sage/10",
    badge: "bg-earthy-sage",
    badgeText: "text-white",
  },
  entryPointEnd: {
    border: "border-l-earthy-sage",
    background: "bg-earthy-sage/10",
    badge: "bg-earthy-sage",
    badgeText: "text-white",
  },
  // Default
  default: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  // Point of interest
  point_of_interest: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  // Hotel/accommodation
  hotel: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
} as const satisfies Record<string, ActivityColorScheme>;

type ColorSchemeKey = keyof typeof COLOR_SCHEMES;

/**
 * Get color scheme for an activity based on its type
 */
export function getActivityColorScheme(
  activity: ItineraryActivity
): ActivityColorScheme {
  // Check if it's a note
  if (activity.kind === "note") {
    return COLOR_SCHEMES.note;
  }

  // Check if it's an entry point
  if (activity.kind === "place" && activity.locationId) {
    if (activity.locationId.startsWith("__entry_point_start__")) {
      return COLOR_SCHEMES.entryPointStart;
    }
    if (activity.locationId.startsWith("__entry_point_end__")) {
      return COLOR_SCHEMES.entryPointEnd;
    }
  }

  // Check if it's a meal
  if (activity.kind === "place" && activity.mealType) {
    const mealScheme = COLOR_SCHEMES[activity.mealType as ColorSchemeKey];
    if (mealScheme) {
      return mealScheme;
    }
  }

  // Check tags for category
  if (activity.kind === "place" && activity.tags?.length) {
    const primaryTag = activity.tags[0]?.toLowerCase();
    if (primaryTag) {
      // Check for meal-related tags
      if (primaryTag === "food" || primaryTag === "restaurant" || primaryTag === "cafe") {
        return COLOR_SCHEMES.food;
      }
      const tagScheme = COLOR_SCHEMES[primaryTag as ColorSchemeKey];
      if (tagScheme) {
        return tagScheme;
      }
    }
  }

  return COLOR_SCHEMES.default;
}

/**
 * Get color scheme for travel segments
 */
export function getTravelColorScheme(): ActivityColorScheme {
  return COLOR_SCHEMES.travel;
}

/**
 * Get a simple color class for the badge based on activity type
 */
export function getActivityBadgeColor(activity: ItineraryActivity): string {
  const scheme = getActivityColorScheme(activity);
  return scheme.badge;
}

/**
 * Determine the activity type label for display
 */
export function getActivityTypeLabel(activity: ItineraryActivity): string {
  if (activity.kind === "note") {
    return "Note";
  }

  if (activity.kind === "place") {
    // Entry points
    if (activity.locationId?.startsWith("__entry_point_start__")) {
      return "Start";
    }
    if (activity.locationId?.startsWith("__entry_point_end__")) {
      return "End";
    }

    // Meals
    if (activity.mealType) {
      return activity.mealType.charAt(0).toUpperCase() + activity.mealType.slice(1);
    }

    // Tags
    if (activity.tags?.length) {
      const primaryTag = activity.tags[0];
      if (primaryTag) {
        return primaryTag.charAt(0).toUpperCase() + primaryTag.slice(1);
      }
    }
  }

  return "Activity";
}

/**
 * Hex color mapping for map pins (consistent brand-primary for all activities)
 */
const HEX_COLORS: Record<string, string> = {
  // All activities use brand-primary for consistency
  breakfast: "#8b7355", // brand-primary
  lunch: "#8b7355", // brand-primary
  dinner: "#8b7355", // brand-primary
  snack: "#8b7355", // brand-primary
  culture: "#8b7355", // brand-primary
  nature: "#8b7355", // brand-primary
  shopping: "#8b7355", // brand-primary
  view: "#8b7355", // brand-primary
  entertainment: "#8b7355", // brand-primary
  food: "#8b7355", // brand-primary
  travel: "#8b7355", // brand-primary
  transport: "#8b7355", // brand-primary
  note: "#8b7355", // brand-primary
  // Entry points - sage green for start/end markers
  entryPointStart: "#607263", // earthy-sage
  entryPointEnd: "#607263", // earthy-sage
  // Default
  default: "#8b7355", // brand-primary
  point_of_interest: "#8b7355", // brand-primary
  hotel: "#8b7355", // brand-primary
};

/**
 * Get hex color for an activity (for map pins)
 */
export function getActivityHexColor(activity: ItineraryActivity): string {
  const defaultColor = HEX_COLORS.default as string;

  if (activity.kind === "note") {
    return HEX_COLORS.note ?? defaultColor;
  }

  if (activity.kind === "place") {
    // Entry points
    if (activity.locationId?.startsWith("__entry_point_start__")) {
      return HEX_COLORS.entryPointStart ?? defaultColor;
    }
    if (activity.locationId?.startsWith("__entry_point_end__")) {
      return HEX_COLORS.entryPointEnd ?? defaultColor;
    }

    // Meals
    if (activity.mealType) {
      const mealColor = HEX_COLORS[activity.mealType];
      if (mealColor) return mealColor;
    }

    // Tags
    if (activity.tags?.length) {
      const primaryTag = activity.tags[0]?.toLowerCase();
      if (primaryTag) {
        if (primaryTag === "food" || primaryTag === "restaurant" || primaryTag === "cafe") {
          return HEX_COLORS.food ?? defaultColor;
        }
        const tagColor = HEX_COLORS[primaryTag];
        if (tagColor) return tagColor;
      }
    }
  }

  return defaultColor;
}

/**
 * Get hex color for a category/tag directly
 */
export function getCategoryHexColor(category: string | undefined): string {
  const defaultColor = HEX_COLORS.default as string;
  if (!category) return defaultColor;
  const lowerCategory = category.toLowerCase();
  const color = HEX_COLORS[lowerCategory];
  return color ?? defaultColor;
}
