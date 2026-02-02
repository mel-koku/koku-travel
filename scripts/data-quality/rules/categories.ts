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

export const categoryRules: Rule[] = [
  eventWrongCategoryRule,
];
