/**
 * Google Places mismatch detection rules
 *
 * Detects data corruption where Google Places enrichment
 * returned wrong results (e.g., airport data for a restaurant)
 */

import type { Rule, Issue, RuleContext } from '../lib/types';
import { shouldSkipLocation } from '../lib/overrides';

// Types that are incompatible with food/restaurant locations
const INCOMPATIBLE_TYPES_FOR_FOOD = [
  'airport', 'train_station', 'bus_station', 'transit_station',
  'hospital', 'school', 'university', 'church', 'mosque',
  'police', 'fire_station', 'cemetery', 'funeral_home',
];

// Types that are incompatible with shrine/temple locations
const INCOMPATIBLE_TYPES_FOR_RELIGIOUS = [
  'airport', 'restaurant', 'hotel', 'shopping_mall', 'hospital',
  'train_station', 'bus_station', 'cafe', 'bar',
];

// Types that are incompatible with accommodation locations
const INCOMPATIBLE_TYPES_FOR_ACCOMMODATION = [
  'restaurant', 'cafe', 'bar', 'bakery', 'fast_food_restaurant',
  'airport', 'train_station', 'school', 'hospital',
];

// Keywords indicating food content
const FOOD_KEYWORDS = [
  'restaurant', 'ramen', 'sushi', 'unagi', 'eel', 'beef', 'pork',
  'noodle', 'tempura', 'yakitori', 'izakaya', 'menu', 'chef',
  'cuisine', 'dish', 'dining', 'meal', 'food',
];

// Keywords indicating transport content
const TRANSPORT_KEYWORDS = [
  'airport', 'runway', 'terminal', 'flight', 'airline',
  'train station', 'platform', 'railway',
];

/**
 * Rule: Detect Google type mismatches with our category
 */
const googleTypeMismatchRule: Rule = {
  id: 'google-type-mismatch',
  name: 'Google Type Mismatch',
  description: 'Detects when Google primary type conflicts with our category (e.g., airport for restaurant)',
  category: 'google',
  issueTypes: ['GOOGLE_TYPE_MISMATCH'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;
      if (!loc.google_primary_type) continue;

      const ourCategory = loc.category?.toLowerCase() || '';
      const googleType = loc.google_primary_type.toLowerCase();

      // Check food category mismatch
      if (['food', 'restaurant', 'cafe', 'bar'].includes(ourCategory)) {
        if (INCOMPATIBLE_TYPES_FOR_FOOD.includes(googleType)) {
          issues.push({
            id: `${loc.id}-google-type-mismatch`,
            type: 'GOOGLE_TYPE_MISMATCH',
            severity: 'critical',
            locationId: loc.id,
            locationName: loc.name,
            city: loc.city,
            region: loc.region,
            message: `Category "${loc.category}" but Google type is "${loc.google_primary_type}" - likely wrong place_id`,
            details: {
              ourCategory: loc.category,
              googleType: loc.google_primary_type,
            },
            suggestedFix: {
              action: 'delete',
              reason: 'Google Place ID points to wrong location - needs re-enrichment',
              confidence: 90,
              source: 'detection',
            },
          });
          continue;
        }
      }

      // Check shrine/temple category mismatch
      if (['shrine', 'temple'].includes(ourCategory)) {
        if (INCOMPATIBLE_TYPES_FOR_RELIGIOUS.includes(googleType)) {
          issues.push({
            id: `${loc.id}-google-type-mismatch`,
            type: 'GOOGLE_TYPE_MISMATCH',
            severity: 'critical',
            locationId: loc.id,
            locationName: loc.name,
            city: loc.city,
            region: loc.region,
            message: `Category "${loc.category}" but Google type is "${loc.google_primary_type}" - likely wrong place_id`,
            details: {
              ourCategory: loc.category,
              googleType: loc.google_primary_type,
            },
            suggestedFix: {
              action: 'delete',
              reason: 'Google Place ID points to wrong location - needs re-enrichment',
              confidence: 90,
              source: 'detection',
            },
          });
          continue;
        }
      }

      // Check accommodation category mismatch
      if (ourCategory === 'accommodation') {
        const name = loc.name.toLowerCase();
        // Skip if name explicitly mentions food place
        if (!name.includes('restaurant') && !name.includes('cafe')) {
          if (INCOMPATIBLE_TYPES_FOR_ACCOMMODATION.includes(googleType)) {
            issues.push({
              id: `${loc.id}-google-type-mismatch`,
              type: 'GOOGLE_TYPE_MISMATCH',
              severity: 'high',
              locationId: loc.id,
              locationName: loc.name,
              city: loc.city,
              region: loc.region,
              message: `Category "${loc.category}" but Google type is "${loc.google_primary_type}" - likely wrong place_id`,
              details: {
                ourCategory: loc.category,
                googleType: loc.google_primary_type,
              },
              suggestedFix: {
                action: 'delete',
                reason: 'Google Place ID points to wrong location - needs re-enrichment',
                confidence: 85,
                source: 'detection',
              },
            });
          }
        }
      }
    }

    return issues;
  },
};

/**
 * Rule: Detect airport type when name doesn't contain "airport"
 */
const googleAirportMismatchRule: Rule = {
  id: 'google-airport-mismatch',
  name: 'Google Airport Mismatch',
  description: 'Detects when Google says location is an airport but name does not contain "airport"',
  category: 'google',
  issueTypes: ['GOOGLE_AIRPORT_MISMATCH'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;
      if (!loc.google_primary_type) continue;

      const googleType = loc.google_primary_type.toLowerCase();
      const googleTypes = loc.google_types?.map(t => t.toLowerCase()) || [];
      const name = loc.name.toLowerCase();

      // Check if Google says it's an airport but name doesn't indicate airport
      const isGoogleAirport = googleType === 'airport' || googleTypes.includes('airport');
      const nameHasAirport = name.includes('airport') || name.includes('空港');

      if (isGoogleAirport && !nameHasAirport) {
        issues.push({
          id: `${loc.id}-airport-mismatch`,
          type: 'GOOGLE_AIRPORT_MISMATCH',
          severity: 'critical',
          locationId: loc.id,
          locationName: loc.name,
          city: loc.city,
          region: loc.region,
          message: `Google type is "airport" but name "${loc.name}" doesn't contain "airport" - wrong place_id`,
          details: {
            googleType: loc.google_primary_type,
            googleTypes: loc.google_types,
          },
          suggestedFix: {
            action: 'delete',
            reason: 'Google Place ID points to airport but location name indicates otherwise',
            confidence: 95,
            source: 'detection',
          },
        });
      }
    }

    return issues;
  },
};

/**
 * Rule: Detect content mismatch between short_description and editorial_summary
 */
const googleContentMismatchRule: Rule = {
  id: 'google-content-mismatch',
  name: 'Google Content Mismatch',
  description: 'Detects when our description content conflicts with Google editorial summary',
  category: 'google',
  issueTypes: ['GOOGLE_CONTENT_MISMATCH'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;
      if (!loc.short_description || !loc.editorial_summary) continue;

      const shortDesc = loc.short_description.toLowerCase();
      const editorial = loc.editorial_summary.toLowerCase();

      // Check for food description but transport editorial
      const shortHasFood = FOOD_KEYWORDS.some(k => shortDesc.includes(k));
      const editorialHasTransport = TRANSPORT_KEYWORDS.some(k => editorial.includes(k));

      if (shortHasFood && editorialHasTransport) {
        issues.push({
          id: `${loc.id}-content-mismatch`,
          type: 'GOOGLE_CONTENT_MISMATCH',
          severity: 'critical',
          locationId: loc.id,
          locationName: loc.name,
          city: loc.city,
          region: loc.region,
          message: `Our description mentions food but Google editorial mentions transport - wrong place_id`,
          details: {
            shortDescription: loc.short_description?.slice(0, 100),
            editorialSummary: loc.editorial_summary?.slice(0, 100),
          },
          suggestedFix: {
            action: 'delete',
            reason: 'Content mismatch indicates Google returned wrong location',
            confidence: 90,
            source: 'detection',
          },
        });
      }
    }

    return issues;
  },
};

export const googleRules: Rule[] = [
  googleTypeMismatchRule,
  googleAirportMismatchRule,
  googleContentMismatchRule,
];
