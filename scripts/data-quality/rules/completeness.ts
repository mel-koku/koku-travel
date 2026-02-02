/**
 * Completeness-related detection rules
 */

import type { Rule, Issue, RuleContext } from '../lib/types';
import { shouldSkipLocation } from '../lib/overrides';

/**
 * Rule: Detect locations missing coordinates
 */
const missingCoordinatesRule: Rule = {
  id: 'missing-coordinates',
  name: 'Missing Coordinates',
  description: 'Detects locations without latitude/longitude',
  category: 'completeness',
  issueTypes: ['MISSING_COORDINATES'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Skip if has valid coordinates
      if (loc.coordinates && loc.coordinates.lat !== null && loc.coordinates.lng !== null) {
        continue;
      }

      issues.push({
        id: `${loc.id}-missing-coords`,
        type: 'MISSING_COORDINATES',
        severity: 'high',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Location "${loc.name}" is missing coordinates`,
        details: {
          hasPlaceId: !!loc.place_id,
        },
        suggestedFix: loc.place_id
          ? {
              action: 'skip',
              reason: 'Has place_id - can geocode from Google Places',
              confidence: 80,
              source: 'detection',
            }
          : {
              action: 'skip',
              reason: 'Needs manual geocoding or place_id lookup',
              confidence: 0,
              source: 'detection',
            },
      });
    }

    return issues;
  },
};

/**
 * Rule: Detect locations missing Google Place ID
 */
const missingPlaceIdRule: Rule = {
  id: 'missing-place-id',
  name: 'Missing Place ID',
  description: 'Detects locations without Google Place ID',
  category: 'completeness',
  issueTypes: ['MISSING_PLACE_ID'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Skip if has place_id
      if (loc.place_id) continue;

      // This is informational - many locations work fine without place_id
      issues.push({
        id: `${loc.id}-missing-place-id`,
        type: 'MISSING_PLACE_ID',
        severity: 'info',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Location "${loc.name}" has no Google Place ID`,
        details: {
          hasCoordinates: !!loc.coordinates,
          category: loc.category,
        },
        suggestedFix: loc.coordinates
          ? {
              action: 'skip',
              reason: 'Can search Google Places nearby using coordinates',
              confidence: 60,
              source: 'detection',
            }
          : {
              action: 'skip',
              reason: 'Needs manual lookup or coordinates for nearby search',
              confidence: 0,
              source: 'detection',
            },
      });
    }

    return issues;
  },
};

export const completenessRules: Rule[] = [
  missingCoordinatesRule,
  missingPlaceIdRule,
];
