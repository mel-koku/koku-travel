import type { ItineraryActivity } from "@/types/itinerary";

export type ActivityColorScheme = {
  border: string;
  background: string;
  badge: string;
  badgeText: string;
};

/**
 * Color schemes for different activity types
 * Category-differentiated for visual distinction on map and cards
 */
const COLOR_SCHEMES = {
  // Meals — amber/gold (food warmth)
  breakfast: {
    border: "border-l-brand-secondary",
    background: "bg-brand-secondary/10",
    badge: "bg-brand-secondary",
    badgeText: "text-white",
  },
  lunch: {
    border: "border-l-brand-secondary",
    background: "bg-brand-secondary/10",
    badge: "bg-brand-secondary",
    badgeText: "text-white",
  },
  dinner: {
    border: "border-l-brand-secondary",
    background: "bg-brand-secondary/10",
    badge: "bg-brand-secondary",
    badgeText: "text-white",
  },
  snack: {
    border: "border-l-brand-secondary",
    background: "bg-brand-secondary/10",
    badge: "bg-brand-secondary",
    badgeText: "text-white",
  },
  // Activities — crimson (cultural)
  culture: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  // Nature — jade teal
  nature: {
    border: "border-l-sage",
    background: "bg-sage/10",
    badge: "bg-sage",
    badgeText: "text-white",
  },
  // Shopping — gold
  shopping: {
    border: "border-l-warning",
    background: "bg-warning/10",
    badge: "bg-warning",
    badgeText: "text-white",
  },
  // View — crimson (cultural)
  view: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  // Entertainment — amber
  entertainment: {
    border: "border-l-brand-secondary",
    background: "bg-brand-secondary/10",
    badge: "bg-brand-secondary",
    badgeText: "text-white",
  },
  // Travel — warm gray (utilitarian)
  travel: {
    border: "border-l-warm-gray",
    background: "bg-warm-gray/10",
    badge: "bg-warm-gray",
    badgeText: "text-white",
  },
  transport: {
    border: "border-l-warm-gray",
    background: "bg-warm-gray/10",
    badge: "bg-warm-gray",
    badgeText: "text-white",
  },
  // Notes — stone (informational)
  note: {
    border: "border-l-stone",
    background: "bg-stone/10",
    badge: "bg-stone",
    badgeText: "text-white",
  },
  // Entry points — jade teal (journey markers)
  entryPointStart: {
    border: "border-l-sage",
    background: "bg-sage/10",
    badge: "bg-sage",
    badgeText: "text-white",
  },
  entryPointEnd: {
    border: "border-l-sage",
    background: "bg-sage/10",
    badge: "bg-sage",
    badgeText: "text-white",
  },
  // Default — crimson
  default: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  // Point of interest — crimson (cultural)
  point_of_interest: {
    border: "border-l-brand-primary",
    background: "bg-brand-primary/10",
    badge: "bg-brand-primary",
    badgeText: "text-white",
  },
  // Hotel/accommodation — stone (restful)
  hotel: {
    border: "border-l-stone",
    background: "bg-stone/10",
    badge: "bg-stone",
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
      if (primaryTag === "restaurant" || primaryTag === "cafe") {
        return COLOR_SCHEMES.breakfast; // Use meal amber scheme
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
 * Hex color mapping for map pins — category-differentiated
 */
const HEX_COLORS: Record<string, string> = {
  // Meals — lantern amber
  breakfast: "#c6923a",
  lunch: "#c6923a",
  dinner: "#c6923a",
  snack: "#c6923a",
  // Culture/views — bathhouse crimson
  culture: "#8c2f2f",
  view: "#8c2f2f",
  point_of_interest: "#8c2f2f",
  // Nature — jade teal
  nature: "#2d7a6f",
  // Shopping — gold
  shopping: "#d4a017",
  // Entertainment — amber
  entertainment: "#c6923a",
  // Travel — warm gray
  travel: "#5a4f44",
  transport: "#5a4f44",
  // Notes — stone
  note: "#9a8d7e",
  // Entry points — jade teal
  entryPointStart: "#2d7a6f",
  entryPointEnd: "#2d7a6f",
  // Hotel — stone
  hotel: "#9a8d7e",
  // Explore categories — mapped to existing color families
  restaurant: "#c6923a",
  landmark: "#8c2f2f",
  shrine: "#8c2f2f",
  temple: "#8c2f2f",
  museum: "#8c2f2f",
  park: "#2d7a6f",
  market: "#c6923a",
  wellness: "#2d7a6f",
  garden: "#2d7a6f",
  onsen: "#2d7a6f",
  viewpoint: "#8c2f2f",
  bar: "#c6923a",
  // Default — crimson
  default: "#8c2f2f",
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
        if (primaryTag === "restaurant" || primaryTag === "cafe") {
          return HEX_COLORS.restaurant ?? defaultColor;
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

/**
 * Get color scheme (badge, background, border classes) for a category string.
 */
export function getCategoryColorScheme(category: string | undefined): ActivityColorScheme {
  if (!category) return COLOR_SCHEMES.default;
  const key = category.toLowerCase() as ColorSchemeKey;
  return COLOR_SCHEMES[key] ?? COLOR_SCHEMES.default;
}
