import type { Location } from "@/types/location";
import type { InterestId } from "@/types/trip";
import type { WeatherForecast } from "@/types/weather";
import { calculateDistance } from "@/lib/utils/geoUtils";
import { getCategoryDefaultDuration } from "@/lib/durationExtractor";
import { scoreWeatherFit } from "@/lib/weather/weatherScoring";
import { scoreTimeOfDayFit, checkOpeningHoursFit } from "./timeOptimization";
import { scoreGroupFit } from "./groupScoring";
import { MONTH_TO_SEASON_TAGS } from "@/lib/utils/seasonUtils";
import { getCrowdLevel } from "@/data/crowdPatterns";
import { getPhotoTiming, isPhotoOptimalTime } from "@/data/photoSpotTiming";
import { hasGoshuin, isNotableGoshuin } from "@/data/goshuinData";
import { DIETARY_CATEGORIES as DIETARY_CATEGORIES_LIST } from "@/data/mealCategories";

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
   * Recent neighborhoods visited (for geographic diversity scoring)
   */
  recentNeighborhoods?: string[];
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
  /**
   * Current interest being rotated — gives a +10 bonus to locations
   * whose category matches this specific interest.
   */
  currentInterest?: InterestId;
  /**
   * Trip month (1-12) for seasonal tag scoring.
   */
  tripMonth?: number;
  /**
   * Location IDs from a guide/experience content context.
   * Locations in this set get a +20 scoring boost.
   */
  contentLocationIds?: Set<string>;
  /**
   * When true, the candidate pool is already zone-clustered.
   * Inverts neighborhood diversity scoring to reward proximity instead of penalizing it.
   */
  isZoneClustered?: boolean;
  /**
   * Accommodation style. When "ryokan", onsen/garden/nature/wellness get +5 bonus.
   */
  accommodationStyle?: "hotel" | "ryokan" | "hostel" | "mix";
  /**
   * Community ratings map (locationId → avg rating 1-5).
   * Blended with Google rating at 70/30 when present.
   */
  communityRatings?: Map<string, number>;
  /**
   * LLM-derived category weight multipliers (0.5-2.0).
   * Applied as a multiplier on the interest match score.
   */
  categoryWeights?: Record<string, number>;
  /**
   * Dietary restrictions (e.g. "vegetarian", "vegan", "halal", "gluten-free").
   * Used as a soft scoring factor for food categories.
   */
  dietaryRestrictions?: string[];
  /**
   * Whether the current day falls on a weekend (for crowd scoring).
   */
  isWeekend?: boolean;
  /**
   * Whether the user selected a photography-related vibe.
   * Enables photo timing scoring bonus.
   */
  hasPhotographyVibe?: boolean;
  /**
   * Whether the user wants to collect goshuin (temple stamps).
   * Boosts temples/shrines with notable goshuin.
   */
  collectGoshuin?: boolean;
  /**
   * Preferred tags from AI intent extraction (e.g. ["quiet", "outdoor"]).
   * Each overlapping tag = +2, capped at +8.
   */
  preferredTags?: string[];
  /**
   * Whether the user selected the "local_secrets" vibe.
   * Gives all hidden gems a flat bonus regardless of tag match,
   * because the vibe selection itself is intent signal enough.
   */
  hasLocalSecretsVibe?: boolean;
  /**
   * Whether the user selected the "nature_adventure" vibe.
   * Combined with relaxed pace and nature-ish categories,
   * extends the distance threshold from 50km to 75km so rural
   * waterfalls, coastal hikes, and remote onsen can appear.
   */
  hasNatureAdventureVibe?: boolean;
  /**
   * Whether the user selected the "history_buff" or "temples_tradition" vibe.
   * UNESCO World Heritage Sites get a scoring boost when these vibes are active.
   */
  hasHeritageVibe?: boolean;
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
  neighborhoodDiversity: number;
  weatherFit: number;
  timeOptimization: number;
  groupFit: number;
  seasonalFit: number;
  contentFit: number;
  dietaryFit: number;
  crowdFit: number;
  photoFit: number;
  tagMatch: number;
  goshuinFit: number;
  accommodationBonus: number;
  /** UNESCO World Heritage Site bonus (0-10) */
  unescoBonus: number;
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
 *
 * Maps location categories to user interests for scoring relevance.
 * Includes both specific categories (shrine, temple, museum) and
 * generic fallback categories (culture, food, nature) for backwards
 * compatibility with legacy data.
 */
const CATEGORY_TO_INTERESTS: Record<string, InterestId[]> = {
  // Specific categories (preferred)
  shrine: ["culture", "history"],
  temple: ["culture", "history"],
  landmark: ["culture", "photography"],
  historic: ["culture", "history"],
  restaurant: ["food"],
  cafe: ["food"],
  market: ["food", "shopping"],
  park: ["nature", "wellness", "photography"],
  garden: ["nature", "wellness", "photography"],
  bar: ["nightlife"],
  onsen: ["wellness", "nature"],
  entertainment: ["nightlife"],
  shopping: ["shopping"],
  museum: ["craft", "culture", "history"],
  viewpoint: ["photography", "nature"],
  nature: ["nature", "photography", "wellness"],
  castle: ["culture", "history"],
  theater: ["culture", "nightlife"],
  aquarium: ["nature"],
  zoo: ["nature"],
  beach: ["nature", "photography"],
  historic_site: ["history", "culture"],
  craft: ["craft", "culture", "shopping"],

  // Generic fallback categories (for legacy data)
  // These map to broad interests when specific category is unknown
  culture: ["culture", "history"],
  view: ["photography", "nature"],
};


/**
 * Score how well a location matches user interests.
 * Range: 0-40 points (base 0-30 + up to 10 rotation bonus)
 */
function scoreInterestMatch(
  location: Location,
  interests: InterestId[],
  currentInterest?: InterestId,
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

  let score: number;
  let reasoning: string;

  if (matchedInterests.length === 0) {
    score = 5;
    reasoning = `Category "${locationCategory}" doesn't match any selected interests`;
  } else if (matchedInterests.length === interests.length) {
    // Perfect match gets full points
    score = 30;
    reasoning = `Perfect match: "${locationCategory}" aligns with all interests (${matchedInterests.join(", ")})`;
  } else {
    // Partial match gets proportional score
    const matchRatio = matchedInterests.length / interests.length;
    score = Math.round(15 + matchRatio * 15); // 15-30 range
    reasoning = `Partial match: "${locationCategory}" aligns with ${matchedInterests.length} of ${interests.length} interests (${matchedInterests.join(", ")})`;
  }

  // Rotation bonus: +10 when the location's category matches the current
  // rotation interest. This favors the interest being rotated without
  // overwhelming rating (0-25) or logistical fit (-100 to 20).
  if (currentInterest && matchingInterests.includes(currentInterest)) {
    score += 10;
    reasoning += ` +rotation bonus for "${currentInterest}"`;
  }

  return { score, reasoning };
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
function scoreRatingQuality(
  location: Location,
  communityRatings?: Map<string, number>,
): { score: number; reasoning: string } {
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
 * Score logistical fit (distance, duration, time slot).
 * Range: -100 to 20 points
 *
 * IMPORTANT: Locations >50km away receive a hard penalty of -100 to effectively
 * exclude them from selection. This prevents cross-region recommendations where
 * a location's city field may be incorrect (e.g., "Osaka" location actually in Okinawa).
 */
function scoreLogisticalFit(
  location: Location,
  criteria: LocationScoringCriteria,
): { score: number; reasoning: string } {
  let score = 10; // Base score
  const reasons: string[] = [];

  // Distance scoring with hard cutoffs and stronger penalties
  if (criteria.currentLocation && location.coordinates) {
    const distanceKm = calculateDistance(criteria.currentLocation, location.coordinates);

    // Contextual distance threshold: nature/outdoor locations get extended
    // range when the traveler selected nature_adventure or local_secrets vibes
    // with a relaxed pace. A guide wouldn't skip Shirakami Sanchi (60km from
    // Aomori) for a nature lover with time to spare.
    const EXTENDED_RANGE_CATEGORIES = new Set(["nature", "park", "beach", "viewpoint", "onsen", "craft"]);
    const useExtendedRange =
      (criteria.hasNatureAdventureVibe || criteria.hasLocalSecretsVibe) &&
      criteria.travelStyle === "relaxed" &&
      location.category != null &&
      EXTENDED_RANGE_CATEGORIES.has(location.category);
    const hardCutoffKm = useExtendedRange ? 75 : 50;

    // CRITICAL: Hard cutoff for locations way too far away
    // This catches data corruption where locations have wrong city assignments
    if (distanceKm > hardCutoffKm) {
      // Return immediately with hard penalty - this location should not be selected
      return {
        score: -100,
        reasoning: `Location is ${distanceKm.toFixed(1)}km away - outside acceptable range (max ${hardCutoffKm}km).${useExtendedRange ? "" : " May indicate incorrect city assignment."}`,
      };
    }

    // Graduated distance scoring with stronger penalties for far locations
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
      score += 1;
      reasons.push("Far (5-10km)");
    } else if (distanceKm < 20) {
      score -= 5;
      reasons.push(`Far away (${distanceKm.toFixed(1)}km) - consider closer options`);
    } else if (distanceKm < 50) {
      score -= 15;
      reasons.push(`Very far (${distanceKm.toFixed(1)}km) - significant travel required`);
    } else if (distanceKm < 75) {
      // Extended range band: steep penalty so closer alternatives still win,
      // but the location can survive if interest/rating/tag scores are strong
      score -= 25;
      reasons.push(`Extended range (${distanceKm.toFixed(1)}km) - nature/adventure day trip`);
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

  // Clamp score to -100 to 20 range (negative values for hard penalties)
  score = Math.max(-100, Math.min(20, score));

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
 * Uses Google Places priceLevel (0-4) if available, otherwise falls back to minBudget parsing.
 * priceLevel: 0 = Free, 1 = Inexpensive, 2 = Moderate, 3 = Expensive, 4 = Very Expensive
 */
function scoreBudgetFit(
  location: Location,
  criteria: {
    budgetLevel?: "budget" | "moderate" | "luxury";
    budgetTotal?: number;
    budgetPerDay?: number;
  },
): { score: number; reasoning: string } {
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
function scoreAccessibilityFit(
  location: Location,
  accessibility?: LocationScoringCriteria["accessibility"],
): { score: number; reasoning: string } {
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
 * Score neighborhood diversity (penalize clustering in same area).
 * Range: -5 to +5 points
 *
 * When `isZoneClustered` is true the candidate pool is already constrained
 * to a walkable zone, so staying in the same neighborhood is *desirable*.
 * The scoring is inverted: same neighborhood → bonus, different → neutral.
 */
function scoreNeighborhoodDiversity(
  location: Location,
  recentNeighborhoods: string[],
  isZoneClustered?: boolean,
): { score: number; reasoning: string } {
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
        reasoning: `Same area "${locationNeighborhood}" — walkability bonus (zone-clustered)`,
      };
    }
    return {
      score: 1,
      reasoning: `Different area "${locationNeighborhood}" within zone — still close`,
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
 * Score seasonal match: +5 when location has a seasonal tag matching the trip month,
 * -3 when location has a seasonal tag that doesn't match, 0 for year-round.
 */
function scoreSeasonalMatch(
  location: Location,
  tripMonth?: number,
): { scoreAdjustment: number; reasoning: string } {
  if (!tripMonth || !location.tags) {
    return { scoreAdjustment: 0, reasoning: "No seasonal data" };
  }

  const seasonalTags = location.tags.filter((t) =>
    ["cherry-blossom", "autumn-foliage", "winter-illumination", "summer-flowers",
      "winter-festival", "summer-festival", "plum-blossom", "festival", "seasonal"].includes(t)
  );

  if (seasonalTags.length === 0 || location.tags.includes("year-round")) {
    return { scoreAdjustment: 0, reasoning: "Year-round location" };
  }

  const matchingTags = MONTH_TO_SEASON_TAGS[tripMonth] ?? [];
  const hasMatch = seasonalTags.some((t) => matchingTags.includes(t));

  if (hasMatch) {
    return {
      scoreAdjustment: 5,
      reasoning: `Seasonal match: ${seasonalTags.join(", ")} in month ${tripMonth}`,
    };
  }

  return {
    scoreAdjustment: -3,
    reasoning: `Out of season: ${seasonalTags.join(", ")} not ideal in month ${tripMonth}`,
  };
}

/**
 * Score content fit: +10 when the location is referenced by a guide or experience.
 */
function scoreContentFit(
  location: Location,
  contentLocationIds?: Set<string>,
): { score: number; reasoning: string } {
  if (!contentLocationIds || contentLocationIds.size === 0) {
    return { score: 0, reasoning: "" };
  }
  if (contentLocationIds.has(location.id)) {
    return { score: 10, reasoning: "Featured in editorial content" };
  }
  return { score: 0, reasoning: "" };
}

/**
 * Food-related categories where dietary preferences apply.
 */
const DIETARY_CATEGORIES = new Set<string>(DIETARY_CATEGORIES_LIST);

/**
 * Score dietary fit for food locations.
 * Range: -5 to +5 points. Non-food categories always return 0.
 *
 * Only `servesVegetarianFood` has real Google Places data backing.
 * Other restrictions (halal, kosher, gluten-free) return neutral (0)
 * because we have no location data to match against.
 */
function scoreDietaryFit(
  location: Location,
  dietaryRestrictions?: string[],
): { score: number; reasoning: string } {
  if (!dietaryRestrictions || dietaryRestrictions.length === 0) {
    return { score: 0, reasoning: "" };
  }

  const category = location.category?.toLowerCase() ?? "";
  if (!DIETARY_CATEGORIES.has(category)) {
    return { score: 0, reasoning: "" };
  }

  const restrictions = dietaryRestrictions.map((r) => r.toLowerCase());
  const needsVegetarian = restrictions.includes("vegetarian") || restrictions.includes("vegan");

  if (needsVegetarian) {
    const serves = location.dietaryOptions?.servesVegetarianFood;
    if (serves === true) {
      return { score: 5, reasoning: "Serves vegetarian food" };
    }
    if (serves === false) {
      return { score: -5, reasoning: "No vegetarian options reported" };
    }
    // No data — stay neutral, don't penalize missing info
    return { score: 0, reasoning: "Vegetarian options unknown" };
  }

  // Other restrictions (halal, kosher, GF) — no location data to match
  return { score: 0, reasoning: "" };
}

/**
 * Score crowd fit — prefer less crowded times, penalize peak crowds.
 * Range: -8 to +8 points
 */
function scoreCrowdFit(
  location: Location,
  criteria: LocationScoringCriteria,
): { score: number; reasoning: string } {
  if (!criteria.timeSlot || !location.category) {
    return { score: 0, reasoning: "" };
  }

  // Map time slot to approximate hour
  const SLOT_TO_HOUR: Record<string, number> = {
    morning: 9,
    afternoon: 14,
    evening: 19,
  };
  const hour = SLOT_TO_HOUR[criteria.timeSlot] ?? 12;

  // Parse date for weekend/holiday detection
  let month: number | undefined;
  let dayOfMonth: number | undefined;
  if (criteria.date) {
    const parts = criteria.date.split("-");
    month = parseInt(parts[1] ?? "0", 10);
    dayOfMonth = parseInt(parts[2] ?? "0", 10);
  }

  const crowdLevel = getCrowdLevel(location.category, hour, {
    locationId: location.id,
    month,
    day: dayOfMonth,
    isWeekend: criteria.isWeekend,
  });

  // Score: low crowds = bonus, high crowds = penalty
  if (crowdLevel <= 1) return { score: 8, reasoning: "Very low crowds expected" };
  if (crowdLevel === 2) return { score: 4, reasoning: "Light crowds expected" };
  if (crowdLevel === 3) return { score: 0, reasoning: "Moderate crowds expected" };
  if (crowdLevel === 4) return { score: -4, reasoning: "Busy — consider off-peak timing" };
  return { score: -8, reasoning: "Peak crowds — expect long queues" };
}

/**
 * Score photo timing fit — bonus when activity is scheduled at optimal photo time.
 * Range: 0 to +5 points. Only active when photography vibe is selected.
 */
function scorePhotoFit(
  location: Location,
  criteria: LocationScoringCriteria,
): { score: number; reasoning: string } {
  if (!criteria.hasPhotographyVibe || !criteria.timeSlot) {
    return { score: 0, reasoning: "" };
  }

  const timing = getPhotoTiming(location.id, location.category);
  if (!timing) {
    return { score: 0, reasoning: "" };
  }

  // Map time slot to approximate hour
  const SLOT_TO_HOUR: Record<string, number> = {
    morning: 8,
    afternoon: 15,
    evening: 18,
  };
  const hour = SLOT_TO_HOUR[criteria.timeSlot] ?? 12;

  if (isPhotoOptimalTime(hour, timing.bestTimes)) {
    const tipNote = timing.tip ? ` — ${timing.tip}` : "";
    return {
      score: 5,
      reasoning: `Optimal photo time for ${location.name}${tipNote}`,
    };
  }

  return { score: 0, reasoning: "" };
}

/**
 * Score goshuin (temple stamp) availability — bonus for temples/shrines
 * when collectGoshuin is enabled.
 * Range: 0 to +5 points.
 */
function scoreGoshuinFit(
  location: Location,
  collectGoshuin?: boolean,
): { score: number; reasoning: string } {
  if (!collectGoshuin) {
    return { score: 0, reasoning: "" };
  }

  const GOSHUIN_CATEGORIES = new Set(["temple", "shrine"]);
  if (!location.category || !GOSHUIN_CATEGORIES.has(location.category)) {
    return { score: 0, reasoning: "" };
  }

  if (isNotableGoshuin(location.id)) {
    return { score: 5, reasoning: "Notable goshuin available" };
  }

  if (hasGoshuin(location.id)) {
    return { score: 3, reasoning: "Goshuin available" };
  }

  return { score: 0, reasoning: "" };
}

/**
 * Score tag overlap between location tags and AI-extracted preferred tags.
 * Range: 0 to +25 points (+5 per matching tag, capped at 5 tags).
 *
 * Tags represent what the user explicitly asked for via vibes and notes.
 * A location that matches 3+ user-preference tags is a strong fit regardless
 * of star rating, so tag weight should compete with rating quality (0-20).
 */
function scoreTagMatch(
  location: Location,
  preferredTags?: string[],
): { score: number; reasoning: string } {
  if (!preferredTags || preferredTags.length === 0 || !location.tags || location.tags.length === 0) {
    return { score: 0, reasoning: "" };
  }

  const locationTagSet = new Set(location.tags.map((t) => t.toLowerCase()));
  const matches = preferredTags.filter((t) => locationTagSet.has(t.toLowerCase()));

  if (matches.length === 0) {
    return { score: 0, reasoning: "" };
  }

  const score = Math.min(matches.length * 5, 25);
  return {
    score,
    reasoning: `Tag match: ${matches.join(", ")} (+${score})`,
  };
}

/**
 * Score a location based on all criteria.
 */
export function scoreLocation(
  location: Location,
  criteria: LocationScoringCriteria,
): LocationScore {
  const rawInterestResult = scoreInterestMatch(location, criteria.interests, criteria.currentInterest);

  // Apply LLM-derived category weight multiplier
  const categoryWeight = criteria.categoryWeights && location.category
    ? criteria.categoryWeights[location.category.toLowerCase()] ?? 1.0
    : 1.0;
  const interestResult = categoryWeight !== 1.0
    ? {
        score: Math.round(rawInterestResult.score * categoryWeight),
        reasoning: `${rawInterestResult.reasoning} (×${categoryWeight.toFixed(1)} weight)`,
      }
    : rawInterestResult;

  const ratingResult = scoreRatingQuality(location, criteria.communityRatings);
  const logisticalResult = scoreLogisticalFit(location, criteria);
  const budgetResult = scoreBudgetFit(location, {
    budgetLevel: criteria.budgetLevel,
    budgetTotal: criteria.budgetTotal,
    budgetPerDay: criteria.budgetPerDay,
  });
  const accessibilityResult = scoreAccessibilityFit(location, criteria.accessibility);
  const diversityResult = scoreDiversity(location, criteria.recentCategories);
  const neighborhoodResult = scoreNeighborhoodDiversity(location, criteria.recentNeighborhoods ?? [], criteria.isZoneClustered);
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

  // Seasonal scoring
  const seasonalResult = scoreSeasonalMatch(location, criteria.tripMonth);

  // Content fit scoring (guide/experience editorial boost)
  const contentResult = scoreContentFit(location, criteria.contentLocationIds);

  // Dietary fit scoring (soft factor for food categories)
  const dietaryResult = scoreDietaryFit(location, criteria.dietaryRestrictions);

  // Crowd fit scoring
  const crowdResult = scoreCrowdFit(location, criteria);

  // Photo timing fit scoring
  const photoResult = scorePhotoFit(location, criteria);

  // Goshuin fit scoring
  const goshuinResult = scoreGoshuinFit(location, criteria.collectGoshuin);

  // Tag match scoring (AI intent preferred tags)
  const tagMatchResult = scoreTagMatch(location, criteria.preferredTags);

  // Hidden gem scoring: two layers
  // 1. Unconditional +5 when user selected "local_secrets" vibe — the vibe
  //    selection itself is intent signal. A guide doesn't need tag overlap
  //    to recommend a special place to someone who asked for discoveries.
  // 2. Additional +8 when the gem also matches 2+ preferred tags — rewards
  //    alignment between the hidden gem and specific user preferences.
  const localSecretsBonus = (
    location.isHiddenGem && criteria.hasLocalSecretsVibe
  ) ? 5 : 0;
  const hiddenGemTagBonus = (
    location.isHiddenGem &&
    tagMatchResult.score >= 10 // At least 2 matching tags
  ) ? 8 : 0;
  const hiddenGemBonus = localSecretsBonus + hiddenGemTagBonus;

  // Accommodation style bonus: ryokan guests prefer onsen/garden/nature/wellness
  const RYOKAN_BONUS_CATEGORIES = new Set(["onsen", "garden", "nature", "wellness"]);
  const accommodationBonus = (
    criteria.accommodationStyle === "ryokan" &&
    location.category &&
    RYOKAN_BONUS_CATEGORIES.has(location.category)
  ) ? 5 : 0;

  // UNESCO World Heritage Site bonus
  // Unconditional +3 for all UNESCO sites (baseline cultural significance).
  // Additional +7 when the user selected history_buff or temples_tradition vibes.
  const unescoBaseBonus = location.isUnescoSite ? 3 : 0;
  const unescoVibeBonus = (location.isUnescoSite && criteria.hasHeritageVibe) ? 7 : 0;
  const unescoBonus = unescoBaseBonus + unescoVibeBonus;

  const breakdown: ScoreBreakdown = {
    interestMatch: interestResult.score,
    ratingQuality: ratingResult.score,
    logisticalFit: logisticalResult.score,
    budgetFit: budgetResult.score,
    accessibilityFit: accessibilityResult.score,
    diversityBonus: diversityResult.score,
    neighborhoodDiversity: neighborhoodResult.score,
    weatherFit: weatherResult.scoreAdjustment,
    timeOptimization: finalTimeScore,
    groupFit: groupResult.scoreAdjustment,
    seasonalFit: seasonalResult.scoreAdjustment,
    contentFit: contentResult.score,
    dietaryFit: dietaryResult.score,
    crowdFit: crowdResult.score,
    photoFit: photoResult.score,
    tagMatch: tagMatchResult.score,
    goshuinFit: goshuinResult.score,
    accommodationBonus,
    unescoBonus,
  };

  const totalScore =
    breakdown.interestMatch +
    breakdown.ratingQuality +
    breakdown.logisticalFit +
    breakdown.budgetFit +
    breakdown.accessibilityFit +
    breakdown.diversityBonus +
    breakdown.neighborhoodDiversity +
    breakdown.weatherFit +
    breakdown.timeOptimization +
    breakdown.groupFit +
    breakdown.seasonalFit +
    breakdown.contentFit +
    breakdown.dietaryFit +
    breakdown.crowdFit +
    breakdown.photoFit +
    breakdown.tagMatch +
    breakdown.goshuinFit +
    accommodationBonus +
    hiddenGemBonus +
    unescoBonus;

  const reasoning = [
    interestResult.reasoning,
    ratingResult.reasoning,
    logisticalResult.reasoning,
    budgetResult.reasoning,
    accessibilityResult.reasoning,
    diversityResult.reasoning,
    neighborhoodResult.reasoning,
    weatherResult.reasoning,
    timeOptimizationResult.reasoning,
    openingHoursResult.reasoning,
    groupResult.reasoning,
    seasonalResult.reasoning,
    ...(contentResult.reasoning ? [contentResult.reasoning] : []),
    ...(dietaryResult.reasoning ? [dietaryResult.reasoning] : []),
    ...(crowdResult.reasoning ? [crowdResult.reasoning] : []),
    ...(photoResult.reasoning ? [photoResult.reasoning] : []),
    ...(tagMatchResult.reasoning ? [tagMatchResult.reasoning] : []),
    ...(goshuinResult.reasoning ? [goshuinResult.reasoning] : []),
    ...(localSecretsBonus > 0 ? [`Hidden gem + local_secrets vibe: +${localSecretsBonus}`] : []),
    ...(hiddenGemTagBonus > 0 ? [`Hidden gem + tag preference match: +${hiddenGemTagBonus}`] : []),
    ...(unescoBaseBonus > 0 ? [`UNESCO World Heritage Site: +${unescoBaseBonus}`] : []),
    ...(unescoVibeBonus > 0 ? [`UNESCO + heritage vibe: +${unescoVibeBonus}`] : []),
    ...(accommodationBonus > 0 ? [`Ryokan stay bonus: +${accommodationBonus} for ${location.category}`] : []),
  ];

  return {
    location,
    score: totalScore,
    breakdown,
    reasoning,
  };
}

