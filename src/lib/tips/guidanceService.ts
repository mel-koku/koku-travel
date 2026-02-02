import { createClient } from "@/lib/supabase/client";
import type { TravelGuidance, TravelGuidanceRow } from "@/types/travelGuidance";
import { rowToTravelGuidance } from "@/types/travelGuidance";
import type { Location } from "@/types/location";
import { logger } from "@/lib/logger";

/**
 * Criteria for matching travel guidance to an activity.
 */
export type GuidanceMatchCriteria = {
  /** Location category (e.g., 'temple', 'shrine', 'restaurant') */
  category?: string;
  /** City name (lowercase) */
  city?: string;
  /** Region name */
  region?: string;
  /** Specific location ID */
  locationId?: string;
  /** Current season */
  season?: "spring" | "summer" | "fall" | "winter";
  /** Additional tags/keywords from the location or activity */
  tags?: string[];
};

/**
 * Get the current season based on the current date or a specific date.
 */
export function getCurrentSeason(date?: Date): "spring" | "summer" | "fall" | "winter" {
  const d = date ?? new Date();
  const month = d.getMonth(); // 0-indexed

  // Northern hemisphere seasons (Japan)
  if (month >= 2 && month <= 4) return "spring"; // March-May
  if (month >= 5 && month <= 7) return "summer"; // June-August
  if (month >= 8 && month <= 10) return "fall"; // September-November
  return "winter"; // December-February
}

/**
 * Fetch travel guidance tips matching the given criteria.
 * Returns tips sorted by priority (highest first).
 */
export async function fetchMatchingGuidance(
  criteria: GuidanceMatchCriteria,
): Promise<TravelGuidance[]> {
  const supabase = createClient();
  if (!supabase) {
    logger.warn("Supabase client not available, skipping guidance fetch");
    return [];
  }

  try {
    // Build the query
    const query = supabase
      .from("travel_guidance")
      .select("*")
      .eq("status", "published")
      .order("priority", { ascending: false });

    // We fetch all published guidance and filter in memory
    // This is more efficient for a small dataset and allows flexible matching
    const { data, error } = await query;

    if (error) {
      logger.error("Failed to fetch travel guidance", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Filter and score the guidance
    const scoredGuidance = (data as TravelGuidanceRow[])
      .map((row) => {
        const guidance = rowToTravelGuidance(row);
        const score = calculateMatchScore(guidance, criteria);
        return { guidance, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    return scoredGuidance.map(({ guidance }) => guidance);
  } catch (error) {
    logger.error("Error fetching travel guidance", error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Calculate a match score for guidance based on criteria.
 * Higher score = better match.
 * Returns 0 if guidance doesn't match at all.
 */
function calculateMatchScore(
  guidance: TravelGuidance,
  criteria: GuidanceMatchCriteria,
): number {
  let score = 0;

  // Universal guidance always matches with base priority
  if (guidance.isUniversal) {
    return guidance.priority;
  }

  // Category match (most important)
  if (criteria.category && guidance.categories.length > 0) {
    const categoryLower = criteria.category.toLowerCase();
    if (guidance.categories.some((c) => c.toLowerCase() === categoryLower)) {
      score += 10;
    }
  }

  // Location ID match (highest specificity)
  if (criteria.locationId && guidance.locationIds.length > 0) {
    if (guidance.locationIds.includes(criteria.locationId)) {
      score += 15;
    }
  }

  // City match
  if (criteria.city && guidance.cities.length > 0) {
    const cityLower = criteria.city.toLowerCase();
    if (guidance.cities.some((c) => c.toLowerCase() === cityLower)) {
      score += 5;
    }
  }

  // Region match
  if (criteria.region && guidance.regions.length > 0) {
    const regionLower = criteria.region.toLowerCase();
    if (guidance.regions.some((r) => r.toLowerCase() === regionLower)) {
      score += 3;
    }
  }

  // Season match
  if (criteria.season && guidance.seasons.length > 0) {
    if (guidance.seasons.includes(criteria.season)) {
      score += 4;
    } else {
      // If guidance is season-specific and doesn't match, reduce score
      score -= 5;
    }
  }

  // Tag match
  if (criteria.tags && criteria.tags.length > 0 && guidance.tags.length > 0) {
    const criteriaTagsLower = criteria.tags.map((t) => t.toLowerCase());
    const matchingTags = guidance.tags.filter((t) =>
      criteriaTagsLower.includes(t.toLowerCase()),
    );
    score += matchingTags.length * 2;
  }

  // If no matches at all, return 0
  if (score <= 0) {
    return 0;
  }

  // Add base priority to the score
  return score + guidance.priority;
}

/**
 * Build match criteria from a location.
 */
export function buildCriteriaFromLocation(
  location: Location,
  activityDate?: Date,
): GuidanceMatchCriteria {
  return {
    category: location.category,
    city: location.city?.toLowerCase(),
    region: location.region,
    locationId: location.id,
    season: getCurrentSeason(activityDate),
    tags: location.googleTypes ?? [],
  };
}

/**
 * Fetch guidance tips for a specific location.
 */
export async function fetchGuidanceForLocation(
  location: Location,
  activityDate?: Date,
): Promise<TravelGuidance[]> {
  const criteria = buildCriteriaFromLocation(location, activityDate);
  return fetchMatchingGuidance(criteria);
}
