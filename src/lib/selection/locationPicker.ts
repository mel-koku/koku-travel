/**
 * Location selection utilities for itinerary generation.
 *
 * This module provides functions to pick the best locations for time slots
 * based on scoring, diversity, and availability constraints.
 */

import type { Location } from "@/types/location";
import type { InterestId, TripBuilderData } from "@/types/trip";
import type { WeatherForecast } from "@/types/weather";
import { scoreLocation, type LocationScoringCriteria, type ScoreBreakdown } from "@/lib/scoring/locationScoring";
import { applyDiversityFilter, type DiversityContext } from "@/lib/scoring/diversityRules";
import { checkOpeningHoursFit } from "@/lib/scoring/timeOptimization";
import { isLocationAvailableOnDate } from "@/lib/scoring/seasonalAvailability";
import { logger } from "@/lib/logger";

type LocationCategory = Location["category"];

/**
 * Extended location type with scoring metadata.
 */
export type ScoredLocation = Location & {
  _scoringReasoning?: string[];
  _scoreBreakdown?: ScoreBreakdown;
  _isReturnVisit?: boolean;
};

/**
 * Pick a location that fits within the available time budget.
 * Uses intelligent scoring system to select the best location.
 *
 * @param list - List of available locations
 * @param interest - Current interest to match
 * @param usedLocations - Set of already used location IDs
 * @param availableMinutes - Available time in the slot
 * @param travelTime - Estimated travel time to add
 * @param currentLocation - Current location coordinates
 * @param recentCategories - Recently visited categories for diversity
 * @param travelStyle - User's travel pace preference
 * @param interests - All user interests for matching
 * @param budget - User's budget preferences
 * @param accessibility - User's accessibility requirements
 * @param weatherForecast - Weather forecast for the day
 * @param weatherPreferences - User's weather preferences
 * @param timeSlot - Target time slot
 * @param date - Target date
 * @param group - User's group information
 * @param recentNeighborhoods - Recently visited neighborhoods for diversity
 * @param usedLocationNames - Set of already used location names
 * @returns Selected location with scoring metadata, or undefined if none available
 */
export function pickLocationForTimeSlot(
  list: Location[],
  interest: InterestId,
  usedLocations: Set<string>,
  availableMinutes: number,
  travelTime: number,
  currentLocation?: { lat: number; lng: number },
  recentCategories: string[] = [],
  travelStyle: TripBuilderData["style"] = "balanced",
  interests: InterestId[] = [],
  budget?: {
    level?: "budget" | "moderate" | "luxury";
    total?: number;
    perDay?: number;
  },
  accessibility?: {
    wheelchairAccessible?: boolean;
    elevatorRequired?: boolean;
  },
  weatherForecast?: WeatherForecast,
  weatherPreferences?: {
    preferIndoorOnRain?: boolean;
    minTemperature?: number;
    maxTemperature?: number;
  },
  timeSlot?: "morning" | "afternoon" | "evening",
  date?: string,
  group?: {
    size?: number;
    type?: "solo" | "couple" | "family" | "friends" | "business";
    childrenAges?: number[];
  },
  recentNeighborhoods: string[] = [],
  usedLocationNames: Set<string> = new Set(),
): ScoredLocation | undefined {
  // Filter by both ID and name to prevent duplicates (including same-name different branches)
  const unused = list.filter((loc) => {
    if (usedLocations.has(loc.id)) return false;
    const normalizedName = loc.name.toLowerCase().trim();
    if (usedLocationNames.has(normalizedName)) return false;
    return true;
  });

  // CRITICAL: Return undefined when all locations are exhausted
  // The caller should handle this by suggesting day trips or reducing activities
  if (unused.length === 0) {
    return undefined;
  }

  // Pre-filter by hard constraints (opening hours)
  // Only filter if we have time slot and date information
  let candidates = unused;
  if (timeSlot && date) {
    candidates = unused.filter((loc) => {
      const openingHoursCheck = checkOpeningHoursFit(loc, timeSlot, date);
      return openingHoursCheck.fits;
    });

    // If all candidates filtered out by operating hours, return undefined.
    // The generator handles this gracefully (tries next interest, suggests day trips).
    if (candidates.length === 0) {
      logger.info("All locations filtered out by operating hours", {
        timeSlot,
        date,
        unusedCount: unused.length,
      });
      return undefined;
    }
  }

  // Filter seasonal locations based on date
  if (date) {
    const dateObj = new Date(date);
    const beforeCount = candidates.length;
    candidates = candidates.filter((loc) => {
      // Non-seasonal locations always pass
      if (!loc.isSeasonal) return true;

      // Check if seasonal location is available on this date
      const availability = isLocationAvailableOnDate(loc, dateObj, loc.availability);
      if (!availability.available) {
        logger.debug(`Filtering out seasonal location "${loc.name}": ${availability.reason}`);
      }
      return availability.available;
    });

    const filteredCount = beforeCount - candidates.length;
    if (filteredCount > 0) {
      logger.debug(`Filtered ${filteredCount} seasonal locations for date ${date}`);
    }
  }

  // Score all candidates
  const criteria: LocationScoringCriteria = {
    interests: interests.length > 0 ? interests : [interest],
    travelStyle: travelStyle ?? "balanced",
    budgetLevel: budget?.level,
    budgetTotal: budget?.total,
    budgetPerDay: budget?.perDay,
    accessibility,
    currentLocation,
    availableMinutes: availableMinutes - travelTime, // Subtract travel time from available
    recentCategories,
    recentNeighborhoods,
    weatherForecast,
    weatherPreferences,
    timeSlot,
    date,
    group,
  };

  const scored = candidates
    .map((loc) => scoreLocation(loc, criteria))
    // Filter out locations with very negative scores (e.g., -100 for >50km distance)
    // These are effectively "invalid" for this query
    .filter((locScore) => locScore.score >= -50);

  // Apply diversity filter
  const diversityContext: DiversityContext = {
    recentCategories,
    visitedLocationIds: usedLocations,
    currentDay: 0, // Not currently used in diversity scoring, but kept for future enhancements
    energyLevel: 100,
  };

  const filtered = applyDiversityFilter(scored, diversityContext);

  // Sort by score, descending
  filtered.sort((a, b) => b.score - a.score);

  // Pick from top 5 with some randomness to avoid identical itineraries
  const topCandidates = filtered.slice(0, Math.min(5, filtered.length));
  if (topCandidates.length === 0) {
    // Fallback if all filtered out - still respect usedLocations AND usedLocationNames
    const fallbackCandidates = candidates.filter((loc) => {
      if (usedLocations.has(loc.id)) return false;
      const normalizedName = loc.name.toLowerCase().trim();
      if (usedLocationNames.has(normalizedName)) return false;
      return true;
    });
    if (fallbackCandidates.length === 0) {
      return undefined; // No valid locations left
    }
    const fallback = fallbackCandidates[Math.floor(Math.random() * fallbackCandidates.length)];
    return fallback ? { ...fallback } : undefined;
  }

  const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];

  // Return location with reasoning metadata attached
  if (selected?.location) {
    return {
      ...selected.location,
      _scoringReasoning: selected.reasoning,
      _scoreBreakdown: selected.breakdown,
    };
  }

  return undefined;
}

/**
 * Category mapping for interest-based location filtering.
 */
const CATEGORY_MAP: Record<InterestId, LocationCategory[]> = {
  culture: ["shrine", "temple", "landmark", "historic"],
  food: ["restaurant", "market"],
  nature: ["park", "garden"],
  nightlife: ["bar", "entertainment"],
  shopping: ["shopping", "market"],
  photography: ["landmark", "viewpoint", "park"],
  wellness: ["park", "garden"],
  history: ["shrine", "temple", "historic", "museum"],
};

/**
 * Simple location picker for basic use cases.
 * Picks a random location from preferred categories.
 *
 * @param list - List of available locations
 * @param interest - Interest to match
 * @param usedLocations - Set of already used location IDs
 * @returns Selected location or undefined
 */
export function pickFromList(
  list: Location[],
  interest: InterestId,
  usedLocations: Set<string>,
): Location | undefined {
  const preferredCategories = CATEGORY_MAP[interest] ?? [];
  const unused = list.filter((loc) => !usedLocations.has(loc.id));

  // CRITICAL: Return undefined when all locations are exhausted
  if (unused.length === 0) {
    return undefined;
  }

  const preferred = unused.filter((loc) => preferredCategories.includes(loc.category));
  if (preferred.length > 0) {
    return preferred[Math.floor(Math.random() * preferred.length)];
  }

  return unused[Math.floor(Math.random() * unused.length)];
}
