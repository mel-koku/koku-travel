/**
 * Region scoring utilities for the trip builder.
 *
 * Calculates how well each region matches the user's selected vibes
 * and entry point proximity.
 */

import type { EntryPoint, KnownCityId, KnownRegionId } from "@/types/trip";
import type { VibeId } from "@/data/vibes";
import { REGION_DESCRIPTIONS, type RegionDescription } from "@/data/regionDescriptions";
import { REGIONS } from "@/data/regions";

/**
 * Result of scoring a region for a trip.
 */
export type RegionScore = {
  region: RegionDescription;
  matchScore: number; // 0-100 based on vibe match
  proximityScore: number; // 0-100 based on entry point distance
  totalScore: number; // Combined weighted score
  isRecommended: boolean; // True if in top 3
  isEntryPointRegion: boolean; // True if this is the entry point's region
};

/**
 * Calculate the distance between two coordinates using Haversine formula.
 * Returns distance in kilometers.
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate how well a region matches the selected vibes.
 *
 * @param region - The region to score
 * @param vibes - Selected vibe IDs
 * @returns Score from 0-100
 */
function calculateVibeMatch(region: RegionDescription, vibes: VibeId[]): number {
  if (vibes.length === 0) {
    return 50; // Neutral score when no vibes selected
  }

  const matchingVibes = vibes.filter((vibe) => region.bestFor.includes(vibe));
  const matchRatio = matchingVibes.length / vibes.length;

  // Bonus for regions that specialize in multiple selected vibes
  const specializationBonus = matchingVibes.length > 1 ? 10 : 0;

  return Math.min(100, Math.round(matchRatio * 90 + specializationBonus));
}

/**
 * Calculate proximity score based on distance from entry point.
 * Closer regions get higher scores.
 *
 * @param region - The region to score
 * @param entryPoint - The entry point (airport)
 * @returns Score from 0-100
 */
function calculateProximityScore(
  region: RegionDescription,
  entryPoint?: EntryPoint
): number {
  if (!entryPoint?.coordinates) {
    return 50; // Neutral score when no entry point
  }

  const distance = haversineDistance(
    entryPoint.coordinates.lat,
    entryPoint.coordinates.lng,
    region.coordinates.lat,
    region.coordinates.lng
  );

  // Score based on distance (max 2000km for Japan's length)
  // Closer = higher score
  const maxDistance = 2000;
  const normalizedDistance = Math.min(distance, maxDistance);
  const proximityScore = Math.round((1 - normalizedDistance / maxDistance) * 100);

  return proximityScore;
}

/**
 * Score all regions based on vibes and entry point.
 * The entry point's region always appears first.
 *
 * @param vibes - Selected vibe IDs
 * @param entryPoint - Optional entry point
 * @returns Array of scored regions, sorted by total score (descending), with entry point region first
 */
export function scoreRegionsForTrip(
  vibes: VibeId[],
  entryPoint?: EntryPoint
): RegionScore[] {
  const entryPointRegionId = entryPoint?.region;

  const scoredRegions = REGION_DESCRIPTIONS.map((region) => {
    const matchScore = calculateVibeMatch(region, vibes);
    const proximityScore = calculateProximityScore(region, entryPoint);

    // Weight: 70% vibe match, 30% proximity
    const totalScore = Math.round(matchScore * 0.7 + proximityScore * 0.3);

    return {
      region,
      matchScore,
      proximityScore,
      totalScore,
      isRecommended: false, // Will be set after sorting
      isEntryPointRegion: region.id === entryPointRegionId,
    };
  });

  // Sort by total score descending
  scoredRegions.sort((a, b) => b.totalScore - a.totalScore);

  // If entry point has a region, move it to the front
  if (entryPoint?.region) {
    const entryPointRegionIndex = scoredRegions.findIndex(
      (s) => s.region.id === entryPoint.region
    );
    if (entryPointRegionIndex > 0) {
      const entryPointRegion = scoredRegions[entryPointRegionIndex];
      if (entryPointRegion) {
        scoredRegions.splice(entryPointRegionIndex, 1);
        scoredRegions.unshift(entryPointRegion);
      }
    }
  }

  // Mark top 3 as recommended
  scoredRegions.slice(0, 3).forEach((score) => {
    score.isRecommended = true;
  });

  return scoredRegions;
}

/**
 * Get the recommended regions to auto-select based on vibes, entry point, and duration.
 *
 * @param vibes - Selected vibe IDs
 * @param entryPoint - Optional entry point
 * @param duration - Trip duration in days
 * @returns Array of region IDs to auto-select
 */
export function autoSelectRegions(
  vibes: VibeId[],
  entryPoint?: EntryPoint,
  duration?: number
): KnownRegionId[] {
  const scored = scoreRegionsForTrip(vibes, entryPoint);

  // Determine how many regions to select based on duration
  let regionsToSelect: number;
  if (!duration || duration <= 5) {
    regionsToSelect = 1;
  } else if (duration <= 9) {
    regionsToSelect = 2;
  } else {
    regionsToSelect = 3;
  }

  return scored.slice(0, regionsToSelect).map((s) => s.region.id);
}

/**
 * Get region descriptions sorted by score.
 */
export function getRegionsByScore(
  vibes: VibeId[],
  entryPoint?: EntryPoint
): RegionScore[] {
  return scoreRegionsForTrip(vibes, entryPoint);
}

/**
 * Auto-select cities by first picking top regions (via autoSelectRegions),
 * then expanding them to all their city IDs.
 */
export function autoSelectCities(
  vibes: VibeId[],
  entryPoint?: EntryPoint,
  duration?: number
): KnownCityId[] {
  const regionIds = autoSelectRegions(vibes, entryPoint, duration);
  const cities: KnownCityId[] = [];
  for (const regionId of regionIds) {
    const region = REGIONS.find((r) => r.id === regionId);
    region?.cities.forEach((c) => cities.push(c.id));
  }
  return cities;
}
