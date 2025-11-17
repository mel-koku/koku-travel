import type { InterestId } from "./trip";

/**
 * Travel pace preference
 */
export type TravelPace = "relaxed" | "balanced" | "fast";

/**
 * Budget level classification
 */
export type BudgetLevel = "budget" | "moderate" | "luxury";

/**
 * Group type classification
 */
export type GroupType = "solo" | "couple" | "family" | "friends" | "business";

/**
 * Experience level for activities
 */
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

/**
 * Weather preference for planning
 */
export type WeatherPreference = "indoor_alternatives" | "outdoor_preferred" | "no_preference";

/**
 * Comprehensive traveler profile containing all attributes needed for intelligent trip planning
 */
export type TravelerProfile = {
  /**
   * Travel pace preference (relaxed, balanced, fast)
   */
  pace: TravelPace;

  /**
   * Budget information
   */
  budget: {
    /**
     * Total trip budget in local currency (optional)
     */
    total?: number;
    /**
     * Per-day budget in local currency (optional)
     */
    perDay?: number;
    /**
     * Budget level classification
     */
    level: BudgetLevel;
  };

  /**
   * Mobility requirements
   */
  mobility: {
    /**
     * Whether mobility assistance is required
     */
    required: boolean;
    /**
     * Specific mobility needs (wheelchair access, step-free, etc.)
     */
    needs?: string[];
  };

  /**
   * Traveler interests
   */
  interests: InterestId[];

  /**
   * Group information
   */
  group: {
    /**
     * Number of travelers
     */
    size: number;
    /**
     * Type of group
     */
    type: GroupType;
    /**
     * Ages of children (if applicable)
     */
    childrenAges?: number[];
  };

  /**
   * Dietary restrictions
   */
  dietary: {
    /**
     * List of dietary restrictions
     */
    restrictions: string[];
    /**
     * Additional dietary notes
     */
    notes?: string;
  };

  /**
   * Experience level for activities
   */
  experienceLevel?: ExperienceLevel;

  /**
   * Weather preferences
   */
  weatherPreferences?: {
    /**
     * Preference for handling weather
     */
    preference: WeatherPreference;
  };
};

/**
 * Default TravelerProfile values
 */
export const DEFAULT_TRAVELER_PROFILE: TravelerProfile = {
  pace: "balanced",
  budget: {
    level: "moderate",
  },
  mobility: {
    required: false,
  },
  interests: [],
  group: {
    size: 1,
    type: "solo",
  },
  dietary: {
    restrictions: [],
  },
};

