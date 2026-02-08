/**
 * Completeness-related detection rules
 */

import type { Rule, Issue, RuleContext } from '../lib/types';
import { shouldSkipLocation } from '../lib/overrides';
import {
  JAPAN_BOUNDS,
  isWithinJapan,
  hasSufficientPrecision,
  getCoordinatePrecision,
  parseDurationToMinutes,
  checkUnrealisticDuration,
} from '../lib/geography';

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

/**
 * Rule: Detect coordinates outside Japan bounds
 */
const invalidCoordinatesRule: Rule = {
  id: 'invalid-coordinates',
  name: 'Invalid Coordinates',
  description: 'Detects locations with coordinates outside Japan bounds',
  category: 'completeness',
  issueTypes: ['INVALID_COORDINATES'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Get coordinates from either field
      const lat = loc.lat ?? loc.coordinates?.lat;
      const lng = loc.lng ?? loc.coordinates?.lng;

      // Skip if no coordinates
      if (lat === null || lat === undefined || lng === null || lng === undefined) {
        continue;
      }

      // Check if within Japan
      if (isWithinJapan(lat, lng)) {
        continue;
      }

      issues.push({
        id: `${loc.id}-invalid-coords`,
        type: 'INVALID_COORDINATES',
        severity: 'critical',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Location "${loc.name}" has coordinates outside Japan (${lat}, ${lng})`,
        details: {
          lat,
          lng,
          japanBounds: JAPAN_BOUNDS,
        },
        suggestedFix: {
          action: 'skip',
          reason: 'Needs manual coordinate lookup - coordinates are completely wrong',
          confidence: 0,
          source: 'detection',
        },
      });
    }

    return issues;
  },
};

/**
 * Rule: Detect unrealistic visit durations
 */
const unrealisticDurationRule: Rule = {
  id: 'unrealistic-duration',
  name: 'Unrealistic Duration',
  description: 'Detects locations with visit durations that are too short (<15 min) or too long (>8 hours)',
  category: 'completeness',
  issueTypes: ['UNREALISTIC_DURATION'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Skip if no duration
      if (!loc.estimated_duration) continue;

      const problem = checkUnrealisticDuration(loc.estimated_duration);
      if (!problem) continue;

      const minutes = parseDurationToMinutes(loc.estimated_duration);

      issues.push({
        id: `${loc.id}-unrealistic-duration`,
        type: 'UNREALISTIC_DURATION',
        severity: 'low',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Location "${loc.name}" has unrealistic duration: ${loc.estimated_duration}`,
        details: {
          duration: loc.estimated_duration,
          parsedMinutes: minutes,
          problem,
        },
        suggestedFix: {
          action: 'skip',
          reason: 'Needs manual review to determine appropriate duration',
          confidence: 30,
          source: 'detection',
        },
      });
    }

    return issues;
  },
};

/**
 * Categories where estimated duration is important for trip planning
 */
const CATEGORIES_NEEDING_DURATION = [
  'culture',
  'landmark',
  'attraction',
  'entertainment',
  'museum',
  'experience',
];

/**
 * Rule: Detect missing duration for categories that need it
 */
const missingDurationRule: Rule = {
  id: 'missing-duration',
  name: 'Missing Duration',
  description: 'Detects locations missing estimated_duration for categories that need it',
  category: 'completeness',
  issueTypes: ['MISSING_DURATION'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Only check relevant categories
      const category = loc.category?.toLowerCase() || '';
      if (!CATEGORIES_NEEDING_DURATION.includes(category)) continue;

      // Skip if has duration
      if (loc.estimated_duration) continue;

      issues.push({
        id: `${loc.id}-missing-duration`,
        type: 'MISSING_DURATION',
        severity: 'low',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Location "${loc.name}" (${loc.category}) is missing estimated duration`,
        details: {
          category: loc.category,
        },
        suggestedFix: {
          action: 'skip',
          reason: 'Needs research to determine typical visit duration',
          confidence: 0,
          source: 'detection',
        },
      });
    }

    return issues;
  },
};

/**
 * Rule: Detect seasonal locations missing seasonal type
 */
const seasonalMissingTypeRule: Rule = {
  id: 'seasonal-missing-type',
  name: 'Seasonal Missing Type',
  description: 'Detects locations marked as seasonal but missing seasonal_type',
  category: 'completeness',
  issueTypes: ['SEASONAL_MISSING_TYPE'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Skip if not seasonal
      if (!loc.is_seasonal) continue;

      // Skip if has seasonal_type
      if (loc.seasonal_type) continue;

      issues.push({
        id: `${loc.id}-seasonal-no-type`,
        type: 'SEASONAL_MISSING_TYPE',
        severity: 'low',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Location "${loc.name}" is seasonal but missing seasonal_type`,
        details: {
          is_seasonal: loc.is_seasonal,
        },
        suggestedFix: {
          action: 'skip',
          reason: 'Needs research to determine which season(s) this location is best for',
          confidence: 0,
          source: 'detection',
        },
      });
    }

    return issues;
  },
};

/**
 * Food-related categories
 */
const FOOD_CATEGORIES = ['food', 'restaurant', 'cafe', 'bar'];

/**
 * Rule: Detect food locations missing meal options
 */
const foodMissingMealOptionsRule: Rule = {
  id: 'food-missing-meal-options',
  name: 'Food Missing Meal Options',
  description: 'Detects food/restaurant locations without meal_options data',
  category: 'completeness',
  issueTypes: ['FOOD_MISSING_MEAL_OPTIONS'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Only check food categories
      const category = loc.category?.toLowerCase() || '';
      if (!FOOD_CATEGORIES.includes(category)) continue;

      // Skip if has meal_options
      if (loc.meal_options && Object.keys(loc.meal_options).length > 0) continue;

      issues.push({
        id: `${loc.id}-food-no-meals`,
        type: 'FOOD_MISSING_MEAL_OPTIONS',
        severity: 'low',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Food location "${loc.name}" is missing meal_options data`,
        details: {
          category: loc.category,
          hasPlaceId: !!loc.place_id,
        },
        suggestedFix: loc.place_id
          ? {
              action: 'skip',
              reason: 'Can fetch meal options from Google Places API',
              confidence: 70,
              source: 'detection',
            }
          : {
              action: 'skip',
              reason: 'Needs place_id for Google Places lookup',
              confidence: 0,
              source: 'detection',
            },
      });
    }

    return issues;
  },
};

/**
 * Rule: Detect low precision coordinates
 */
const coordinatesPrecisionLowRule: Rule = {
  id: 'coordinates-precision-low',
  name: 'Coordinates Precision Low',
  description: 'Detects locations with low precision coordinates (<4 decimal places)',
  category: 'completeness',
  issueTypes: ['COORDINATES_PRECISION_LOW'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Get coordinates from either field
      const lat = loc.lat ?? loc.coordinates?.lat;
      const lng = loc.lng ?? loc.coordinates?.lng;

      // Skip if no coordinates
      if (lat === null || lat === undefined || lng === null || lng === undefined) {
        continue;
      }

      // Skip if precision is sufficient
      if (hasSufficientPrecision(lat, lng)) {
        continue;
      }

      const latPrecision = getCoordinatePrecision(lat);
      const lngPrecision = getCoordinatePrecision(lng);

      issues.push({
        id: `${loc.id}-low-precision`,
        type: 'COORDINATES_PRECISION_LOW',
        severity: 'info',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Location "${loc.name}" has low precision coordinates (lat: ${latPrecision}, lng: ${lngPrecision} decimal places)`,
        details: {
          lat,
          lng,
          latPrecision,
          lngPrecision,
          minimumRequired: 4,
        },
        suggestedFix: loc.place_id
          ? {
              action: 'skip',
              reason: 'Can get higher precision coordinates from Google Places',
              confidence: 80,
              source: 'detection',
            }
          : {
              action: 'skip',
              reason: 'Needs Google Places lookup for higher precision',
              confidence: 30,
              source: 'detection',
            },
      });
    }

    return issues;
  },
};

/**
 * Rule: Detect photos still pointing to Google proxy
 */
const photoStillProxiedRule: Rule = {
  id: 'photo-still-proxied',
  name: 'Photo Still Proxied',
  description: 'Detects locations where primary_photo_url still points to the Google proxy endpoint',
  category: 'completeness',
  issueTypes: ['PHOTO_STILL_PROXIED'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      if (!loc.primary_photo_url) continue;

      if (!loc.primary_photo_url.includes('/api/places/photo')) continue;

      issues.push({
        id: `${loc.id}-photo-proxied`,
        type: 'PHOTO_STILL_PROXIED',
        severity: 'medium',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Location "${loc.name}" still uses Google proxy for photo`,
        details: {
          url: loc.primary_photo_url,
        },
        suggestedFix: {
          action: 'skip',
          reason: 'Re-run photo download script to store in Supabase Storage',
          confidence: 80,
          source: 'detection',
        },
      });
    }

    return issues;
  },
};

/**
 * Rule: Detect locations missing primary photo
 */
const missingPrimaryPhotoRule: Rule = {
  id: 'missing-primary-photo',
  name: 'Missing Primary Photo',
  description: 'Detects locations without a primary_photo_url (excludes transport category)',
  category: 'completeness',
  issueTypes: ['MISSING_PRIMARY_PHOTO'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Skip transport category (airports, stations don't need photos)
      if (loc.category?.toLowerCase() === 'transport') continue;

      // Skip if has primary_photo_url
      if (loc.primary_photo_url) continue;

      issues.push({
        id: `${loc.id}-missing-photo`,
        type: 'MISSING_PRIMARY_PHOTO',
        severity: 'low',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Location "${loc.name}" has no primary photo`,
        details: {
          category: loc.category,
          hasPlaceId: !!loc.place_id,
        },
        suggestedFix: {
          action: 'skip',
          reason: loc.place_id
            ? 'Has place_id - can fetch photo from Google Places'
            : 'Needs place_id or manual photo upload',
          confidence: loc.place_id ? 70 : 20,
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
  permanentlyClosedRule,
  missingOperatingHoursRule,
  invalidRatingRule,
  invalidCoordinatesRule,
  unrealisticDurationRule,
  missingDurationRule,
  seasonalMissingTypeRule,
  foodMissingMealOptionsRule,
  coordinatesPrecisionLowRule,
  photoStillProxiedRule,
  missingPrimaryPhotoRule,
];
