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

/**
 * Rule: Detect permanently closed locations
 */
const permanentlyClosedRule: Rule = {
  id: 'permanently-closed',
  name: 'Permanently Closed',
  description: 'Detects locations marked as permanently closed',
  category: 'completeness',
  issueTypes: ['PERMANENTLY_CLOSED'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Check if business_status is PERMANENTLY_CLOSED
      if (loc.business_status !== 'PERMANENTLY_CLOSED') continue;

      issues.push({
        id: `${loc.id}-permanently-closed`,
        type: 'PERMANENTLY_CLOSED',
        severity: 'critical',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Location "${loc.name}" is permanently closed`,
        details: {
          businessStatus: loc.business_status,
          category: loc.category,
        },
        suggestedFix: {
          action: 'delete',
          reason: 'Location is permanently closed and should be removed',
          confidence: 90,
          source: 'detection',
        },
      });
    }

    return issues;
  },
};

/**
 * Categories where operating hours are important for trip planning
 */
const CATEGORIES_NEEDING_HOURS = [
  'culture',
  'landmark',
  'attraction',
  'food',
  'restaurant',
  'cafe',
  'bar',
  'entertainment',
  'museum',
  'shopping',
];

/**
 * Rule: Detect locations missing operating hours
 */
const missingOperatingHoursRule: Rule = {
  id: 'missing-operating-hours',
  name: 'Missing Operating Hours',
  description: 'Detects locations missing operating hours for categories that need them for planning',
  category: 'completeness',
  issueTypes: ['MISSING_OPERATING_HOURS'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Only check categories where hours matter
      const category = loc.category?.toLowerCase() || '';
      if (!CATEGORIES_NEEDING_HOURS.includes(category)) continue;

      // Skip if has operating_hours
      if (loc.operating_hours && Object.keys(loc.operating_hours).length > 0) continue;

      issues.push({
        id: `${loc.id}-missing-hours`,
        type: 'MISSING_OPERATING_HOURS',
        severity: 'low',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Location "${loc.name}" (${loc.category}) is missing operating hours`,
        details: {
          category: loc.category,
          hasPlaceId: !!loc.place_id,
        },
        suggestedFix: loc.place_id
          ? {
              action: 'skip',
              reason: 'Can fetch operating hours from Google Places API',
              confidence: 80,
              source: 'detection',
            }
          : {
              action: 'skip',
              reason: 'Needs place_id to fetch operating hours',
              confidence: 0,
              source: 'detection',
            },
      });
    }

    return issues;
  },
};

/**
 * Rule: Detect invalid ratings
 */
const invalidRatingRule: Rule = {
  id: 'invalid-rating',
  name: 'Invalid Rating',
  description: 'Detects ratings without review count or values outside 0-5 range',
  category: 'completeness',
  issueTypes: ['INVALID_RATING'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      const hasRating = loc.rating !== null && loc.rating !== undefined;
      const hasReviewCount = loc.review_count !== null && loc.review_count !== undefined;

      // Case 1: Has rating but no review count
      if (hasRating && !hasReviewCount) {
        issues.push({
          id: `${loc.id}-rating-no-reviews`,
          type: 'INVALID_RATING',
          severity: 'low',
          locationId: loc.id,
          locationName: loc.name,
          city: loc.city,
          region: loc.region,
          message: `Location "${loc.name}" has rating (${loc.rating}) but no review count`,
          details: {
            rating: loc.rating,
            reviewCount: null,
          },
          suggestedFix: {
            action: 'skip',
            reason: 'Needs Google Places lookup to get review count',
            confidence: 50,
            source: 'detection',
          },
        });
        continue;
      }

      // Case 2: Rating out of valid range (0-5)
      if (hasRating && (loc.rating! < 0 || loc.rating! > 5)) {
        issues.push({
          id: `${loc.id}-rating-out-of-range`,
          type: 'INVALID_RATING',
          severity: 'medium',
          locationId: loc.id,
          locationName: loc.name,
          city: loc.city,
          region: loc.region,
          message: `Location "${loc.name}" has invalid rating: ${loc.rating} (must be 0-5)`,
          details: {
            rating: loc.rating,
            reviewCount: loc.review_count,
          },
          suggestedFix: {
            action: 'skip',
            reason: 'Rating appears corrupted - needs verification',
            confidence: 30,
            source: 'detection',
          },
        });
      }
    }

    return issues;
  },
};

export const completenessRules: Rule[] = [
  missingCoordinatesRule,
  missingPlaceIdRule,
  permanentlyClosedRule,
  missingOperatingHoursRule,
  invalidRatingRule,
];
