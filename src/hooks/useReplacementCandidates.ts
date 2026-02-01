"use client";

import { useMutation } from "@tanstack/react-query";
import type { ItineraryActivity } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { Location } from "@/types/location";
import { logger } from "@/lib/logger";
import { getCategoryDefaultDuration } from "@/lib/durationExtractor";

/**
 * Breakdown of scoring factors for a replacement candidate
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
 * A candidate for replacing an activity
 */
export interface ReplacementCandidate {
  location: Location;
  score: number;
  breakdown: ScoreBreakdown;
  reasoning: string[];
}

/**
 * Response from the replacements API
 */
export interface ReplacementOptions {
  candidates: ReplacementCandidate[];
  originalActivity: ItineraryActivity;
}

/**
 * Request parameters for finding replacement candidates
 */
interface FindReplacementsParams {
  activity: Extract<ItineraryActivity, { kind: "place" }>;
  tripData: TripBuilderData;
  allActivities: ItineraryActivity[];
  dayActivities: ItineraryActivity[];
  currentDayIndex: number;
  maxCandidates?: number;
}

/**
 * API response type
 */
interface ApiResponse {
  data: ReplacementOptions;
}

/**
 * Fetches replacement candidates from the API
 */
async function fetchReplacementCandidates(
  params: FindReplacementsParams,
): Promise<ReplacementOptions> {
  const response = await fetch("/api/itinerary/replacements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const payload = await response.json();
      if (payload?.error) {
        message = payload.error as string;
      }
    } catch (jsonError) {
      logger.debug("Unable to parse error response", { error: jsonError });
    }
    throw new Error(message);
  }

  const data = (await response.json()) as ApiResponse;
  return data.data;
}

/**
 * React Query mutation hook for finding replacement candidates
 *
 * @returns Mutation result for finding replacement candidates
 */
export function useReplacementCandidates() {
  return useMutation({
    mutationFn: fetchReplacementCandidates,
    retry: 1,
  });
}

/**
 * Convert a Location to an ItineraryActivity for replacement.
 * This is a pure function that can be used client-side.
 *
 * @param location - The location to convert
 * @param originalActivity - The original activity being replaced
 * @returns A new ItineraryActivity
 */
export function locationToActivity(
  location: Location,
  originalActivity: Extract<ItineraryActivity, { kind: "place" }>,
): Extract<ItineraryActivity, { kind: "place" }> {
  const duration =
    location.recommendedVisit?.typicalMinutes ??
    getCategoryDefaultDuration(location.category ?? "landmark");

  // Build tags from location category and interests
  const tags: string[] = [];
  if (location.category) {
    tags.push(location.category);
  }

  return {
    kind: "place",
    id: `${location.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: location.name,
    timeOfDay: originalActivity.timeOfDay,
    durationMin: duration,
    neighborhood: location.neighborhood ?? location.city,
    tags,
    locationId: location.id,
    coordinates: location.coordinates, // Include coordinates for travel calculations
    notes: originalActivity.notes,
    schedule: originalActivity.schedule, // Preserve scheduled times (will be recalculated)
    travelFromPrevious: originalActivity.travelFromPrevious, // Preserve travel segment (will be recalculated)
  };
}
