import type { Location } from "@/types/location";
import type { LocationScoringCriteria, ScoringResult } from "@/lib/scoring/types";

/**
 * Parse price level from minBudget string.
 * Returns numeric value or symbol count.
 */
export function parsePriceLevel(minBudget?: string): { level: number; type: "numeric" | "symbol" } {
  if (!minBudget) {
    return { level: 0, type: "numeric" };
  }

  // Try to parse numeric value (e.g., "¥400")
  const numericMatch = minBudget.match(/¥?\s*(\d+)/);
  if (numericMatch) {
    return { level: parseInt(numericMatch[1] ?? "0", 10), type: "numeric" };
  }

  // Count symbols (e.g., "¥¥¥" = 3)
  const symbolCount = (minBudget.match(/¥/g) || []).length;
  if (symbolCount > 0) {
    return { level: symbolCount, type: "symbol" };
  }

  return { level: 0, type: "numeric" };
}

/**
 * Score location based on rating quality and review count.
 * Range: 0-20 points
 *
 * Rating acts as a quality floor, not a ranking signal. The difference
 * between 4.0 and 4.6 stars matters far less than whether a location
 * matches the traveler's preferences. A sqrt curve compresses the top
 * end so a 3.8-star hidden gem can compete with a 4.7-star tourist trap.
 *
 * Review count confirms credibility but doesn't reward popularity.
 * 50 real reviews is enough signal; 10,000 shouldn't score higher.
 */
export function scoreRatingQuality(
  location: Location,
  communityRatings?: Map<string, number>,
): ScoringResult {
  const googleRating = location.rating ?? 0;
  const reviewCount = location.reviewCount ?? 0;

  // Blend Google and community ratings (70/30 when community data exists)
  const communityRating = communityRatings?.get(location.id);
  const rating = communityRating
    ? googleRating * 0.7 + communityRating * 0.3
    : googleRating;

  // Hidden gem rating floor: if we curated it as a hidden gem, trust our
  // editorial judgment over a Google data gap. Treat null-rated hidden gems
  // as 4.0-star equivalents (score ~15) instead of neutral 10.
  // This prevents Kurokawa Onsen from losing to a random souvenir shop.
  if (rating === 0 && reviewCount === 0 && location.isHiddenGem) {
    return {
      score: 15,
      reasoning: "Curated hidden gem — editorial quality floor (no Google rating)",
    };
  }

  // If no rating data, give neutral score
  if (rating === 0 && reviewCount === 0) {
    return {
      score: 10,
      reasoning: "No rating data available, using neutral score",
    };
  }

  // Rating component: 0-14 points (sqrt curve flattens the top end)
  // sqrt(rating/5) compresses 3.5-5.0★ to just ~2.5pt spread:
  //   3.0★ = 10.8, 3.5★ = 11.7, 4.0★ = 12.5, 4.5★ = 13.3, 5.0★ = 14.0
  const ratingScore = 14 * Math.sqrt(rating / 5);

  // Review count component: 0-6 points (credibility, not popularity)
  // Enough reviews to trust the rating is the signal; 10,000 reviews
  // shouldn't outscore a genuine hidden gem with 30 reviews.
  let reviewScore = 0;
  if (reviewCount > 0) {
    if (reviewCount < 10) {
      reviewScore = 2; // Very few reviews
    } else if (reviewCount < 50) {
      reviewScore = 4; // Credible
    } else {
      reviewScore = 6; // Well-reviewed (ceiling)
    }
  }

  const totalScore = Math.round(ratingScore + reviewScore);

  const communityNote = communityRating
    ? ` (blended with community ${communityRating.toFixed(1)})`
    : "";
  return {
    score: totalScore,
    reasoning: `Rating: ${rating.toFixed(1)}/5 (${reviewCount} reviews)${communityNote} - ${totalScore >= 17 ? "high quality" : totalScore >= 13 ? "good quality" : "moderate quality"}`,
  };
}

/**
 * Score budget fit.
 * Range: 0-10 points
 *
 * Uses Google Places priceLevel (0-4) if available, otherwise falls back to minBudget parsing.
 * priceLevel: 0 = Free, 1 = Inexpensive, 2 = Moderate, 3 = Expensive, 4 = Very Expensive
 */
export function scoreBudgetFit(
  location: Location,
  criteria: {
    budgetLevel?: "budget" | "moderate" | "luxury";
    budgetTotal?: number;
    budgetPerDay?: number;
  },
): ScoringResult {
  // Prefer Google Places priceLevel (0-4) for more reliable scoring
  const googlePriceLevel = location.priceLevel;

  if (googlePriceLevel !== undefined && criteria.budgetLevel) {
    // Map budget preference to expected priceLevel ranges
    // Budget level "budget" → prefer priceLevel 0-1 (Free/Inexpensive)
    // Budget level "moderate" → prefer priceLevel 1-2 (Inexpensive/Moderate)
    // Budget level "luxury" → prefer priceLevel 3-4 (Expensive/Very Expensive)
    const priceLevelRanges: Record<"budget" | "moderate" | "luxury", { preferred: number[]; acceptable: number[]; penalty: number[] }> = {
      budget: { preferred: [0, 1], acceptable: [2], penalty: [3, 4] },
      moderate: { preferred: [1, 2], acceptable: [0, 3], penalty: [4] },
      luxury: { preferred: [3, 4], acceptable: [2], penalty: [0, 1] },
    };

    const range = priceLevelRanges[criteria.budgetLevel];
    const priceLevelLabels = ["Free", "Inexpensive ($)", "Moderate ($$)", "Expensive ($$$)", "Very Expensive ($$$$)"];
    const priceLabel = priceLevelLabels[googlePriceLevel] ?? "Unknown";

    if (range.preferred.includes(googlePriceLevel)) {
      return {
        score: 10,
        reasoning: `Price level "${priceLabel}" is ideal for ${criteria.budgetLevel} budget`,
      };
    } else if (range.acceptable.includes(googlePriceLevel)) {
      return {
        score: 7,
        reasoning: `Price level "${priceLabel}" is acceptable for ${criteria.budgetLevel} budget`,
      };
    } else if (range.penalty.includes(googlePriceLevel)) {
      // For luxury seeking budget options, it's less problematic than budget seeking luxury
      const penaltyScore = criteria.budgetLevel === "luxury" ? 5 : 2;
      return {
        score: penaltyScore,
        reasoning: `Price level "${priceLabel}" doesn't match ${criteria.budgetLevel} budget preference`,
      };
    }
  }

  // Fall back to minBudget parsing if no priceLevel available
  const priceInfo = parsePriceLevel(location.minBudget);

  // If explicit budget values are provided, use them for validation
  if (criteria.budgetPerDay !== undefined && priceInfo.type === "numeric" && priceInfo.level > 0) {
    // Check if location price fits within per-day budget
    // Allow up to 30% of daily budget for a single activity
    const maxAllowedPerActivity = criteria.budgetPerDay * 0.3;

    if (priceInfo.level <= maxAllowedPerActivity) {
      return {
        score: 10,
        reasoning: `Price (¥${priceInfo.level}) fits within daily budget (¥${criteria.budgetPerDay}, max ¥${Math.round(maxAllowedPerActivity)} per activity)`,
      };
    } else if (priceInfo.level <= criteria.budgetPerDay) {
      return {
        score: 7,
        reasoning: `Price (¥${priceInfo.level}) is within daily budget but high (¥${criteria.budgetPerDay})`,
      };
    } else {
      return {
        score: 2,
        reasoning: `Price (¥${priceInfo.level}) exceeds daily budget (¥${criteria.budgetPerDay})`,
      };
    }
  }

  if (criteria.budgetTotal !== undefined && priceInfo.type === "numeric" && priceInfo.level > 0) {
    // For total budget, we'd need to know how many activities are planned
    // For now, use a conservative estimate: assume 20 activities total
    const estimatedActivities = 20;
    const avgBudgetPerActivity = criteria.budgetTotal / estimatedActivities;

    if (priceInfo.level <= avgBudgetPerActivity) {
      return {
        score: 10,
        reasoning: `Price (¥${priceInfo.level}) fits within total budget estimate (¥${criteria.budgetTotal} total, ~¥${Math.round(avgBudgetPerActivity)} per activity)`,
      };
    } else if (priceInfo.level <= avgBudgetPerActivity * 1.5) {
      return {
        score: 7,
        reasoning: `Price (¥${priceInfo.level}) is within total budget but on the higher side`,
      };
    } else {
      return {
        score: 3,
        reasoning: `Price (¥${priceInfo.level}) may exceed total budget (¥${criteria.budgetTotal})`,
      };
    }
  }

  // Fall back to budget level if no explicit values
  if (!criteria.budgetLevel) {
    return { score: 5, reasoning: "No budget preference specified" };
  }

  const budgetLevel = criteria.budgetLevel;

  // Map budget levels to expected price ranges
  const budgetRanges = {
    budget: { min: 0, max: 1000 },
    moderate: { min: 500, max: 3000 },
    luxury: { min: 2000, max: Infinity },
  };

  const range = budgetRanges[budgetLevel];

  if (priceInfo.type === "numeric") {
    if (priceInfo.level === 0) {
      return { score: 5, reasoning: "No price information available" };
    }

    if (priceInfo.level >= range.min && priceInfo.level <= range.max) {
      return {
        score: 10,
        reasoning: `Price (¥${priceInfo.level}) fits ${budgetLevel} budget`,
      };
    } else if (priceInfo.level < range.min) {
      return {
        score: 8,
        reasoning: `Price (¥${priceInfo.level}) is below ${budgetLevel} range but acceptable`,
      };
    } else {
      return {
        score: 3,
        reasoning: `Price (¥${priceInfo.level}) exceeds ${budgetLevel} budget`,
      };
    }
  } else {
    // Symbol-based pricing (¥ = 1, ¥¥ = 2, etc.)
    const symbolRanges = {
      budget: [1, 2],
      moderate: [2, 3],
      luxury: [3, 4],
    };

    const expectedSymbols = symbolRanges[budgetLevel];
    const minSymbol = expectedSymbols[0];
    if (minSymbol !== undefined && expectedSymbols.includes(priceInfo.level)) {
      return {
        score: 10,
        reasoning: `Price level (${"¥".repeat(priceInfo.level)}) fits ${budgetLevel} budget`,
      };
    } else if (minSymbol !== undefined && priceInfo.level < minSymbol) {
      return {
        score: 8,
        reasoning: `Price level (${"¥".repeat(priceInfo.level)}) is below ${budgetLevel} range but acceptable`,
      };
    } else {
      return {
        score: 3,
        reasoning: `Price level (${"¥".repeat(priceInfo.level)}) exceeds ${budgetLevel} budget`,
      };
    }
  }
}

/**
 * Score accessibility fit.
 * Range: 0-10 points
 *
 * Uses Google Places accessibilityOptions when available:
 * - wheelchairAccessibleEntrance
 * - wheelchairAccessibleParking
 * - wheelchairAccessibleRestroom
 * - wheelchairAccessibleSeating
 */
export function scoreAccessibilityFit(
  location: Location,
  accessibility?: LocationScoringCriteria["accessibility"],
): ScoringResult {
  if (!accessibility || (!accessibility.wheelchairAccessible && !accessibility.elevatorRequired)) {
    return { score: 5, reasoning: "No accessibility requirements specified" };
  }

  // Prefer Google Places accessibilityOptions data
  const googleAccessibility = location.accessibilityOptions;
  const legacyAccessibility = location.accessibility;

  // If no accessibility data available from either source, give neutral score
  if (!googleAccessibility && !legacyAccessibility) {
    return {
      score: 5,
      reasoning: "Accessibility information not available for this location",
    };
  }

  let score = 0;
  const reasons: string[] = [];

  // Use Google Places data if available (more reliable)
  if (googleAccessibility) {
    if (accessibility.wheelchairAccessible) {
      // Check wheelchair accessible entrance (most important)
      if (googleAccessibility.wheelchairAccessibleEntrance) {
        score += 4;
        reasons.push("Wheelchair accessible entrance");
      } else {
        score -= 4;
        reasons.push("No wheelchair accessible entrance");
      }

      // Check additional wheelchair features for bonus points
      if (googleAccessibility.wheelchairAccessibleParking) {
        score += 2;
        reasons.push("Wheelchair accessible parking");
      }
      if (googleAccessibility.wheelchairAccessibleRestroom) {
        score += 2;
        reasons.push("Wheelchair accessible restroom");
      }
      if (googleAccessibility.wheelchairAccessibleSeating) {
        score += 2;
        reasons.push("Wheelchair accessible seating");
      }
    }
  } else if (legacyAccessibility) {
    // Fall back to legacy accessibility data
    if (accessibility.wheelchairAccessible) {
      if (legacyAccessibility.wheelchairAccessible) {
        score += 5;
        reasons.push("Wheelchair accessible");
      } else {
        score -= 3;
        reasons.push("Not wheelchair accessible");
      }
    }

    // Check elevator requirement
    if (accessibility.elevatorRequired) {
      if (legacyAccessibility.elevatorRequired) {
        score += 3;
        reasons.push("Elevator available");
      } else if (legacyAccessibility.stepFreeAccess) {
        score += 2;
        reasons.push("Step-free access available (no elevator needed)");
      } else {
        score -= 2;
        reasons.push("Elevator not available");
      }
    }

    // Bonus for step-free access if wheelchair accessible is required
    if (accessibility.wheelchairAccessible && legacyAccessibility.stepFreeAccess) {
      score += 2;
      reasons.push("Step-free access confirmed");
    }
  }

  // Clamp score to 0-10 range
  score = Math.max(0, Math.min(10, score));

  // If score is low, this location should be filtered out
  if (score < 3) {
    return {
      score: 0,
      reasoning: `Does not meet accessibility requirements: ${reasons.join("; ")}`,
    };
  }

  return {
    score,
    reasoning: reasons.length > 0 ? reasons.join("; ") : "Meets accessibility requirements",
  };
}
