import type { ItineraryActivity } from "@/types/itinerary";

export type ActivityColorScheme = {
  border: string;
  background: string;
  badge: string;
  badgeText: string;
};

/**
 * Color schemes for different activity types
 */
const COLOR_SCHEMES = {
  // Meals
  breakfast: {
    border: "border-l-amber-400",
    background: "bg-amber-50",
    badge: "bg-amber-500",
    badgeText: "text-white",
  },
  lunch: {
    border: "border-l-orange-400",
    background: "bg-orange-50",
    badge: "bg-orange-500",
    badgeText: "text-white",
  },
  dinner: {
    border: "border-l-purple-400",
    background: "bg-purple-50",
    badge: "bg-purple-500",
    badgeText: "text-white",
  },
  snack: {
    border: "border-l-yellow-400",
    background: "bg-yellow-50",
    badge: "bg-yellow-500",
    badgeText: "text-white",
  },
  // Activities
  culture: {
    border: "border-l-rose-400",
    background: "bg-rose-50",
    badge: "bg-rose-500",
    badgeText: "text-white",
  },
  nature: {
    border: "border-l-emerald-400",
    background: "bg-emerald-50",
    badge: "bg-emerald-500",
    badgeText: "text-white",
  },
  shopping: {
    border: "border-l-pink-400",
    background: "bg-pink-50",
    badge: "bg-pink-500",
    badgeText: "text-white",
  },
  view: {
    border: "border-l-sky-400",
    background: "bg-sky-50",
    badge: "bg-sky-500",
    badgeText: "text-white",
  },
  entertainment: {
    border: "border-l-violet-400",
    background: "bg-violet-50",
    badge: "bg-violet-500",
    badgeText: "text-white",
  },
  // Food (non-meal)
  food: {
    border: "border-l-orange-400",
    background: "bg-orange-50",
    badge: "bg-orange-500",
    badgeText: "text-white",
  },
  // Travel
  travel: {
    border: "border-l-blue-400",
    background: "bg-blue-50",
    badge: "bg-blue-500",
    badgeText: "text-white",
  },
  transport: {
    border: "border-l-blue-400",
    background: "bg-blue-50",
    badge: "bg-blue-500",
    badgeText: "text-white",
  },
  // Notes
  note: {
    border: "border-l-stone-300",
    background: "bg-stone-50",
    badge: "bg-stone-400",
    badgeText: "text-white",
  },
  // Entry points
  entryPointStart: {
    border: "border-l-emerald-400",
    background: "bg-emerald-50",
    badge: "bg-emerald-500",
    badgeText: "text-white",
  },
  entryPointEnd: {
    border: "border-l-rose-400",
    background: "bg-rose-50",
    badge: "bg-rose-500",
    badgeText: "text-white",
  },
  // Default
  default: {
    border: "border-l-indigo-400",
    background: "bg-indigo-50/30",
    badge: "bg-indigo-600",
    badgeText: "text-white",
  },
  // Point of interest
  point_of_interest: {
    border: "border-l-indigo-400",
    background: "bg-indigo-50/30",
    badge: "bg-indigo-600",
    badgeText: "text-white",
  },
  // Hotel/accommodation
  hotel: {
    border: "border-l-teal-400",
    background: "bg-teal-50",
    badge: "bg-teal-500",
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
 * Hex color mapping for map pins (matches Tailwind colors)
 */
const HEX_COLORS: Record<string, string> = {
  // Meals
  breakfast: "#F59E0B", // amber-500
  lunch: "#F97316", // orange-500
  dinner: "#A855F7", // purple-500
  snack: "#EAB308", // yellow-500
  // Activities
  culture: "#F43F5E", // rose-500
  nature: "#10B981", // emerald-500
  shopping: "#EC4899", // pink-500
  view: "#0EA5E9", // sky-500
  entertainment: "#8B5CF6", // violet-500
  food: "#F97316", // orange-500
  // Travel
  travel: "#3B82F6", // blue-500
  transport: "#3B82F6", // blue-500
  // Notes
  note: "#78716C", // stone-500
  // Entry points
  entryPointStart: "#10B981", // emerald-500
  entryPointEnd: "#F43F5E", // rose-500
  // Default
  default: "#4F46E5", // indigo-600
  point_of_interest: "#4F46E5", // indigo-600
  // Hotel
  hotel: "#14B8A6", // teal-500
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
