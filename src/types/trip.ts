/**
 * Defines the start and end ISO date strings used throughout the trip builder.
 */
import { INTEREST_CATEGORIES } from "@/data/interests";
import { VIBES, type VibeId as VibeIdFromData } from "@/data/vibes";
import type { TravelerProfile } from "./traveler";

/**
 * Re-export VibeId from vibes.ts for convenience.
 */
export type VibeId = VibeIdFromData;

/**
 * Valid vibe IDs set for validation.
 */
export const VALID_VIBE_IDS = new Set<VibeId>(VIBES.map((v) => v.id));

export type TravelDates = {
  start?: string;
  end?: string;
};

/**
 * Enumerates the pacing options for a trip. Additional options can be added in later phases.
 * 
 * Note: This type is semantically equivalent to TravelPace in traveler.ts but kept separate
 * as they may diverge in the future (e.g., trip-level vs traveler-level pacing).
 */
export type TripStyle = "relaxed" | "balanced" | "fast";

export type InterestId = (typeof INTEREST_CATEGORIES)[number]["id"];

/**
 * Known city IDs for static references. Dynamic cities from database
 * may have additional IDs not in this union.
 */
export type KnownCityId =
  | "kyoto" | "osaka" | "nara" | "kobe"  // Kansai
  | "tokyo" | "yokohama"                  // Kanto
  | "nagoya" | "kanazawa"                 // Chubu
  | "fukuoka" | "nagasaki"                // Kyushu
  | "sapporo" | "hakodate"                // Hokkaido
  | "sendai"                              // Tohoku
  | "hiroshima"                           // Chugoku
  | "matsuyama" | "takamatsu"             // Shikoku
  | "naha";                               // Okinawa

/**
 * City ID type that accepts both known static cities and dynamic database cities.
 * Use KnownCityId when you need strict typing for static cities.
 */
export type CityId = string;

/**
 * Known region IDs for static references.
 * Japan is divided into 9 main regions.
 */
export type KnownRegionId =
  | "kansai"    // Osaka, Kyoto, Nara, Kobe, etc.
  | "kanto"     // Tokyo, Yokohama, etc.
  | "chubu"     // Nagoya, Kanazawa, etc.
  | "kyushu"    // Fukuoka, Nagasaki, etc.
  | "hokkaido"  // Sapporo, Hakodate, etc.
  | "tohoku"    // Sendai, Aomori, etc.
  | "chugoku"   // Hiroshima, Okayama, etc.
  | "shikoku"   // Matsuyama, Takamatsu, etc.
  | "okinawa";  // Naha, Miyakojima, etc.

/**
 * Region ID type that accepts both known static regions and dynamic database regions.
 * Use KnownRegionId when you need strict typing for static regions.
 */
export type RegionId = string;

/**
 * City option returned from the /api/cities endpoint.
 * Includes location count and preview images for UI display.
 */
export type CityOption = {
  id: string;
  name: string;
  region: string;
  locationCount: number;
  previewImages: string[];
};

export type EntryPointType = "airport";

export type EntryPoint = {
  type: EntryPointType;
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  cityId?: CityId;
  iataCode?: string; // 3-letter IATA airport code
  region?: KnownRegionId; // Region the entry point belongs to
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
  vibes?: VibeId[]; // aspirational vibe selections
  regions?: RegionId[];
  cities?: CityId[];
  interests?: InterestId[]; // derived from vibes for backward compatibility
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
  /**
   * Default day start time in HH:MM format (24-hour).
   * Used as the starting point for calculating activity times.
   * Defaults to "09:00" if not specified.
   */
  dayStartTime?: string;
  /**
   * Location IDs queued from Explore page to include when generating a trip.
   * These are places the user wants to visit, added before creating a trip.
   */
  savedLocationIds?: string[];
};

/**
 * City interest data structure from pre-computed JSON.
 */
export type CityInterestCounts = {
  [interest: string]: number;
};

/**
 * Metadata for a city from the city interests data.
 */
export type CityMetadata = {
  locationCount: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
  region?: string;
};

/**
 * Complete city interests data structure.
 */
export type CityInterestsData = {
  generatedAt: string;
  totalLocations: number;
  totalCities: number;
  cities: Record<string, CityInterestCounts>;
  metadata: Record<string, CityMetadata>;
};


