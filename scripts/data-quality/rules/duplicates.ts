/**
 * Duplicate detection rules
 */

import type { Rule, Issue, RuleContext, Location } from '../lib/types';
import { findDuplicatesByName, groupBy } from '../lib/utils';
import { shouldSkipLocation, getDuplicateResolution } from '../lib/overrides';

/**
 * Generate a coordinate key for grouping (6 decimal places = ~11cm precision)
 */
function coordinateKey(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/**
 * Rule: Detect duplicate locations in the same city
 */
const duplicateSameCityRule: Rule = {
  id: 'duplicate-same-city',
  name: 'Duplicate Same City',
  description: 'Detects locations with the same name in the same city',
  category: 'duplicates',
  issueTypes: ['DUPLICATE_SAME_CITY'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    // Group locations by city first
    const byCity = groupBy(ctx.locations, loc => loc.city.toLowerCase());

    for (const [city, cityLocations] of Object.entries(byCity)) {
      // Find duplicates within this city
      const duplicates = findDuplicatesByName(cityLocations);

      for (const [name, locs] of duplicates) {
        // Skip if all locations in this group should be skipped
        const activeLocations = locs.filter(loc => !shouldSkipLocation(loc.id));
        if (activeLocations.length < 2) continue;

        // Check for configured resolutions
        const withResolutions = activeLocations.map(loc => ({
          loc,
          resolution: getDuplicateResolution(loc.id),
        }));

        const keepLoc = withResolutions.find(r => r.resolution?.action === 'keep');
        const deleteLocs = withResolutions.filter(r => r.resolution?.action === 'delete');

        // Create an issue for each duplicate
        for (const loc of activeLocations) {
          const resolution = getDuplicateResolution(loc.id);

          issues.push({
            id: `${loc.id}-duplicate-city`,
            type: 'DUPLICATE_SAME_CITY',
            severity: 'critical',
            locationId: loc.id,
            locationName: loc.name,
            city: loc.city,
            region: loc.region,
            message: `Duplicate name "${name}" found ${locs.length} times in ${city}`,
            details: {
              duplicateCount: locs.length,
              otherIds: locs.filter(l => l.id !== loc.id).map(l => l.id),
              hasPlaceId: !!loc.place_id,
              hasDescription: !!loc.description,
            },
            suggestedFix: resolution
              ? resolution.action === 'keep'
                ? {
                    action: 'skip',
                    reason: resolution.reason || 'Configured to keep',
                    confidence: 100,
                    source: 'override',
                  }
                : {
                    action: 'delete',
                    reason: resolution.reason || 'Configured to delete',
                    confidence: 100,
                    source: 'override',
                  }
              : determineDuplicateFix(loc, activeLocations),
          });
        }
      }
    }

    return issues;
  },
};

/**
 * Rule: Detect same name appearing across multiple cities
 */
const duplicateManyCitiesRule: Rule = {
  id: 'duplicate-many-cities',
  name: 'Duplicate Many Cities',
  description: 'Detects locations with the same name across 2+ different cities',
  category: 'duplicates',
  issueTypes: ['DUPLICATE_MANY'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    // Find all duplicates globally
    const duplicates = findDuplicatesByName(ctx.locations);

    for (const [name, locs] of duplicates) {
      // Skip if all locations in this group should be skipped
      const activeLocations = locs.filter(loc => !shouldSkipLocation(loc.id));
      if (activeLocations.length < 2) continue;

      // Group by city to see if they're in different cities
      const byCity = groupBy(activeLocations, loc => loc.city.toLowerCase());
      const cities = Object.keys(byCity);

      // Only report if in 2+ different cities
      if (cities.length < 2) continue;

      // This is often legitimate (e.g., chain restaurants) - lower severity
      for (const loc of activeLocations) {
        issues.push({
          id: `${loc.id}-duplicate-multi`,
          type: 'DUPLICATE_MANY',
          severity: 'low',
          locationId: loc.id,
          locationName: loc.name,
          city: loc.city,
          region: loc.region,
          message: `Name "${name}" appears in ${cities.length} cities: ${cities.join(', ')}`,
          details: {
            cityCount: cities.length,
            cities: cities,
            allLocations: activeLocations.map(l => ({ id: l.id, city: l.city })),
          },
        });
      }
    }

    return issues;
  },
};

/**
 * Determine suggested fix for a duplicate location
 */
function determineDuplicateFix(
  loc: Location,
  allDuplicates: Location[]
): Issue['suggestedFix'] {
  // Score each location to determine which to keep
  const scores = allDuplicates.map(l => ({
    loc: l,
    score: calculateLocationScore(l),
  }));

  scores.sort((a, b) => b.score - a.score);
  const bestLocation = scores[0].loc;

  if (loc.id === bestLocation.id) {
    return {
      action: 'skip',
      reason: 'Best quality duplicate (highest score)',
      confidence: 70,
      source: 'detection',
    };
  }

  return {
    action: 'delete',
    reason: `Lower quality than ${bestLocation.id} (score: ${scores.find(s => s.loc.id === loc.id)?.score} vs ${scores[0].score})`,
    confidence: 60,
    source: 'detection',
  };
}

/**
 * Calculate a quality score for a location
 */
function calculateLocationScore(loc: Location): number {
  let score = 0;

  // Has place_id: +30
  if (loc.place_id) score += 30;

  // Has description: +20
  if (loc.description && loc.description.length > 20) score += 20;

  // Has editorial_summary: +15
  if (loc.editorial_summary && loc.editorial_summary.length > 50) score += 15;

  // Has coordinates: +10
  if (loc.coordinates) score += 10;

  // Longer description: +10
  if (loc.description && loc.description.length > 100) score += 10;

  return score;
}

/**
 * Rule: Detect multiple locations at the exact same coordinates
 */
const duplicateCoordinatesRule: Rule = {
  id: 'duplicate-coordinates',
  name: 'Duplicate Coordinates',
  description: 'Detects multiple locations at the exact same lat/lng coordinates',
  category: 'duplicates',
  issueTypes: ['DUPLICATE_COORDINATES'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    // Group locations by coordinates
    const byCoords = new Map<string, Location[]>();

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Get coordinates from either field
      const lat = loc.lat ?? loc.coordinates?.lat;
      const lng = loc.lng ?? loc.coordinates?.lng;

      // Skip if no coordinates
      if (lat === null || lat === undefined || lng === null || lng === undefined) {
        continue;
      }

      const key = coordinateKey(lat, lng);
      const existing = byCoords.get(key) || [];
      existing.push(loc);
      byCoords.set(key, existing);
    }

    // Find duplicates (2+ locations at same coordinates)
    const coordEntries = Array.from(byCoords.entries());
    for (const [coords, locs] of coordEntries) {
      if (locs.length < 2) continue;

      // Check for configured resolutions
      const activeLocations = locs.filter(loc => !shouldSkipLocation(loc.id));
      if (activeLocations.length < 2) continue;

      // Create an issue for each duplicate
      for (const loc of activeLocations) {
        const resolution = getDuplicateResolution(loc.id);

        issues.push({
          id: `${loc.id}-duplicate-coords`,
          type: 'DUPLICATE_COORDINATES',
          severity: 'high',
          locationId: loc.id,
          locationName: loc.name,
          city: loc.city,
          region: loc.region,
          message: `${locs.length} locations share coordinates (${coords}): ${locs.map(l => l.name).join(', ')}`,
          details: {
            coordinates: coords,
            duplicateCount: locs.length,
            otherIds: locs.filter(l => l.id !== loc.id).map(l => l.id),
            otherNames: locs.filter(l => l.id !== loc.id).map(l => l.name),
          },
          suggestedFix: resolution
            ? resolution.action === 'keep'
              ? {
                  action: 'skip',
                  reason: resolution.reason || 'Configured to keep',
                  confidence: 100,
                  source: 'override',
                }
              : {
                  action: 'delete',
                  reason: resolution.reason || 'Configured to delete',
                  confidence: 100,
                  source: 'override',
                }
            : determineDuplicateFix(loc, activeLocations),
        });
      }
    }

    return issues;
  },
};

export const duplicateRules: Rule[] = [
  duplicateSameCityRule,
  duplicateManyCitiesRule,
  duplicateCoordinatesRule,
];
