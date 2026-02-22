import type { Location } from "@/types/location";
import type { UserPreferences } from "@/types/userPreferences";
import { loadUserPreferences } from "./preferenceStorage";

/**
 * Get preference score for a location category
 */
export function getCategoryPreferenceScore(
  category: string,
  preferences?: UserPreferences,
): number {
  const prefs = preferences ?? loadUserPreferences();
  return prefs.preferredCategories[category] ?? 0;
}

/**
 * Get preference score for a price range
 */
export function getPriceRangePreferenceScore(
  priceRange: string,
  preferences?: UserPreferences,
): number {
  const prefs = preferences ?? loadUserPreferences();
  return prefs.preferredPriceRanges[priceRange] ?? 0;
}

/**
 * Check if a location was previously replaced
 */
export function wasLocationReplaced(
  locationId: string,
  preferences?: UserPreferences,
): boolean {
  const prefs = preferences ?? loadUserPreferences();
  return prefs.replacedActivities.some((a) => a.locationId === locationId);
}

/**
 * Check if a location was previously skipped
 */
export function wasLocationSkipped(
  locationId: string,
  preferences?: UserPreferences,
): boolean {
  const prefs = preferences ?? loadUserPreferences();
  return prefs.skippedActivities.some((a) => a.locationId === locationId);
}

/**
 * Check if a location is saved
 */
export function isLocationSaved(
  locationId: string,
  preferences?: UserPreferences,
): boolean {
  const prefs = preferences ?? loadUserPreferences();
  return prefs.savedActivities.some((a) => a.locationId === locationId);
}

/**
 * Calculate overall preference score for a location
 * Returns a score from -5 to +5 based on user behavior
 */
export function calculateLocationPreferenceScore(
  location: Location,
  preferences?: UserPreferences,
): number {
  const prefs = preferences ?? loadUserPreferences();
  let score = 0;

  // Check if location was saved (strong positive)
  if (isLocationSaved(location.id, prefs)) {
    score += 3;
  }

  // Check if location was replaced (negative)
  if (wasLocationReplaced(location.id, prefs)) {
    score -= 2;
  }

  // Check if location was skipped (negative)
  if (wasLocationSkipped(location.id, prefs)) {
    score -= 1;
  }

  // Category preference
  const category = location.category ?? "unknown";
  const categoryScore = getCategoryPreferenceScore(category, prefs);
  score += categoryScore * 0.5; // Scale down category preference

  // Price range preference
  const priceRange = location.minBudget ?? "moderate";
  const priceScore = getPriceRangePreferenceScore(priceRange, prefs);
  score += priceScore * 0.3; // Scale down price preference

  // Clamp score between -5 and +5
  return Math.max(-5, Math.min(5, score));
}

/**
 * Get learned preferences summary for display
 */
export function getPreferencesSummary(preferences?: UserPreferences): {
  topCategories: Array<{ category: string; score: number }>;
  topPriceRanges: Array<{ range: string; score: number }>;
} {
  const prefs = preferences ?? loadUserPreferences();

  const topCategories = Object.entries(prefs.preferredCategories)
    .map(([category, score]) => ({ category, score }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const topPriceRanges = Object.entries(prefs.preferredPriceRanges)
    .map(([range, score]) => ({ range, score }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    topCategories,
    topPriceRanges,
  };
}

