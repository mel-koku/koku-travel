import type { CityId, EntryPoint, RegionId } from "./trip";
import type { TravelerProfile } from "./traveler";
import type { Location } from "./location";

/**
 * Trip status
 */
export type TripStatus = "draft" | "planning" | "planned" | "active" | "completed";

/**
 * Time slot for activities
 */
export type TimeSlot = "morning" | "afternoon" | "evening";

/**
 * Recommendation reason explaining why an activity was selected.
 * 
 * Note: A similar RecommendationReason exists in itinerary.ts with flexible factors.
 * This version has structured scoring factors and is used in the domain model.
 */
export type RecommendationReason = {
  /**
   * Primary reason for this recommendation
   */
  primaryReason: string;
  /**
   * Breakdown of scoring factors
   */
  factors: {
    interest?: number;
    proximity?: number;
    budget?: number;
    accessibility?: number;
    time?: number;
    weather?: number;
    groupFit?: number;
  };
  /**
   * Alternative locations that were considered
   */
  alternativesConsidered?: string[];
};

/**
 * Alternative activity suggestion
 */
export type ActivityAlternative = {
  /**
   * Location ID for the alternative
   */
  locationId: string;
  /**
   * Location name
   */
  name: string;
  /**
   * Reason why this alternative was suggested
   */
  reason: string;
  /**
   * Score for this alternative
   */
  score: number;
};

/**
 * Constraints for a trip day
 */
export type DayConstraints = {
  /**
   * Nap windows for children (time ranges in HH:MM format)
   */
  napWindows?: Array<{ start: string; end: string }>;
  /**
   * Mobility limits (e.g., max walking distance)
   */
  mobilityLimits?: {
    maxWalkingDistance?: number; // in meters
    requiresElevator?: boolean;
    stepFreeAccess?: boolean;
  };
  /**
   * Rest gaps required between activities (in minutes)
   */
  restGaps?: number;
};

/**
 * Tips for an activity
 */
export type ActivityTip = {
  /**
   * Tip text
   */
  text: string;
  /**
   * Priority level
   */
  priority: "high" | "medium" | "low";
  /**
   * Category of tip (crowd avoidance, photo times, local secrets, weather backups)
   */
  category: "crowd" | "photo" | "local" | "weather" | "general";
};

/**
 * A single activity in a trip day
 */
export type TripActivity = {
  /**
   * Unique identifier for this activity
   */
  id: string;
  /**
   * Reference to the location
   */
  locationId: string;
  /**
   * Location details (can be populated from cache or API)
   */
  location?: Location;
  /**
   * Time slot for this activity
   */
  timeSlot: TimeSlot;
  /**
   * Duration in minutes
   */
  duration: number;
  /**
   * Start time (HH:MM format)
   */
  startTime?: string;
  /**
   * End time (HH:MM format)
   */
  endTime?: string;
  /**
   * Alternative activities if this one is unavailable
   */
  alternatives?: ActivityAlternative[];
  /**
   * Reasoning for this recommendation
   */
  reasoning?: RecommendationReason;
  /**
   * Tips for this activity
   */
  tips?: ActivityTip[];
  /**
   * Meal type if this is a meal activity
   */
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";
};

/**
 * A single day in a trip
 */
export type TripDay = {
  /**
   * Unique identifier for this day
   */
  id: string;
  /**
   * Date in ISO format (YYYY-MM-DD)
   */
  date: string;
  /**
   * Primary city for this day
   */
  cityId: CityId;
  /**
   * Activities scheduled for this day
   */
  activities: TripActivity[];
  /**
   * Constraints for this day
   */
  constraints?: DayConstraints;
  /**
   * Explanation text for the day's plan
   */
  explanation?: string;
};

/**
 * Normalized Trip domain model
 */
export type Trip = {
  /**
   * Unique identifier for this trip
   */
  id: string;
  /**
   * Traveler profile for this trip
   */
  travelerProfile: TravelerProfile;
  /**
   * Trip dates
   */
  dates: {
    start: string; // ISO date string
    end: string; // ISO date string
  };
  /**
   * Selected regions
   */
  regions: RegionId[];
  /**
   * Selected cities
   */
  cities: CityId[];
  /**
   * Entry point for the trip
   */
  entryPoint?: EntryPoint;
  /**
   * Trip status
   */
  status: TripStatus;
  /**
   * Days of the trip
   */
  days: TripDay[];
  /**
   * Created timestamp
   */
  createdAt?: string;
  /**
   * Updated timestamp
   */
  updatedAt?: string;
};

