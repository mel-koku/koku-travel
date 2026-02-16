import { createClient } from "@/lib/supabase/client";
import type { TravelGuidance, TravelGuidanceRow } from "@/types/travelGuidance";
import { rowToTravelGuidance } from "@/types/travelGuidance";
import type { Location } from "@/types/location";
import { logger } from "@/lib/logger";

/** Minimal Supabase client interface for guidance queries */
type SupabaseLike = {
  from: (table: string) => ReturnType<NonNullable<ReturnType<typeof createClient>>["from"]>;
};

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
  externalClient?: SupabaseLike,
): Promise<TravelGuidance[]> {
  const supabase = externalClient ?? createClient();
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

/**
 * Check if a tip is location-specific (matches a specific location ID).
 */
export function isLocationSpecificTip(guidance: TravelGuidance, locationId?: string): boolean {
  // If the tip has specific location IDs and one matches, it's location-specific
  if (guidance.locationIds.length > 0 && locationId) {
    return guidance.locationIds.includes(locationId);
  }
  return false;
}

/**
 * Fetch only location-specific tips for a location.
 * These are tips that explicitly match the location ID.
 */
export async function fetchLocationSpecificGuidance(
  location: Location,
  activityDate?: Date,
): Promise<TravelGuidance[]> {
  const allGuidance = await fetchGuidanceForLocation(location, activityDate);
  // Filter to only tips that are specifically for this location
  return allGuidance.filter((g) => isLocationSpecificTip(g, location.id));
}

/**
 * Criteria for fetching day-level guidance.
 */
export type DayGuidanceCriteria = {
  /** Categories of activities in this day */
  categories: string[];
  /** City for this day */
  city?: string;
  /** Region for this day */
  region?: string;
  /** Current season */
  season?: "spring" | "summer" | "fall" | "winter";
  /** Location IDs to exclude (for deduplication with card-level tips) */
  excludeLocationIds?: string[];
};

/**
 * Fetch general tips for a day based on the activities planned.
 * Returns universal tips + category-based tips that apply broadly.
 * Excludes location-specific tips (those are shown on cards).
 */
export async function fetchDayGuidance(
  criteria: DayGuidanceCriteria,
  externalClient?: SupabaseLike,
): Promise<TravelGuidance[]> {
  const supabase = externalClient ?? createClient();
  if (!supabase) {
    logger.warn("Supabase client not available, skipping guidance fetch");
    return [];
  }

  try {
    const query = supabase
      .from("travel_guidance")
      .select("*")
      .eq("status", "published")
      .order("priority", { ascending: false });

    const { data, error } = await query;

    if (error) {
      logger.error("Failed to fetch travel guidance for day", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const seenTitles = new Set<string>();
    const dayGuidance: TravelGuidance[] = [];

    for (const row of data as TravelGuidanceRow[]) {
      const guidance = rowToTravelGuidance(row);

      // Skip if we've already added a tip with this title (deduplication)
      if (seenTitles.has(guidance.title.toLowerCase())) {
        continue;
      }

      // Skip location-specific tips (they go on cards)
      if (guidance.locationIds.length > 0) {
        continue;
      }

      // EXCLUSION CHECK: If tip has specific cities, ONLY show if current city matches
      // This prevents Gion tips from showing on Kobe days, etc.
      if (guidance.cities.length > 0) {
        if (!criteria.city) {
          continue; // No city specified, skip city-specific tips
        }
        const cityLower = criteria.city.toLowerCase();
        const cityMatches = guidance.cities.some((c) => c.toLowerCase() === cityLower);
        if (!cityMatches) {
          continue; // City doesn't match, skip this tip
        }
      }

      // EXCLUSION CHECK: If tip has specific regions, ONLY show if current region matches
      if (guidance.regions.length > 0) {
        if (!criteria.region) {
          continue; // No region specified, skip region-specific tips
        }
        const regionLower = criteria.region.toLowerCase();
        const regionMatches = guidance.regions.some((r) => r.toLowerCase() === regionLower);
        if (!regionMatches) {
          continue; // Region doesn't match, skip this tip
        }
      }

      // EXCLUSION CHECK: Season-specific tips only show in matching season
      if (guidance.seasons.length > 0) {
        if (!criteria.season || !guidance.seasons.includes(criteria.season)) {
          continue; // Season doesn't match, skip this tip
        }
      }

      // Now check if tip is positively relevant
      let isRelevant = false;

      // Universal tips are always relevant (after passing exclusion checks)
      if (guidance.isUniversal) {
        isRelevant = true;
      }

      // Category match - tip applies if any activity category matches
      if (!isRelevant && guidance.categories.length > 0 && criteria.categories.length > 0) {
        const categoriesLower = criteria.categories.map((c) => c.toLowerCase());
        if (guidance.categories.some((c) => categoriesLower.includes(c.toLowerCase()))) {
          isRelevant = true;
        }
      }

      // City-specific tips that passed the exclusion check are relevant
      if (!isRelevant && guidance.cities.length > 0) {
        isRelevant = true; // Already passed city match check above
      }

      // Region-specific tips that passed the exclusion check are relevant
      if (!isRelevant && guidance.regions.length > 0) {
        isRelevant = true; // Already passed region match check above
      }

      if (isRelevant) {
        seenTitles.add(guidance.title.toLowerCase());
        dayGuidance.push(guidance);
      }
    }

    return dayGuidance;
  } catch (error) {
    logger.error("Error fetching day guidance", error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
