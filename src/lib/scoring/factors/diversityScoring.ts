import type { Location } from "@/types/location";
import type { ScoringResult } from "@/lib/scoring/types";

/**
 * Score diversity bonus (penalize category streaks).
 * Range: -5 to +5 points
 */
export function scoreDiversity(
  location: Location,
  recentCategories: string[],
): ScoringResult {
  const locationCategory = location.category;
  if (!locationCategory) {
    return { score: 0, reasoning: "No category information" };
  }

  // Count how many times this category appears in recent categories
  const categoryCount = recentCategories.filter((cat) => cat === locationCategory).length;

  if (categoryCount === 0) {
    return {
      score: 5,
      reasoning: `New category "${locationCategory}" adds variety`,
    };
  } else if (categoryCount === 1) {
    return {
      score: 2,
      reasoning: `Category "${locationCategory}" appeared once recently, slight variety`,
    };
  } else if (categoryCount === 2) {
    return {
      score: -2,
      reasoning: `Category "${locationCategory}" appeared twice recently, reducing variety`,
    };
  } else {
    return {
      score: -5,
      reasoning: `Category "${locationCategory}" appeared ${categoryCount} times recently, strong penalty for repetition`,
    };
  }
}

/**
 * Score neighborhood diversity (penalize clustering in same area).
 * Range: -5 to +5 points
 *
 * When `isZoneClustered` is true the candidate pool is already constrained
 * to a walkable zone, so staying in the same neighborhood is *desirable*.
 * The scoring is inverted: same neighborhood → bonus, different → neutral.
 */
export function scoreNeighborhoodDiversity(
  location: Location,
  recentNeighborhoods: string[],
  isZoneClustered?: boolean,
): ScoringResult {
  const locationNeighborhood = location.neighborhood ?? location.city;
  if (!locationNeighborhood) {
    return { score: 0, reasoning: "No neighborhood information" };
  }

  // Count consecutive occurrences of this neighborhood at the end
  let streakCount = 0;
  for (let i = recentNeighborhoods.length - 1; i >= 0; i--) {
    if (recentNeighborhoods[i] === locationNeighborhood) {
      streakCount++;
    } else {
      break;
    }
  }

  // Zone-clustered mode: reward proximity, don't penalize same neighborhood
  if (isZoneClustered) {
    if (streakCount >= 1) {
      return {
        score: 3,
        reasoning: `Same area "${locationNeighborhood}", walkability bonus (zone-clustered)`,
      };
    }
    return {
      score: 1,
      reasoning: `Different area "${locationNeighborhood}" within zone, still close`,
    };
  }

  // Default mode: penalize clustering
  if (streakCount === 0) {
    return {
      score: 5,
      reasoning: `New area "${locationNeighborhood}" adds geographic variety`,
    };
  } else if (streakCount === 1) {
    return {
      score: 2,
      reasoning: `Second consecutive visit to "${locationNeighborhood}", acceptable`,
    };
  } else if (streakCount === 2) {
    return {
      score: -3,
      reasoning: `Third consecutive visit to "${locationNeighborhood}", consider exploring other areas`,
    };
  } else {
    return {
      score: -5,
      reasoning: `${streakCount + 1}th consecutive visit to "${locationNeighborhood}", strong clustering penalty`,
    };
  }
}
