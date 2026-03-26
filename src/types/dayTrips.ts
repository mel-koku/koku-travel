/**
 * Day Trip Suggestions
 *
 * Types for proactively surfacing locations 50-150km from
 * the user's planned cities as opt-in day trip ideas.
 */

import type { CityId } from "./trip";
import type { ItineraryActivity, ItineraryTravelSegment } from "./itinerary";

/**
 * A suggested day trip destination surfaced to the user.
 * One suggestion = one anchor location + metadata about the area.
 */
export type DayTripSuggestion = {
  /** Composite key: `daytrip-${baseCityId}-${targetLocationId}` */
  id: string;
  /** The user's planned city this day trip departs from */
  baseCityId: CityId;
  baseCityName: string;
  /** The anchor location for the day trip */
  targetLocationId: string;
  targetLocationName: string;
  targetCity: string;
  targetRegion: string;
  /** Straight-line distance from base city center */
  distanceKm: number;
  /** Estimated one-way travel time in minutes */
  travelMinutes: number;
  /** 1-2 sentence pitch */
  description: string;
  /** Photo URL for the suggestion card */
  image: string | null;
  category: string;
  rating: number | null;
  reviewCount: number | null;
  /** How many other activities are nearby (within 15km) */
  nearbyCount: number;
  /** Which of the user's vibes this matches */
  vibeMatch: string[];
  tags: string[] | null;
  isHiddenGem: boolean;
  isUnescoSite: boolean;
};

/**
 * Result of planning a day trip after the user accepts a suggestion.
 */
export type DayTripPlanResult = {
  /** Activities for the day (2-3 place activities) */
  activities: ItineraryActivity[];
  /** Outbound travel from base city */
  travelTo: ItineraryTravelSegment;
  /** Return travel to base city */
  travelFrom: ItineraryTravelSegment;
  /** Total round-trip travel time in minutes */
  totalTravelMinutes: number;
  /** Label for the day: "Day Trip: Hiroshima -> Hagi" */
  dayLabel: string;
  /** Target city for the day's cityId */
  targetCityId: string;
};
