import type { SupabaseClient } from "@supabase/supabase-js";
import type { Itinerary, ItineraryActivity } from "@/types/itinerary";
import { detectCategoryStreak, detectNeighborhoodStreak } from "@/lib/scoring/diversityRules";
import { getCityMetadata } from "@/lib/tripBuilder/cityRelevance";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";

/**
 * Validation issue severity levels
 */
export type ValidationSeverity = "error" | "warning" | "info";

/**
 * Individual validation issue
 */
export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  dayIndex?: number;
  locationId?: string;
  details?: Record<string, unknown>;
}

/**
 * Complete validation result for an itinerary
 */
export interface ItineraryValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
    totalDays: number;
    totalActivities: number;
    uniqueLocations: number;
    duplicateLocations: number;
    averageActivitiesPerDay: number;
    categoryDiversityScore: number;
    neighborhoodDiversityScore: number;
  };
}

/**
 * Validation configuration options
 */
export interface ValidationOptions {
  /**
   * Minimum activities per day (below triggers warning)
   */
  minActivitiesPerDay?: number;
  /**
   * Maximum percentage of same category allowed (above triggers warning)
   */
  maxSameCategoryPercent?: number;
  /**
   * Maximum consecutive same category allowed (above triggers warning)
   */
  maxCategoryStreak?: number;
  /**
   * Maximum consecutive same neighborhood allowed (above triggers warning)
   */
  maxNeighborhoodStreak?: number;
  /**
   * Number of vibes the user selected. When ≤ 2 the validator relaxes the
   * category-diversity threshold because themed trips (history_buff only,
   * zen_wellness + temples_tradition, etc.) are intentionally narrow.
   */
  vibeCount?: number;
}

const DEFAULT_OPTIONS: Required<Omit<ValidationOptions, "vibeCount">> = {
  minActivitiesPerDay: 3,
  maxSameCategoryPercent: 50,
  maxCategoryStreak: 3,
  maxNeighborhoodStreak: 3,
};

/**
 * Validate an itinerary for quality issues
 *
 * Checks for:
 * - Duplicate locations (error)
 * - Minimum activities per day (warning)
 * - Category diversity (warning if >50% same category)
 * - Category streaks (warning if >3 consecutive same category)
 * - Neighborhood clustering (warning if >3 consecutive same area)
 */
export function validateItinerary(
  itinerary: Itinerary,
  options: ValidationOptions = {},
): ItineraryValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const issues: ValidationIssue[] = [];

  // Themed trips (≤2 vibes) are intentionally narrow. A history buff visiting
  // Hiroshima WANTS >50% historical content. Raise the tolerance so we only
  // flag the truly monotonous cases.
  const vibeCount = options.vibeCount ?? 0;
  const sameCategoryThreshold = vibeCount > 0 && vibeCount <= 2 ? 75 : opts.maxSameCategoryPercent;
  const categoryStreakThreshold = vibeCount > 0 && vibeCount <= 2 ? 5 : opts.maxCategoryStreak;

  // Collect all activities and their location IDs
  const allActivities: Array<{ activity: ItineraryActivity; dayIndex: number }> = [];
  const locationIdCounts = new Map<string, number>();
  const allCategories: string[] = [];
  const allNeighborhoods: string[] = [];

  itinerary.days.forEach((day, dayIndex) => {
    day.activities.forEach((activity) => {
      if (activity.kind === "place") {
        allActivities.push({ activity, dayIndex });

        // Track location IDs
        if (activity.locationId) {
          const count = locationIdCounts.get(activity.locationId) ?? 0;
          locationIdCounts.set(activity.locationId, count + 1);
        }

        // Track categories from tags
        if (activity.tags && activity.tags.length > 0) {
          allCategories.push(activity.tags[0] ?? "unknown");
        }

        // Track neighborhoods
        if (activity.neighborhood) {
          allNeighborhoods.push(activity.neighborhood);
        }
      }
    });
  });

  // Check for duplicate locations (ERROR)
  const duplicateLocations: string[] = [];
  locationIdCounts.forEach((count, locationId) => {
    if (count > 1) {
      duplicateLocations.push(locationId);
      issues.push({
        severity: "error",
        code: "DUPLICATE_LOCATION",
        message: `Location "${locationId}" appears ${count} times in the itinerary`,
        locationId,
        details: { occurrences: count },
      });
    }
  });

  // Check minimum activities per day (WARNING).
  // Exclude anchor-only days (late arrival Day 1 or very early departure last
  // day are intentional, not bugs). A day with just the airport arrival
  // activity isn't "thin" — it's structural.
  itinerary.days.forEach((day, dayIndex) => {
    const placeActivities = day.activities.filter((a) => a.kind === "place");
    const nonAnchorCount = placeActivities.filter((a) => !a.isAnchor).length;
    const anchorOnly = nonAnchorCount === 0 && placeActivities.length > 0;
    if (!anchorOnly && nonAnchorCount < opts.minActivitiesPerDay) {
      issues.push({
        severity: "warning",
        code: "FEW_ACTIVITIES",
        message: `Day ${dayIndex + 1} has only ${nonAnchorCount} ${nonAnchorCount === 1 ? "activity" : "activities"} (minimum ${opts.minActivitiesPerDay} recommended)`,
        dayIndex,
        details: { activityCount: nonAnchorCount, minimum: opts.minActivitiesPerDay },
      });
    }
  });

  // Check category diversity (WARNING)
  const categoryDiversityScore = calculateCategoryDiversityScore(allCategories);
  const categoryPercentages = calculateCategoryPercentages(allCategories);
  const dominantCategory = findDominantCategory(categoryPercentages, sameCategoryThreshold);

  if (dominantCategory) {
    issues.push({
      severity: "warning",
      code: "LOW_CATEGORY_DIVERSITY",
      message: `${Math.round(dominantCategory.percentage)}% of activities are "${dominantCategory.category}" (recommend <${sameCategoryThreshold}% for variety)`,
      details: {
        dominantCategory: dominantCategory.category,
        percentage: dominantCategory.percentage,
        threshold: sameCategoryThreshold,
      },
    });
  }

  // Check category streaks (WARNING)
  const categoryStreak = detectCategoryStreak(allCategories);
  if (categoryStreak.count > categoryStreakThreshold) {
    issues.push({
      severity: "warning",
      code: "CATEGORY_STREAK",
      message: `${categoryStreak.count} consecutive "${categoryStreak.category}" activities detected (recommend max ${categoryStreakThreshold})`,
      details: {
        category: categoryStreak.category,
        streakLength: categoryStreak.count,
        maxAllowed: categoryStreakThreshold,
      },
    });
  }

  // Check neighborhood clustering (WARNING)
  const neighborhoodStreak = detectNeighborhoodStreak(allNeighborhoods);
  const neighborhoodDiversityScore = calculateNeighborhoodDiversityScore(allNeighborhoods);

  if (neighborhoodStreak.count > opts.maxNeighborhoodStreak) {
    issues.push({
      severity: "warning",
      code: "NEIGHBORHOOD_CLUSTERING",
      message: `${neighborhoodStreak.count} consecutive activities in "${neighborhoodStreak.neighborhood}" (consider exploring other areas)`,
      details: {
        neighborhood: neighborhoodStreak.neighborhood,
        streakLength: neighborhoodStreak.count,
        maxAllowed: opts.maxNeighborhoodStreak,
      },
    });
  }

  // Check for days with no activities (ERROR)
  itinerary.days.forEach((day, dayIndex) => {
    if (day.activities.length === 0) {
      issues.push({
        severity: "error",
        code: "EMPTY_DAY",
        message: `Day ${dayIndex + 1} has no activities scheduled`,
        dayIndex,
      });
    }
  });

  // Thin city warning: if a city is allocated 3+ days but has fewer than 5
  // available locations per day, the generator will run out of content and
  // produce light days. Surface this as a warning so clients and monitoring
  // can react. Same logic as TripSummaryEditorial's client-side warning but
  // lifted into the API response.
  const dayCountByCity = new Map<string, number>();
  for (const day of itinerary.days) {
    if (!day.cityId) continue;
    dayCountByCity.set(day.cityId, (dayCountByCity.get(day.cityId) ?? 0) + 1);
  }
  const THIN_CITY_MIN_DAYS = 3;
  const THIN_CITY_LOCATIONS_PER_DAY = 5;
  for (const [cityId, dayCount] of dayCountByCity) {
    if (dayCount < THIN_CITY_MIN_DAYS) continue;
    const meta = getCityMetadata(cityId);
    if (!meta) continue;
    const locationsPerDay = meta.locationCount / dayCount;
    if (locationsPerDay < THIN_CITY_LOCATIONS_PER_DAY) {
      issues.push({
        severity: "warning",
        code: "THIN_CITY",
        message: `${cityId} has ${meta.locationCount} curated locations across ${dayCount} days (≈${locationsPerDay.toFixed(1)}/day). Consider fewer days here or adding a nearby day trip.`,
        details: {
          cityId,
          locationCount: meta.locationCount,
          dayCount,
          locationsPerDay: Math.round(locationsPerDay * 10) / 10,
        },
      });
    }
  }

  // Calculate summary statistics
  const uniqueLocations = locationIdCounts.size;
  const totalActivities = allActivities.length;
  const totalDays = itinerary.days.length;
  const averageActivitiesPerDay = totalDays > 0 ? totalActivities / totalDays : 0;

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  return {
    valid: errorCount === 0,
    issues,
    summary: {
      errorCount,
      warningCount,
      infoCount,
      totalDays,
      totalActivities,
      uniqueLocations,
      duplicateLocations: duplicateLocations.length,
      averageActivitiesPerDay: Math.round(averageActivitiesPerDay * 10) / 10,
      categoryDiversityScore,
      neighborhoodDiversityScore,
    },
  };
}

/**
 * Calculate category percentages from a list of categories
 */
function calculateCategoryPercentages(categories: string[]): Map<string, number> {
  if (categories.length === 0) {
    return new Map();
  }

  const counts = new Map<string, number>();
  categories.forEach((cat) => {
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  });

  const percentages = new Map<string, number>();
  counts.forEach((count, cat) => {
    percentages.set(cat, (count / categories.length) * 100);
  });

  return percentages;
}

/**
 * Find a category that exceeds the threshold percentage
 */
function findDominantCategory(
  percentages: Map<string, number>,
  threshold: number,
): { category: string; percentage: number } | undefined {
  for (const [category, percentage] of percentages) {
    if (percentage > threshold) {
      return { category, percentage };
    }
  }
  return undefined;
}

/**
 * Calculate a 0-100 diversity score for categories
 * Higher score means more diverse
 */
function calculateCategoryDiversityScore(categories: string[]): number {
  if (categories.length === 0) {
    return 0;
  }

  const uniqueCategories = new Set(categories);
  const uniqueRatio = uniqueCategories.size / categories.length;

  // Base score from unique ratio (0-50)
  const baseScore = uniqueRatio * 50;

  // Penalty for streaks (0-30)
  const streak = detectCategoryStreak(categories);
  const streakPenalty = Math.min(30, Math.max(0, (streak.count - 2) * 10));

  // Bonus for good variety (0-50)
  let varietyBonus = 0;
  if (uniqueCategories.size >= categories.length * 0.7) {
    varietyBonus = 50;
  } else if (uniqueCategories.size >= categories.length * 0.5) {
    varietyBonus = 30;
  } else if (uniqueCategories.size >= categories.length * 0.3) {
    varietyBonus = 15;
  }

  return Math.max(0, Math.min(100, Math.round(baseScore + varietyBonus - streakPenalty)));
}

/**
 * Calculate a 0-100 diversity score for neighborhoods
 * Higher score means more geographic variety
 */
function calculateNeighborhoodDiversityScore(neighborhoods: string[]): number {
  if (neighborhoods.length === 0) {
    return 0;
  }

  const uniqueNeighborhoods = new Set(neighborhoods);
  const uniqueRatio = uniqueNeighborhoods.size / neighborhoods.length;

  // Base score from unique ratio (0-50)
  const baseScore = uniqueRatio * 50;

  // Penalty for clustering (0-30)
  const streak = detectNeighborhoodStreak(neighborhoods);
  const clusteringPenalty = Math.min(30, Math.max(0, (streak.count - 2) * 10));

  // Bonus for exploring many areas (0-50)
  let explorationBonus = 0;
  if (uniqueNeighborhoods.size >= 5) {
    explorationBonus = 50;
  } else if (uniqueNeighborhoods.size >= 3) {
    explorationBonus = 30;
  } else if (uniqueNeighborhoods.size >= 2) {
    explorationBonus = 15;
  }

  return Math.max(0, Math.min(100, Math.round(baseScore + explorationBonus - clusteringPenalty)));
}

/**
 * Quick check if itinerary has any duplicate locations
 */
export function hasDuplicateLocations(itinerary: Itinerary): boolean {
  const locationIds = new Set<string>();

  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      if (activity.kind === "place" && activity.locationId) {
        if (locationIds.has(activity.locationId)) {
          return true;
        }
        locationIds.add(activity.locationId);
      }
    }
  }

  return false;
}

/**
 * Get list of duplicate location IDs
 */
export function getDuplicateLocationIds(itinerary: Itinerary): string[] {
  const locationIdCounts = new Map<string, number>();

  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      if (activity.kind === "place" && activity.locationId) {
        const count = locationIdCounts.get(activity.locationId) ?? 0;
        locationIdCounts.set(activity.locationId, count + 1);
      }
    }
  }

  const duplicates: string[] = [];
  locationIdCounts.forEach((count, id) => {
    if (count > 1) {
      duplicates.push(id);
    }
  });

  return duplicates;
}

/**
 * Extracts all unique locationIds from an itinerary
 */
function extractLocationIds(itinerary: Itinerary): Set<string> {
  const locationIds = new Set<string>();

  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      if (activity.kind === "place" && activity.locationId) {
        locationIds.add(activity.locationId);
      }
    }
  }

  return locationIds;
}

/**
 * Validates that all locationIds in the itinerary exist in the locations table.
 * This is a soft validation - it returns warnings for missing locations
 * rather than blocking the save, since locations might be deleted.
 *
 * @param supabase - Supabase client
 * @param itinerary - The itinerary to validate
 * @returns Object with valid flag and array of missing locationIds
 */
export async function validateLocationIdsExist(
  supabase: SupabaseClient,
  itinerary: Itinerary,
): Promise<{ valid: boolean; missingIds: string[] }> {
  const locationIds = extractLocationIds(itinerary);

  if (locationIds.size === 0) {
    return { valid: true, missingIds: [] };
  }

  try {
    const { data, error } = await supabase
      .from("locations")
      .select("id")
      .in("id", Array.from(locationIds));

    if (error) {
      logger.warn("Failed to validate locationIds", { error: error.message });
      // Don't block save on validation errors
      return { valid: true, missingIds: [] };
    }

    const foundIds = new Set((data ?? []).map((row) => row.id as string));
    const missingIds = Array.from(locationIds).filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      logger.warn("Itinerary contains missing locationIds", {
        missingCount: missingIds.length,
        missingIds: missingIds.slice(0, 10), // Log first 10
      });
    }

    return {
      valid: missingIds.length === 0,
      missingIds,
    };
  } catch (error) {
    logger.warn("Error validating locationIds", {
      error: getErrorMessage(error),
    });
    // Don't block save on validation errors
    return { valid: true, missingIds: [] };
  }
}

/**
 * Full validation of an itinerary including structure and database checks.
 * Combines the synchronous structure validation with async database validation.
 *
 * @param supabase - Supabase client for database validation
 * @param itinerary - The itinerary to validate
 * @returns Combined validation result
 */
export async function validateItineraryWithDatabase(
  supabase: SupabaseClient,
  itinerary: Itinerary,
): Promise<ItineraryValidationResult> {
  // First run structure validation
  const structureResult = validateItinerary(itinerary);

  // Then check locationIds exist in database
  const locationIdResult = await validateLocationIdsExist(supabase, itinerary);

  // Add warnings for missing locationIds (not errors - don't block save)
  if (!locationIdResult.valid) {
    for (const missingId of locationIdResult.missingIds) {
      structureResult.issues.push({
        severity: "warning",
        code: "ORPHANED_LOCATION_ID",
        message: `Location with id "${missingId}" not found in database`,
        locationId: missingId,
      });
    }
    structureResult.summary.warningCount += locationIdResult.missingIds.length;
  }

  return structureResult;
}
