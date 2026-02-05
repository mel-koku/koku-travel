/**
 * Category-related detection rules
 */

import type { Rule, Issue, RuleContext } from '../lib/types';
import { containsEventKeyword } from '../lib/utils';
import { shouldSkipLocation, getCategoryOverride } from '../lib/overrides';

/**
 * Rule: Detect events with wrong category
 */
const eventWrongCategoryRule: Rule = {
  id: 'event-wrong-category',
  name: 'Event Wrong Category',
  description: 'Detects locations that appear to be events but have wrong category',
  category: 'categories',
  issueTypes: ['EVENT_WRONG_CATEGORY'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    // Patterns that strongly indicate an event
    const eventPatterns = [
      /festival/i,
      /matsuri/i,
      /illumination/i,
      /fireworks/i,
      /parade/i,
      /celebration/i,
      /ceremony/i,
    ];

    // Categories that are appropriate for events
    const eventCategories = ['culture', 'nature', 'entertainment'];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Check if name matches event patterns
      const isEventName = eventPatterns.some(pattern => pattern.test(loc.name));
      if (!isEventName) continue;

      // Skip if already in appropriate category
      if (eventCategories.includes(loc.category)) continue;

      const override = getCategoryOverride(loc.id);

      issues.push({
        id: `${loc.id}-event-category`,
        type: 'EVENT_WRONG_CATEGORY',
        severity: 'medium',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Event "${loc.name}" has category "${loc.category}" but should likely be "culture"`,
        details: {
          currentCategory: loc.category,
          suggestedCategory: 'culture',
        },
        suggestedFix: override
          ? {
              action: 'update_category',
              newValue: override,
              reason: 'Override configured',
              confidence: 100,
              source: 'override',
            }
          : {
              action: 'update_category',
              newValue: 'culture',
              reason: 'Event names should be in culture category',
              confidence: 80,
              source: 'detection',
            },
      });
    }

    return issues;
  },
};

/**
 * Food keywords indicating a location is PRIMARILY a restaurant (not just has dining)
 * Only matches in the NAME to avoid false positives from descriptions mentioning dining
 */
const FOOD_NAME_KEYWORDS = [
  'udon', 'soba', 'ramen', 'tempura', 'izakaya', 'sushi', 'yakitori',
  'tonkatsu', 'bakery', 'noodle', 'grill', 'bistro', 'tavern', 'diner',
  'curry', 'gyudon', 'donburi', 'teppanyaki', 'yakiniku', 'shabu',
];

/**
 * Keywords indicating accommodation (to exclude false positives)
 */
const ACCOMMODATION_KEYWORDS = [
  'hotel', 'ryokan', 'inn', 'hostel', 'resort', 'onsen', 'minshuku',
  'guest house', 'guesthouse', 'lodge', 'pension', 'stay', 'b&b',
];

/**
 * Rule: Detect accommodation that might be restaurants
 * Only flags if name contains food keywords AND doesn't contain accommodation keywords
 */
const accommodationMiscategorizedRule: Rule = {
  id: 'accommodation-miscategorized',
  name: 'Accommodation Miscategorized',
  description: 'Detects locations in accommodation category that are actually restaurants',
  category: 'categories',
  issueTypes: ['ACCOMMODATION_MISCATEGORIZED'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Only check accommodation category
      if (loc.category?.toLowerCase() !== 'accommodation') continue;

      const nameLower = loc.name.toLowerCase();

      // Skip if name clearly indicates accommodation
      const isAccommodation = ACCOMMODATION_KEYWORDS.some(keyword =>
        nameLower.includes(keyword)
      );
      if (isAccommodation) continue;

      // Check for food keywords ONLY in the name
      // (descriptions might mention dining facilities which is normal for hotels)
      const hasFoodKeywordInName = FOOD_NAME_KEYWORDS.some(keyword =>
        nameLower.includes(keyword)
      );

      if (!hasFoodKeywordInName) continue;

      // Find which keyword matched for reporting
      const matchedKeyword = FOOD_NAME_KEYWORDS.find(keyword =>
        nameLower.includes(keyword)
      );

      const override = getCategoryOverride(loc.id);

      issues.push({
        id: `${loc.id}-accommodation-food`,
        type: 'ACCOMMODATION_MISCATEGORIZED',
        severity: 'high',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `"${loc.name}" is in accommodation category but name contains food keyword "${matchedKeyword}"`,
        details: {
          currentCategory: loc.category,
          matchedKeyword,
        },
        suggestedFix: override
          ? {
              action: 'update_category',
              newValue: override,
              reason: 'Override configured',
              confidence: 100,
              source: 'override',
            }
          : {
              action: 'update_category',
              newValue: 'food',
              reason: 'Name contains food-related keywords',
              confidence: 85,
              source: 'detection',
            },
      });
    }

    return issues;
  },
};

/**
 * Bar/restaurant keywords indicating a location is PRIMARILY a bar/food establishment
 * These are checked in the NAME only with word boundaries
 */
const BAR_FOOD_NAME_PATTERNS = [
  /\bbar\b/i, /\bbaru\b/i, /\bpub\b/i, /\bizakaya\b/i,
  /\bbrewery\b/i, /\bdistillery\b/i, /\bwinery\b/i, /\btavern\b/i,
  /\bramen\b/i, /\bsushi\b/i, /\budon\b/i, /\bsoba\b/i,
  /\byakitori\b/i, /\btonkatsu\b/i, /\bgyoza\b/i,
  /\bokonomiyaki\b/i, /\btakoyaki\b/i,
  /\bbistro\b/i, /\bdiner\b/i, /\beatery\b/i,
  /\bcafe\b/i, /\bcafé\b/i, /\bcoffee\b/i,
];

/**
 * Keywords that indicate it's a legitimate landmark (not food) - checked in name
 */
const LANDMARK_KEYWORDS = [
  'castle', 'temple', 'shrine', 'park', 'garden', 'museum', 'tower',
  'bridge', 'station', 'monument', 'memorial', 'palace', 'ruins',
  'mountain', 'falls', 'waterfall', 'beach', 'island', 'lake',
  'observatory', 'viewpoint', 'street', 'district', 'market', 'cave',
  'forest', 'shore', 'coast', 'village', 'town', 'complex', 'center',
  'cruise', 'mound', 'burial', 'onsen', 'bath',
];

/**
 * Rule: Detect landmarks that are actually bars/restaurants
 * Conservative rule - only flags based on NAME keywords (not description)
 */
const landmarkMiscategorizedRule: Rule = {
  id: 'landmark-miscategorized',
  name: 'Landmark Miscategorized',
  description: 'Detects locations in landmark category that are actually bars or restaurants',
  category: 'categories',
  issueTypes: ['LANDMARK_MISCATEGORIZED'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Only check landmark category
      if (loc.category?.toLowerCase() !== 'landmark') continue;

      const nameLower = loc.name.toLowerCase();

      // Skip if name clearly indicates a landmark
      const isLandmark = LANDMARK_KEYWORDS.some(keyword =>
        nameLower.includes(keyword)
      );
      if (isLandmark) continue;

      // Check for bar/food patterns in name using word boundaries
      const matchedPattern = BAR_FOOD_NAME_PATTERNS.find(pattern =>
        pattern.test(loc.name)
      );

      if (!matchedPattern) continue;

      // Extract the matched keyword for reporting
      const match = loc.name.match(matchedPattern);
      const matchedKeyword = match ? match[0].toLowerCase() : 'unknown';

      // Determine suggested category
      const barPatterns = [/\bbar\b/i, /\bbaru\b/i, /\bpub\b/i, /\bizakaya\b/i, /\bbrewery\b/i, /\bdistillery\b/i, /\bwinery\b/i, /\btavern\b/i];
      const isBar = barPatterns.some(p => p.test(loc.name));
      const suggestedCategory = isBar ? 'bar' : 'food';

      const override = getCategoryOverride(loc.id);

      issues.push({
        id: `${loc.id}-landmark-food`,
        type: 'LANDMARK_MISCATEGORIZED',
        severity: 'high',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `"${loc.name}" is in landmark category but appears to be a ${suggestedCategory} establishment (keyword: "${matchedKeyword}")`,
        details: {
          currentCategory: loc.category,
          matchedKeyword,
          suggestedCategory,
        },
        suggestedFix: override
          ? {
              action: 'update_category',
              newValue: override,
              reason: 'Override configured',
              confidence: 100,
              source: 'override',
            }
          : {
              action: 'update_category',
              newValue: suggestedCategory,
              reason: `Name indicates ${suggestedCategory} establishment`,
              confidence: 85,
              source: 'detection',
            },
      });
    }

    return issues;
  },
};

export const categoryRules: Rule[] = [
  eventWrongCategoryRule,
  accommodationMiscategorizedRule,
  landmarkMiscategorizedRule,
];
