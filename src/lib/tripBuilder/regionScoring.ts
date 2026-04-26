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
import { calculateDistance } from "@/lib/utils/geoUtils";
import { getCityLimits } from "@/lib/tripBuilder/cityDayValidation";
import { getCityMetadata } from "@/lib/tripBuilder/cityRelevance";

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
  isExitPointRegion: boolean; // True if this is the exit point's region
};

// Haversine distance imported from @/lib/utils/geoUtils

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

  const distance = calculateDistance(
    entryPoint.coordinates,
    region.coordinates,
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
  entryPoint?: EntryPoint,
  exitPoint?: EntryPoint
): RegionScore[] {
  const entryPointRegionId = entryPoint?.region;
  const exitPointRegionId = exitPoint?.region;

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
      isExitPointRegion: exitPointRegionId !== undefined && region.id === exitPointRegionId,
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
 * Auto-select cities from exactly 2 regions, capped at the recommended
 * city count for the trip duration.
 *
 * Regions: entry point region + (exit point region for open-jaw trips, or
 * highest-scoring vibe region otherwise). Open-jaw flights commit the
 * traveler to ending near the departure airport — ignoring that turns the
 * suggestion into a routing trap, so the exit region wins over the vibes
 * pick when they differ.
 *
 * Cities within those regions are ranked by: entry point city first,
 * then by content density (location count). Only the top N cities are
 * returned, where N = getCityLimits(duration).recommended.
 *
 * When no duration is provided, all cities from both regions are returned.
 */
export function autoSelectCities(
  vibes: VibeId[],
  entryPoint?: EntryPoint,
  duration?: number,
  exitPoint?: EntryPoint
): KnownCityId[] {
  const scored = scoreRegionsForTrip(vibes, entryPoint, exitPoint);
  const picked = new Set<KnownRegionId>();

  // 1. Entry point region (closest to arrival)
  const entryRegion = scored.find((s) => s.isEntryPointRegion);
  if (entryRegion) {
    picked.add(entryRegion.region.id);
  }

  // 2. Open-jaw: force the exit point's region so the traveler isn't routed
  //    away from their departure airport. Falls through to the vibes pick
  //    when the exit region matches the entry region (round-trip or same-
  //    region open-jaw, e.g. KIX → ITM).
  const exitRegionId = exitPoint?.region;
  if (exitRegionId && !picked.has(exitRegionId)) {
    picked.add(exitRegionId);
  }

  // 3. Highest-scoring region that isn't already picked (vibes-driven fill)
  if (picked.size < 2) {
    for (const s of scored) {
      if (!picked.has(s.region.id)) {
        picked.add(s.region.id);
        break;
      }
    }
  }

  // If still only 1 (entry point was also top scorer), grab the next best
  if (picked.size < 2) {
    for (const s of scored) {
      if (!picked.has(s.region.id)) {
        picked.add(s.region.id);
        break;
      }
    }
  }

  // Gather all candidate cities from picked regions
  const candidates: KnownCityId[] = [];
  for (const regionId of picked) {
    const region = REGIONS.find((r) => r.id === regionId);
    region?.cities.forEach((c) => candidates.push(c.id));
  }

  // Cap at the recommended city count for this trip duration
  if (!duration || duration <= 0 || candidates.length <= getCityLimits(duration).recommended) {
    return candidates;
  }

  const { recommended } = getCityLimits(duration);
  const entryPointCityId = entryPoint?.cityId;

  // Rank: entry point city first, then by content density (location count)
  const ranked = candidates
    .map((cityId) => ({
      cityId,
      isEntryCity: cityId === entryPointCityId,
      locationCount: getCityMetadata(cityId)?.locationCount ?? 0,
    }))
    .sort((a, b) => {
      if (a.isEntryCity !== b.isEntryCity) return a.isEntryCity ? -1 : 1;
      return b.locationCount - a.locationCount;
    });

  return ranked.slice(0, recommended).map((c) => c.cityId);
}
