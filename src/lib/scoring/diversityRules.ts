import type { Location } from "@/types/location";
import type { LocationScore } from "./locationScoring";

/**
 * Context for diversity filtering.
 */
export interface DiversityContext {
  recentCategories: string[];
  recentNeighborhoods?: string[];
  visitedLocationIds: Set<string>;
  currentDay: number;
  energyLevel: number; // 0-100, decreases as day progresses
}

/**
 * Apply diversity filter to scored locations.
 * Filters out locations that violate diversity rules and adjusts scores.
 */
export function applyDiversityFilter(
  candidates: LocationScore[],
  context: DiversityContext,
): LocationScore[] {
  if (candidates.length === 0) {
    return candidates;
  }

  // Filter out locations that would create streaks > 2
  const filtered = candidates.filter((candidate) => {
    const category = candidate.location.category;
    if (!category) {
      return true; // Keep locations without categories
    }

    // Count consecutive occurrences of this category
    const streakCount = countCategoryStreak(context.recentCategories, category);

    // Allow up to 2 consecutive occurrences
    return streakCount < 2;
  });

  // If filtering removed all candidates, return original (better than nothing)
  if (filtered.length === 0) {
    return candidates;
  }

  // Apply streak penalty: reduce score for categories that appeared recently
  return filtered.map((candidate) => {
    const category = candidate.location.category;
    if (!category) {
      return candidate;
    }

    const streakCount = countCategoryStreak(context.recentCategories, category);
    if (streakCount > 0) {
      // Penalize repeat categories (-5 per consecutive repeat)
      return {
        ...candidate,
        score: candidate.score - streakCount * 5,
      };
    }

    return candidate;
  });
}

/**
 * Count how many times a category appears consecutively at the end of recent categories.
 */
function countCategoryStreak(recentCategories: string[], category: string): number {
  let count = 0;
  // Count from the end backwards
  for (let i = recentCategories.length - 1; i >= 0; i--) {
    if (recentCategories[i] === category) {
      count++;
    } else {
      break; // Stop at first non-matching category
    }
  }
  return count;
}

/**
 * Calculate diversity score for a set of activities.
 * Returns 0-100 score based on variety.
 */
export function calculateDiversityScore(
  activities: { category: string }[],
): number {
  if (activities.length === 0) {
    return 0;
  }

  // Count unique categories
  const uniqueCategories = new Set(activities.map((a) => a.category));
  const uniqueCount = uniqueCategories.size;
  const totalCount = activities.length;

  // Base score: ratio of unique to total
  const baseScore = (uniqueCount / totalCount) * 50;

  // Penalty for streaks
  const maxStreak = detectCategoryStreak(activities.map((a) => a.category)).count;
  const streakPenalty = Math.max(0, (maxStreak - 2) * 10); // Penalty for streaks > 2

  // Bonus for good variety
  let varietyBonus = 0;
  if (uniqueCount >= totalCount * 0.7) {
    varietyBonus = 30; // High variety
  } else if (uniqueCount >= totalCount * 0.5) {
    varietyBonus = 20; // Moderate variety
  } else if (uniqueCount >= totalCount * 0.3) {
    varietyBonus = 10; // Low variety
  }

  const finalScore = baseScore + varietyBonus - streakPenalty;
  return Math.max(0, Math.min(100, Math.round(finalScore)));
}

/**
 * Detect the longest category streak in a list of categories.
 */
export function detectCategoryStreak(
  categories: string[],
): { category: string; count: number } {
  if (categories.length === 0) {
    return { category: "", count: 0 };
  }

  let maxStreak = 1;
  let maxCategory = categories[0] ?? "";
  let currentStreak = 1;
  let currentCategory = categories[0] ?? "";

  for (let i = 1; i < categories.length; i++) {
    const category = categories[i];
    if (category === currentCategory) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        maxCategory = currentCategory;
      }
    } else {
      currentStreak = 1;
      currentCategory = category ?? "";
    }
  }

  return { category: maxCategory, count: maxStreak };
}

/**
 * Check if adding a location would violate diversity rules.
 */
export function wouldViolateDiversityRules(
  location: Location,
  recentCategories: string[],
  recentNeighborhoods?: string[],
): boolean {
  const category = location.category;
  if (category) {
    const categoryStreak = countCategoryStreak(recentCategories, category);
    if (categoryStreak >= 2) {
      return true; // Violates if would create category streak of 3+
    }
  }

  // Check neighborhood diversity (max 2 consecutive same neighborhood)
  if (recentNeighborhoods && recentNeighborhoods.length > 0) {
    const neighborhood = location.neighborhood ?? location.city;
    if (neighborhood) {
      const neighborhoodStreak = countNeighborhoodStreak(recentNeighborhoods, neighborhood);
      if (neighborhoodStreak >= 2) {
        return true; // Violates if would create neighborhood streak of 3+
      }
    }
  }

  return false;
}

/**
 * Count consecutive occurrences of a neighborhood at the end of recent neighborhoods.
 */
function countNeighborhoodStreak(recentNeighborhoods: string[], neighborhood: string): number {
  let count = 0;
  for (let i = recentNeighborhoods.length - 1; i >= 0; i--) {
    if (recentNeighborhoods[i] === neighborhood) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Detect the longest neighborhood streak in a list.
 */
export function detectNeighborhoodStreak(
  neighborhoods: string[],
): { neighborhood: string; count: number } {
  if (neighborhoods.length === 0) {
    return { neighborhood: "", count: 0 };
  }

  let maxStreak = 1;
  let maxNeighborhood = neighborhoods[0] ?? "";
  let currentStreak = 1;
  let currentNeighborhood = neighborhoods[0] ?? "";

  for (let i = 1; i < neighborhoods.length; i++) {
    const neighborhood = neighborhoods[i];
    if (neighborhood === currentNeighborhood) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        maxNeighborhood = currentNeighborhood;
      }
    } else {
      currentStreak = 1;
      currentNeighborhood = neighborhood ?? "";
    }
  }

  return { neighborhood: maxNeighborhood, count: maxStreak };
}

