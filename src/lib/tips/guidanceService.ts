import { createClient } from "@/lib/supabase/client";
import type { TravelGuidance, TravelGuidanceRow, GuidanceType } from "@/types/travelGuidance";
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
  /** Location name (for cuisine-specificity matching) */
  locationName?: string;
};

/**
 * Tags that indicate a tip is about a specific cuisine, chain, or venue.
 * When a tip's tags contain any of these, the location's name or googleTypes
 * must also relate to that identifier — otherwise the tip is excluded.
 * Prevents: ramen tips on gyukatsu restaurants, Robot Restaurant tips on
 * sushi bars, TeamLab tips on random museums, etc.
 */
const SPECIFICITY_TAGS = new Set([
  // Cuisine types
  "ramen", "tonkotsu", "miso ramen", "shoyu ramen", "tsukemen", "tantanmen",
  "sushi", "nigiri", "chirashi", "omakase", "kaitenzushi",
  "izakaya", "yakitori",
  "kushikatsu", "hitsumabushi", "unagi",
  "gyudon", "okonomiyaki", "monjayaki", "takoyaki",
  "udon", "soba", "tempura", "kaiseki",
  "yakiniku", "tonkatsu", "gyukatsu", "curry",
  "kaedama", "hakata",
  // Chain / brand names
  "ichiran", "ippudo", "mos burger", "saizeriya",
  "doutor", "komeda", "ootoya", "yayoiken",
  "tenya", "marugame seimen", "yoshinoya", "matsuya", "sukiya",
  "sushiro", "kura sushi", "hamazushi", "torikizoku",
  "don quijote", "donki", "coco ichibanya",
  // Venue / attraction names
  "robot restaurant", "teamlab", "ghibli",
  "disneysea", "disneyland", "usj", "universal studios",
  "oedo onsen", "oedo-onsen", "spa world", "spa-world",
  "super potato", "kabuki-za",
  // Landmarks — Kyoto
  "fushimi inari", "kinkaku", "kinkakuji", "kiyomizu",
  "arashiyama", "bamboo grove", "nishiki market",
  // Landmarks — Nara
  "todai-ji", "todaiji", "nara park",
  // Landmarks — Tokyo
  "shibuya crossing", "golden gai", "akihabara", "harajuku",
  "imperial palace", "edo-tokyo",
  // Landmarks — Osaka
  "dotonbori", "osaka castle",
  // Landmarks — Kanazawa
  "kenrokuen", "kenroku-en", "omicho",
  // Landmarks — Hiroshima
  "miyajima", "itsukushima", "hiroshima peace",
  // Landmarks — other regions
  "dogo onsen", "naoshima", "koyasan", "kumano kodo",
  "izumo taisha", "goryokaku", "hakone", "nikko", "toshogu",
  "kamakura", "mt fuji", "mount fuji", "ginzan onsen",
]);

/**
 * Safety-net category affinity for universal tips that have empty categories[].
 * Maps guidanceType → allowed location categories.
 * Types not listed here are truly universal (show everywhere).
 */
const GUIDANCE_TYPE_CATEGORIES: Partial<Record<GuidanceType, string[]>> = {
  food_culture: ["restaurant", "cafe", "bar", "market"],
  nightlife: ["bar", "entertainment", "restaurant"],
  cultural_context: ["temple", "shrine", "culture", "landmark", "historic_site", "castle", "museum"],
  etiquette: ["temple", "shrine", "restaurant", "onsen", "wellness", "culture"],
  budget: ["restaurant", "shopping", "entertainment", "market", "cafe"],
  practical: [
    "restaurant", "cafe", "bar", "market", "shopping", "temple", "shrine",
    "museum", "entertainment", "onsen", "wellness", "landmark", "park",
    "culture", "historic_site", "castle",
  ],
  seasonal: ["nature", "park", "garden", "beach", "shrine", "temple", "viewpoint"],
  environmental: ["nature", "park", "garden", "beach"],
  photography: ["shrine", "temple", "viewpoint", "landmark", "garden", "nature", "castle", "park"],
  accessibility: ["museum", "temple", "shrine", "park", "restaurant", "entertainment", "landmark"],
  family: ["park", "entertainment", "museum", "aquarium", "zoo", "beach", "nature"],
  solo: ["restaurant", "cafe", "bar", "onsen", "wellness", "entertainment"],
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

  // Universal guidance: still check category affinity before accepting
  if (guidance.isUniversal) {
    const effectiveCategories =
      guidance.categories.length > 0
        ? guidance.categories
        : GUIDANCE_TYPE_CATEGORIES[guidance.guidanceType] ?? [];

    // If there are effective categories and the location has a category, require a match
    if (effectiveCategories.length > 0 && criteria.category) {
      const categoryLower = criteria.category.toLowerCase();
      const categoryMatched = effectiveCategories.some(
        (c) => c.toLowerCase() === categoryLower,
      );
      if (!categoryMatched) {
        return 0;
      }

      // Matched — also run specificity check
      const specificTags = guidance.tags.filter((t) =>
        SPECIFICITY_TAGS.has(t.toLowerCase()),
      );
      if (specificTags.length > 0) {
        const nameLower = (criteria.locationName ?? "").toLowerCase();
        const criteriaTagsLower = (criteria.tags ?? []).map((t) => t.toLowerCase());
        const locationRelevant = specificTags.some((ct) => {
          const ctLower = ct.toLowerCase();
          return (
            nameLower.includes(ctLower) ||
            criteriaTagsLower.some((lt) => lt.includes(ctLower))
          );
        });
        if (!locationRelevant) {
          return 0;
        }
      }

      return guidance.priority + 10;
    }

    // Truly universal (no category constraint) — show everywhere
    return guidance.priority;
  }

  // Category match (most important)
  let categoryMatched = false;
  if (criteria.category && guidance.categories.length > 0) {
    const categoryLower = criteria.category.toLowerCase();
    if (guidance.categories.some((c) => c.toLowerCase() === categoryLower)) {
      score += 10;
      categoryMatched = true;
    }
  }

  // Exclusion: if a tip targets specific categories but the location's
  // category isn't among them, this tip is about a different kind of place.
  // City/region alone shouldn't be enough to surface it.
  if (criteria.category && guidance.categories.length > 0 && !categoryMatched) {
    return 0;
  }

  // EXCLUSION: Specificity check.
  // If a tip's tags contain specific identifiers (cuisine types, chain names,
  // venue names), only show it at locations that relate to those identifiers.
  // Prevents: ramen tips on gyukatsu restaurants, Robot Restaurant tips on
  // sushi bars, TeamLab tips on random museums, chain tips on unrelated venues.
  if (categoryMatched) {
    const specificTags = guidance.tags.filter((t) =>
      SPECIFICITY_TAGS.has(t.toLowerCase()),
    );
    if (specificTags.length > 0) {
      const nameLower = (criteria.locationName ?? "").toLowerCase();
      const criteriaTagsLower = (criteria.tags ?? []).map((t) => t.toLowerCase());
      const locationRelevant = specificTags.some((ct) => {
        const ctLower = ct.toLowerCase();
        return (
          nameLower.includes(ctLower) ||
          criteriaTagsLower.some((lt) => lt.includes(ctLower))
        );
      });
      if (!locationRelevant) {
        return 0;
      }
    }
  }

  // EXCLUSION: If tip has specific location IDs, only match if this location is listed
  if (guidance.locationIds.length > 0) {
    if (!criteria.locationId || !guidance.locationIds.includes(criteria.locationId)) {
      return 0;
    }
    score += 15;
  }

  // EXCLUSION: If tip has specific cities, only show if location's city matches
  if (guidance.cities.length > 0) {
    if (!criteria.city) {
      return 0;
    }
    const cityLower = criteria.city.toLowerCase();
    if (!guidance.cities.some((c) => c.toLowerCase() === cityLower)) {
      return 0;
    }
    score += 5;
  }

  // EXCLUSION: If tip has specific regions, only show if location's region matches
  if (guidance.regions.length > 0) {
    if (!criteria.region) {
      return 0;
    }
    const regionLower = criteria.region.toLowerCase();
    if (!guidance.regions.some((r) => r.toLowerCase() === regionLower)) {
      return 0;
    }
    score += 3;
  }

  // EXCLUSION: If tip is season-specific, only show in matching season
  if (guidance.seasons.length > 0) {
    if (!criteria.season || !guidance.seasons.includes(criteria.season)) {
      return 0;
    }
    score += 4;
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
    locationName: location.name,
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

      // Universal tips: check category affinity before marking relevant
      if (guidance.isUniversal) {
        const effectiveCategories =
          guidance.categories.length > 0
            ? guidance.categories
            : GUIDANCE_TYPE_CATEGORIES[guidance.guidanceType] ?? [];

        if (effectiveCategories.length > 0 && criteria.categories.length > 0) {
          // Only relevant if the day has at least one matching activity category
          const dayCategoriesLower = criteria.categories.map((c) => c.toLowerCase());
          isRelevant = effectiveCategories.some((c) =>
            dayCategoriesLower.includes(c.toLowerCase()),
          );
        } else if (effectiveCategories.length === 0) {
          // Truly universal — no category constraint
          isRelevant = true;
        }
        // else: has affinity but day has no categories → not relevant
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
