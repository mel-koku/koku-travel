import type { LocationDetails } from "@/types/location";

/**
 * Default duration in minutes for different location categories.
 * These are fallback values when more specific data isn't available.
 *
 * Includes both specific categories (shrine, temple, museum, landmark)
 * and generic fallback categories (culture, food, nature) for backwards
 * compatibility with legacy data.
 */
const CATEGORY_DEFAULT_DURATIONS: Record<string, number> = {
  // Specific categories (preferred)
  shrine: 60, // Shinto shrines - typically 30-90 minutes
  temple: 90, // Buddhist temples - often have gardens, multiple buildings
  landmark: 120, // Castles, towers - extensive grounds, multiple areas
  museum: 120, // Museums - comprehensive visits
  historic: 90, // Historic sites - variable but often extensive
  park: 90, // Parks - leisurely visits
  garden: 60, // Japanese gardens - contemplative but focused
  viewpoint: 30, // Observation decks - quick visits
  market: 90, // Markets - browsing and food
  restaurant: 60, // Dining - typical meal duration
  bar: 90, // Bars - evening drinks
  entertainment: 120, // Shows, events

  // Generic fallback categories (for legacy data)
  culture: 90, // Generic cultural sites
  food: 60, // Generic dining
  nature: 120, // Generic nature (hiking, etc.)
  shopping: 90, // Generic shopping
  view: 30, // Generic viewpoints

  // Infrastructure (not visit durations)
  accommodation: 0,
  transportation: 0,
};

const DEFAULT_DURATION = 90; // Default fallback in minutes

/**
 * Returns the default duration in minutes for a given location category.
 */
export function getCategoryDefaultDuration(category: string): number {
  return CATEGORY_DEFAULT_DURATIONS[category] ?? DEFAULT_DURATION;
}

/**
 * Extracts typical visit duration from Google Places API details.
 * Looks for duration hints in editorial summaries, reviews, or other metadata.
 */
export function extractDurationFromGooglePlaces(
  details: LocationDetails,
): {
  typicalMinutes?: number;
  source: string;
} {
  // Try to extract from editorial summary
  if (details.editorialSummary) {
    const summary = details.editorialSummary.toLowerCase();
    
    // Look for common duration patterns
    const hourPattern = /(\d+)\s*(?:hour|hr|h)/i;
    const minutePattern = /(\d+)\s*(?:minute|min|m)\s*(?!hour)/i;
    const halfHourPattern = /half\s*(?:an?\s*)?hour/i;
    const hourAndHalfPattern = /(\d+)\s*(?:\.5|½|and\s*a\s*half)\s*(?:hour|hr|h)/i;
    
    // Check for "hour and a half" or "1.5 hours"
    const hourAndHalfMatch = summary.match(hourAndHalfPattern);
    if (hourAndHalfMatch) {
      const hours = parseInt(hourAndHalfMatch[1] || "1", 10);
      return {
        typicalMinutes: hours * 60 + 30,
        source: "editorial_summary",
      };
    }
    
    // Check for half hour
    if (halfHourPattern.test(summary)) {
      return {
        typicalMinutes: 30,
        source: "editorial_summary",
      };
    }
    
    // Check for hours
    const hourMatch = summary.match(hourPattern);
    if (hourMatch && hourMatch[1]) {
      const hours = parseInt(hourMatch[1], 10);
      if (hours > 0 && hours <= 8) {
        return {
          typicalMinutes: hours * 60,
          source: "editorial_summary",
        };
      }
    }
    
    // Check for minutes (but not if hours were found)
    if (!hourMatch) {
      const minuteMatch = summary.match(minutePattern);
      if (minuteMatch && minuteMatch[1]) {
        const minutes = parseInt(minuteMatch[1], 10);
        if (minutes > 0 && minutes <= 480) {
          return {
            typicalMinutes: minutes,
            source: "editorial_summary",
          };
        }
      }
    }
  }
  
  // Try to extract from reviews (look for common phrases)
  if (details.reviews && details.reviews.length > 0) {
    const reviewTexts = details.reviews
      .slice(0, 5) // Check first 5 reviews
      .map((r) => r.text?.toLowerCase() || "")
      .join(" ");
    
    const hourPattern = /spent\s+(\d+)\s*(?:hour|hr|h)/i;
    const hourMatch = reviewTexts.match(hourPattern);
    if (hourMatch && hourMatch[1]) {
      const hours = parseInt(hourMatch[1], 10);
      if (hours > 0 && hours <= 8) {
        return {
          typicalMinutes: hours * 60,
          source: "reviews",
        };
      }
    }
  }
  
  return {
    source: "none",
  };
}

