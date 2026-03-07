import type { Location } from "@/types/location";
import type { LocationScore } from "./locationScoring";

/**
 * Context for diversity filtering.
 */
export interface DiversityContext {
  recentCategories: string[];
  recentNeighborhoods?: string[];
  recentCuisineTypes?: string[];
  recentAtmospheres?: string[];
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
    const streakCount = countTrailingStreak(context.recentCategories, category);

    // Allow up to 2 consecutive occurrences
    return streakCount < MAX_CONSECUTIVE_SAME;
  });

  // If filtering removed all candidates, return the single best candidate
  // (lowest streak penalty) rather than all of them
  if (filtered.length === 0) {
    let best = candidates[0]!;
    for (const c of candidates) {
      const cStreak = countTrailingStreak(context.recentCategories, c.location.category ?? "");
      const bestStreak = countTrailingStreak(context.recentCategories, best.location.category ?? "");
      if (cStreak < bestStreak || (cStreak === bestStreak && c.score > best.score)) {
        best = c;
      }
    }
    return [best];
  }

  // Apply streak penalty: reduce score for categories that appeared recently
  return filtered.map((candidate) => {
    const category = candidate.location.category;
    if (!category) {
      return candidate;
    }

    const streakCount = countTrailingStreak(context.recentCategories, category);
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

const MAX_CONSECUTIVE_SAME = 2;

/**
 * Count consecutive occurrences of a value at the end of an array.
 */
function countTrailingStreak(items: string[], target: string): number {
  let count = 0;
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i] === target) count++;
    else break;
  }
  return count;
}

/**
 * Find the longest consecutive streak in an array.
 */
function findLongestStreak(items: string[]): { value: string; count: number } {
  if (items.length === 0) return { value: "", count: 0 };

  let maxStreak = 1;
  let maxValue = items[0] ?? "";
  let currentStreak = 1;
  let currentValue = items[0] ?? "";

  for (let i = 1; i < items.length; i++) {
    if (items[i] === currentValue) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        maxValue = currentValue;
      }
    } else {
      currentStreak = 1;
      currentValue = items[i] ?? "";
    }
  }

  return { value: maxValue, count: maxStreak };
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
  const streakPenalty = Math.max(0, (maxStreak - MAX_CONSECUTIVE_SAME) * 10);

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
  const { value, count } = findLongestStreak(categories);
  return { category: value, count };
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
    const categoryStreak = countTrailingStreak(recentCategories, category);
    if (categoryStreak >= MAX_CONSECUTIVE_SAME) {
      return true; // Adding this would create a streak of 3 (existing 2 + 1)
    }
  }

  // Check neighborhood diversity (max 2 consecutive same neighborhood)
  if (recentNeighborhoods && recentNeighborhoods.length > 0) {
    const neighborhood = location.neighborhood ?? location.city;
    if (neighborhood) {
      const neighborhoodStreak = countTrailingStreak(recentNeighborhoods, neighborhood);
      if (neighborhoodStreak >= MAX_CONSECUTIVE_SAME) {
        return true; // Violates if would create neighborhood streak of 3+
      }
    }
  }

  return false;
}

/**
 * Detect the longest neighborhood streak in a list.
 */
export function detectNeighborhoodStreak(
  neighborhoods: string[],
): { neighborhood: string; count: number } {
  const { value, count } = findLongestStreak(neighborhoods);
  return { neighborhood: value, count };
}

/**
 * Penalize back-to-back meals with the same cuisine type.
 * Returns a score adjustment (-3 for same, 0 otherwise).
 */
export function scoreCuisineDiversity(
  location: Location,
  recentCuisineTypes: string[],
): { scoreAdjustment: number; reasoning: string } {
  const cuisineType = location.cuisineType;
  if (!cuisineType || cuisineType === "general" || recentCuisineTypes.length === 0) {
    return { scoreAdjustment: 0, reasoning: "No cuisine type data" };
  }

  const lastCuisine = recentCuisineTypes[recentCuisineTypes.length - 1];
  if (lastCuisine === cuisineType) {
    return {
      scoreAdjustment: -3,
      reasoning: `Back-to-back ${cuisineType} meals — prefer variety`,
    };
  }

  return { scoreAdjustment: 0, reasoning: "Different cuisine type" };
}

/**
 * Boost locations with opposite atmosphere after 2 consecutive same-atmosphere activities.
 * Returns score adjustment: +5 for opposite, 0 otherwise.
 */
export function scoreAtmosphereDiversity(
  location: Location,
  recentAtmospheres: string[],
): { scoreAdjustment: number; reasoning: string } {
  if (recentAtmospheres.length < 2) {
    return { scoreAdjustment: 0, reasoning: "Not enough atmosphere data" };
  }

  const last = recentAtmospheres[recentAtmospheres.length - 1] ?? "";
  const secondLast = recentAtmospheres[recentAtmospheres.length - 2] ?? "";

  // Only apply if 2 consecutive same atmosphere
  if (!last || last !== secondLast) {
    return { scoreAdjustment: 0, reasoning: "No atmosphere streak" };
  }

  const locationAtmo = location.tags?.find((t) =>
    ["quiet", "lively", "contemplative", "neutral"].includes(t)
  );

  if (!locationAtmo) {
    return { scoreAdjustment: 0, reasoning: "No atmosphere tag" };
  }

  const OPPOSITES: Record<string, string[]> = {
    quiet: ["lively"],
    lively: ["quiet", "contemplative"],
    contemplative: ["lively"],
    neutral: [],
  };

  if (OPPOSITES[last]?.includes(locationAtmo)) {
    return {
      scoreAdjustment: 5,
      reasoning: `${locationAtmo} atmosphere balances streak of ${last}`,
    };
  }

  return { scoreAdjustment: 0, reasoning: "No atmosphere contrast" };
}

