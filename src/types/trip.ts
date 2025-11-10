/**
 * Defines the start and end ISO date strings used throughout the trip builder.
 */
export type TravelDates = {
  start?: string;
  end?: string;
};

/**
 * Enumerates the pacing options for a trip. Additional options can be added in later phases.
 */
import { INTEREST_CATEGORIES } from "@/data/interests";

export type TripStyle = "relaxed" | "balanced" | "fast";

export type InterestId = (typeof INTEREST_CATEGORIES)[number]["id"];

export type CityId = "kyoto" | "osaka" | "nara" | "tokyo" | "yokohama";

export type RegionId = "kansai" | "kanto";

/**
 * Aggregates all mutable wizard fields. Future steps can extend this structure as needed.
 */
export type TripBuilderData = {
  duration?: number; // 1-14
  dates: TravelDates; // ISO yyyy-mm-dd
  regions?: RegionId[];
  cities?: CityId[];
  interests?: InterestId[]; // later steps
  style?: TripStyle; // later steps
  accessibility?: {
    mobility?: boolean;
    dietary?: string[];
    notes?: string;
  };
};


