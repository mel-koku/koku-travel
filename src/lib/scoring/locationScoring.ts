import type { Location } from "@/types/location";
import type { InterestId, TripBuilderData } from "@/types/trip";
import type { WeatherForecast } from "@/types/weather";
import { calculateDistance, estimateTravelTime } from "@/lib/utils/geoUtils";
import { getCategoryDefaultDuration } from "@/lib/durationExtractor";
import { scoreWeatherFit } from "@/lib/weather/weatherScoring";
import { scoreTimeOfDayFit, checkOpeningHoursFit } from "./timeOptimization";
import { scoreGroupFit } from "./groupScoring";

/**
 * Criteria for scoring a location.
 */
export interface LocationScoringCriteria {
  interests: InterestId[];
  travelStyle: "relaxed" | "balanced" | "fast";
  budgetLevel?: "budget" | "moderate" | "luxury";
  budgetTotal?: number;
  budgetPerDay?: number;
  accessibility?: {
    wheelchairAccessible?: boolean;
    elevatorRequired?: boolean;
  };
  currentLocation?: { lat: number; lng: number };
  availableMinutes: number;
  recentCategories: string[];
  /**
   * Weather forecast for the date/location being scored
   */
  weatherForecast?: WeatherForecast;
  /**
   * Weather preferences
   */
  weatherPreferences?: {
    preferIndoorOnRain?: boolean;
    minTemperature?: number;
    maxTemperature?: number;
  };
  /**
   * Time slot for this activity (morning, afternoon, evening)
   */
  timeSlot?: "morning" | "afternoon" | "evening";
  /**
   * Date for this activity (ISO date string) - used for weekday calculation
   */
  date?: string;
  /**
   * Group information for group-based scoring
   */
  group?: {
    size?: number;
    type?: "solo" | "couple" | "family" | "friends" | "business";
    childrenAges?: number[];
  };
}

/**
 * Breakdown of scores for each factor.
 */
export interface ScoreBreakdown {
  interestMatch: number;
  ratingQuality: number;
  logisticalFit: number;
  budgetFit: number;
  accessibilityFit: number;
  diversityBonus: number;
  weatherFit: number;
  timeOptimization: number;
  groupFit: number;
}

/**
 * Complete scoring result for a location.
 */
export interface LocationScore {
  location: Location;
  score: number;
  breakdown: ScoreBreakdown;
  reasoning: string[];
}

/**
 * Category to interest mapping for scoring.
 */
const CATEGORY_TO_INTERESTS: Record<string, InterestId[]> = {
  shrine: ["culture", "history"],
  temple: ["culture", "history"],
  landmark: ["culture", "photography"],
  historic: ["culture", "history"],
  restaurant: ["food"],
  market: ["food", "shopping"],
  park: ["nature", "wellness", "photography"],
  garden: ["nature", "wellness", "photography"],
  bar: ["nightlife"],
  entertainment: ["nightlife"],
  shopping: ["shopping"],
  museum: ["culture", "history"],
  viewpoint: ["photography", "nature"],
};

/**
 * Interest to category mapping (reverse of above).
 */
const INTEREST_TO_CATEGORIES: Record<InterestId, string[]> = {
  culture: ["shrine", "temple", "landmark", "historic", "museum"],
  food: ["restaurant", "market"],
  nature: ["park", "garden"],
  nightlife: ["bar", "entertainment"],
  shopping: ["shopping", "market"],
  photography: ["landmark", "viewpoint", "park"],
  wellness: ["park", "garden"],
  history: ["shrine", "temple", "historic", "museum"],
};

/**
 * Score how well a location matches user interests.
 * Range: 0-30 points
 */
function scoreInterestMatch(
  location: Location,
  interests: InterestId[],
): { score: number; reasoning: string } {
  const locationCategory = location.category;
  if (!locationCategory) {
    return { score: 10, reasoning: "No category information available" };
  }

  // Find matching interests
  const matchingInterests = CATEGORY_TO_INTERESTS[locationCategory] ?? [];
  const matchedInterests = interests.filter((interest) =>
    matchingInterests.includes(interest),
  );

  if (matchedInterests.length === 0) {
    return {
      score: 5,
      reasoning: `Category "${locationCategory}" doesn't match any selected interests`,
    };
  }

  // Perfect match gets full points
  if (matchedInterests.length === interests.length) {
    return {
      score: 30,
      reasoning: `Perfect match: "${locationCategory}" aligns with all interests (${matchedInterests.join(", ")})`,
    };
  }

  // Partial match gets proportional score
  const matchRatio = matchedInterests.length / interests.length;
  const score = Math.round(15 + matchRatio * 15); // 15-30 range

  return {
    score,
    reasoning: `Partial match: "${locationCategory}" aligns with ${matchedInterests.length} of ${interests.length} interests (${matchedInterests.join(", ")})`,
  };
}

/**
 * Score location based on rating quality and review count.
 * Range: 0-25 points
 */
function scoreRatingQuality(location: Location): { score: number; reasoning: string } {
  const rating = location.rating ?? 0;
  const reviewCount = location.reviewCount ?? 0;

  // If no rating data, give neutral score
  if (rating === 0 && reviewCount === 0) {
    return {
      score: 12,
      reasoning: "No rating data available, using neutral score",
    };
  }

  // Rating component: 0-15 points (0-5 scale mapped to 0-15)
  const ratingScore = (rating / 5) * 15;

  // Review count component: 0-10 points
  // More reviews = more credible
  // Scale: 0 reviews = 0, 100 reviews = 5, 1000+ reviews = 10
  let reviewScore = 0;
  if (reviewCount > 0) {
    if (reviewCount < 10) {
      reviewScore = 2; // Very few reviews
    } else if (reviewCount < 50) {
      reviewScore = 4; // Some reviews
    } else if (reviewCount < 200) {
      reviewScore = 6; // Good number of reviews
    } else if (reviewCount < 1000) {
      reviewScore = 8; // Many reviews
    } else {
      reviewScore = 10; // Excellent credibility
    }
  }

  const totalScore = Math.round(ratingScore + reviewScore);

  return {
    score: totalScore,
    reasoning: `Rating: ${rating.toFixed(1)}/5 (${reviewCount} reviews) - ${totalScore >= 20 ? "high quality" : totalScore >= 15 ? "good quality" : "moderate quality"}`,
  };
}

/**
 * Score logistical fit (distance, duration, time slot).
 * Range: 0-20 points
 */
function scoreLogisticalFit(
  location: Location,
  criteria: LocationScoringCriteria,
): { score: number; reasoning: string } {
  let score = 10; // Base score
  const reasons: string[] = [];

  // Distance scoring (0-8 points)
  if (criteria.currentLocation && location.coordinates) {
    const distanceKm = calculateDistance(criteria.currentLocation, location.coordinates);
    const travelTime = estimateTravelTime(distanceKm, "walk");

    // Prefer nearby locations
    if (distanceKm < 1) {
      score += 8;
      reasons.push("Very close (<1km)");
    } else if (distanceKm < 3) {
      score += 6;
      reasons.push("Nearby (1-3km)");
    } else if (distanceKm < 5) {
      score += 4;
      reasons.push("Moderate distance (3-5km)");
    } else if (distanceKm < 10) {
      score += 2;
      reasons.push("Far (5-10km)");
    } else {
      score -= 2;
      reasons.push("Very far (>10km)");
    }
  } else {
    reasons.push("No distance data available");
  }

  // Duration fit (0-7 points)
  const locationDuration = getLocationDurationMinutes(location);
  const availableMinutes = criteria.availableMinutes;

  if (locationDuration <= availableMinutes * 0.3) {
    score += 2; // Too short, but acceptable
    reasons.push("Short duration, fits easily");
  } else if (locationDuration <= availableMinutes * 0.7) {
    score += 7; // Optimal duration
    reasons.push("Duration fits well in time slot");
  } else if (locationDuration <= availableMinutes * 1.1) {
    score += 4; // Slightly over, but manageable
    reasons.push("Duration slightly exceeds available time");
  } else {
    score -= 3; // Too long
    reasons.push("Duration exceeds available time significantly");
  }

  // Travel style adjustment (0-5 points)
  if (criteria.travelStyle === "fast" && locationDuration > 180) {
    score -= 2; // Penalize long activities for fast pace
    reasons.push("Too long for fast-paced travel");
  } else if (criteria.travelStyle === "relaxed" && locationDuration < 60) {
    score -= 1; // Prefer longer activities for relaxed pace
    reasons.push("Short duration for relaxed pace");
  }

  // Clamp score to 0-20 range
  score = Math.max(0, Math.min(20, score));

  return {
    score,
    reasoning: reasons.join("; "),
  };
}

/**
 * Parse price level from minBudget string.
 * Returns numeric value or symbol count.
 */
function parsePriceLevel(minBudget?: string): { level: number; type: "numeric" | "symbol" } {
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
 * Score budget fit.
 * Range: 0-10 points
 * 
 * Uses explicit budget values (total/perDay) if provided, otherwise falls back to budgetLevel.
 */
function scoreBudgetFit(
  location: Location,
  criteria: {
    budgetLevel?: "budget" | "moderate" | "luxury";
    budgetTotal?: number;
    budgetPerDay?: number;
  },
): { score: number; reasoning: string } {
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
 */
function scoreAccessibilityFit(
  location: Location,
  accessibility?: LocationScoringCriteria["accessibility"],
): { score: number; reasoning: string } {
  if (!accessibility || (!accessibility.wheelchairAccessible && !accessibility.elevatorRequired)) {
    return { score: 5, reasoning: "No accessibility requirements specified" };
  }

  const locationAccessibility = location.accessibility;

  // If no accessibility data available, give neutral score
  if (!locationAccessibility) {
    return {
      score: 5,
      reasoning: "Accessibility information not available for this location",
    };
  }

  let score = 0;
  const reasons: string[] = [];

  // Check wheelchair accessibility requirement
  if (accessibility.wheelchairAccessible) {
    if (locationAccessibility.wheelchairAccessible) {
      score += 5;
      reasons.push("Wheelchair accessible");
    } else {
      score -= 3;
      reasons.push("Not wheelchair accessible");
    }
  }

  // Check elevator requirement
  if (accessibility.elevatorRequired) {
    if (locationAccessibility.elevatorRequired) {
      score += 3;
      reasons.push("Elevator available");
    } else if (locationAccessibility.stepFreeAccess) {
      score += 2;
      reasons.push("Step-free access available (no elevator needed)");
    } else {
      score -= 2;
      reasons.push("Elevator not available");
    }
  }

  // Bonus for step-free access if wheelchair accessible is required
  if (accessibility.wheelchairAccessible && locationAccessibility.stepFreeAccess) {
    score += 2;
    reasons.push("Step-free access confirmed");
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

/**
 * Score diversity bonus (penalize category streaks).
 * Range: -5 to +5 points
 */
function scoreDiversity(
  location: Location,
  recentCategories: string[],
): { score: number; reasoning: string } {
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
 * Get location duration in minutes.
 * Reuses logic from itineraryGenerator.ts
 */
function getLocationDurationMinutes(location: Location): number {
  // Prefer structured recommendation
  if (location.recommendedVisit?.typicalMinutes) {
    return location.recommendedVisit.typicalMinutes;
  }

  // Parse estimatedDuration string
  if (location.estimatedDuration) {
    const match = location.estimatedDuration.match(/(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs)/i);
    if (match) {
      const hours = parseFloat(match[1] ?? "1");
      return Math.round(hours * 60);
    }
  }

  // Use category-based default
  if (location.category) {
    return getCategoryDefaultDuration(location.category);
  }

  // Default fallback
  return 90;
}

/**
 * Score a location based on all criteria.
 */
export function scoreLocation(
  location: Location,
  criteria: LocationScoringCriteria,
): LocationScore {
  const interestResult = scoreInterestMatch(location, criteria.interests);
  const ratingResult = scoreRatingQuality(location);
  const logisticalResult = scoreLogisticalFit(location, criteria);
  const budgetResult = scoreBudgetFit(location, {
    budgetLevel: criteria.budgetLevel,
    budgetTotal: criteria.budgetTotal,
    budgetPerDay: criteria.budgetPerDay,
  });
  const accessibilityResult = scoreAccessibilityFit(location, criteria.accessibility);
  const diversityResult = scoreDiversity(location, criteria.recentCategories);
  const weatherResult = scoreWeatherFit(location, criteria.weatherForecast, criteria.weatherPreferences);
  
  // Time-of-day optimization scoring
  const timeOptimizationResult = criteria.timeSlot
    ? scoreTimeOfDayFit(location, criteria.timeSlot, criteria.date)
    : { scoreAdjustment: 0, reasoning: "No time slot specified" };
  
  // Check opening hours fit
  const openingHoursResult = criteria.timeSlot
    ? checkOpeningHoursFit(location, criteria.timeSlot, criteria.date)
    : { fits: true, reasoning: "No time slot specified" };
  
  // Adjust time optimization score if opening hours don't fit
  const finalTimeScore = openingHoursResult.fits
    ? timeOptimizationResult.scoreAdjustment
    : timeOptimizationResult.scoreAdjustment - 5; // Penalty for closed hours
  
  // Group-based scoring
  const groupResult = scoreGroupFit(location, criteria.group);

  const breakdown: ScoreBreakdown = {
    interestMatch: interestResult.score,
    ratingQuality: ratingResult.score,
    logisticalFit: logisticalResult.score,
    budgetFit: budgetResult.score,
    accessibilityFit: accessibilityResult.score,
    diversityBonus: diversityResult.score,
    weatherFit: weatherResult.scoreAdjustment,
    timeOptimization: finalTimeScore,
    groupFit: groupResult.scoreAdjustment,
  };

  const totalScore =
    breakdown.interestMatch +
    breakdown.ratingQuality +
    breakdown.logisticalFit +
    breakdown.budgetFit +
    breakdown.accessibilityFit +
    breakdown.diversityBonus +
    breakdown.weatherFit +
    breakdown.timeOptimization +
    breakdown.groupFit;

  const reasoning = [
    interestResult.reasoning,
    ratingResult.reasoning,
    logisticalResult.reasoning,
    budgetResult.reasoning,
    accessibilityResult.reasoning,
    diversityResult.reasoning,
    weatherResult.reasoning,
    timeOptimizationResult.reasoning,
    openingHoursResult.reasoning,
    groupResult.reasoning,
  ];

  return {
    location,
    score: totalScore,
    breakdown,
    reasoning,
  };
}

