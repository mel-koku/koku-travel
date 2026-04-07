import type { Location } from "@/types/location";
import type { InterestId } from "@/types/trip";
import type { WeatherForecast } from "@/types/weather";

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
   * Also extends distance threshold for cultural categories (temples, shrines, castles, historic sites).
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
  accommodationBonus: number;
  /** UNESCO World Heritage Site bonus (0-10) */
  unescoBonus: number;
  /** Hidden gem bonus (0-15) based on local_secrets vibe + tag match + iconic penalty */
  hiddenGemBonus: number;
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
 * Standard return type for scoring functions that return a score and reasoning.
 */
export interface ScoringResult {
  score: number;
  reasoning: string;
}

/**
 * Return type for scoring functions that return a score adjustment and reasoning.
 */
export interface ScoringAdjustmentResult {
  scoreAdjustment: number;
  reasoning: string;
}
