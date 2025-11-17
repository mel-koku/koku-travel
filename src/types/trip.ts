/**
 * Defines the start and end ISO date strings used throughout the trip builder.
 */
import { INTEREST_CATEGORIES } from "@/data/interests";
import type { TravelerProfile } from "./traveler";

export type TravelDates = {
  start?: string;
  end?: string;
};

/**
 * Enumerates the pacing options for a trip. Additional options can be added in later phases.
 */

export type TripStyle = "relaxed" | "balanced" | "fast";

export type InterestId = (typeof INTEREST_CATEGORIES)[number]["id"];

export type CityId = "kyoto" | "osaka" | "nara" | "tokyo" | "yokohama";

export type RegionId = "kansai" | "kanto";

export type EntryPointType = "airport" | "city" | "hotel" | "station";

export type EntryPoint = {
  type: EntryPointType;
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  cityId?: CityId;
  placeId?: string; // Google Place ID for fetching full location details
};

/**
 * Per-day entry point configuration for start/end locations.
 */
export type DayEntryPoint = {
  startPoint?: EntryPoint;
  endPoint?: EntryPoint;
};

/**
 * Aggregates all mutable wizard fields. Future steps can extend this structure as needed.
 * 
 * Note: The TravelerProfile can be built from the individual fields using buildTravelerProfile().
 * The travelerProfile field is optional and will be populated automatically when needed.
 */
export type TripBuilderData = {
  duration?: number; // 1-14
  dates: TravelDates; // ISO yyyy-mm-dd
  regions?: RegionId[];
  cities?: CityId[];
  interests?: InterestId[]; // later steps
  style?: TripStyle; // later steps
  entryPoint?: EntryPoint;
  accessibility?: {
    mobility?: boolean;
    dietary?: string[];
    dietaryOther?: string;
    notes?: string;
  };
  /**
   * Budget information for the trip
   */
  budget?: {
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
    level?: "budget" | "moderate" | "luxury";
  };
  /**
   * Group information
   */
  group?: {
    /**
     * Number of travelers
     */
    size?: number;
    /**
     * Type of group
     */
    type?: "solo" | "couple" | "family" | "friends" | "business";
    /**
     * Ages of children (if applicable)
     */
    childrenAges?: number[];
  };
  /**
   * Weather preferences for trip planning
   */
  weatherPreferences?: {
    /**
     * Prefer indoor alternatives on rainy days
     */
    preferIndoorOnRain?: boolean;
    /**
     * Minimum temperature preference (Celsius)
     */
    minTemperature?: number;
    /**
     * Maximum temperature preference (Celsius)
     */
    maxTemperature?: number;
  };
  /**
   * Optional TravelerProfile. If not provided, will be built from other fields.
   * This allows gradual migration to the new domain model.
   */
  travelerProfile?: TravelerProfile;
};


