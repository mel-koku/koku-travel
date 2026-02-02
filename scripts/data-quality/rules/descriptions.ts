/**
 * Description-related detection rules
 */

import type { Rule, Issue, RuleContext } from '../lib/types';
import {
  isAddressLikeDescription,
  isTruncatedDescription,
  isGenericDescription,
  generateCategoryDescription,
} from '../lib/utils';
import { shouldSkipLocation, getDescriptionOverride } from '../lib/overrides';

/**
 * Rule: Detect descriptions that are just addresses/postal codes
 */
const addressAsDescRule: Rule = {
  id: 'address-as-desc',
  name: 'Address as Description',
  description: 'Detects locations where the description is just an address or postal code',
  category: 'descriptions',
  issueTypes: ['ADDRESS_AS_DESC'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;
      if (!isAddressLikeDescription(loc.description)) continue;

      const override = getDescriptionOverride(loc.id);

      issues.push({
        id: `${loc.id}-address-desc`,
        type: 'ADDRESS_AS_DESC',
        severity: 'high',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Description is just an address: "${loc.description}"`,
        suggestedFix: override
          ? {
              action: 'update_description',
              newValue: override,
              reason: 'Override configured',
              confidence: 100,
              source: 'override',
            }
          : loc.editorial_summary && loc.editorial_summary.length > 50
            ? {
                action: 'update_description',
                newValue: loc.editorial_summary,
                reason: 'Use editorial summary',
                confidence: 90,
                source: 'editorial_summary',
              }
            : {
                action: 'update_description',
                reason: 'Needs Google Places lookup or manual entry',
                confidence: 0,
                source: 'detection',
              },
      });
    }

    return issues;
  },
};

/**
 * Rule: Detect truncated descriptions (start with lowercase)
 */
const truncatedDescRule: Rule = {
  id: 'truncated-desc',
  name: 'Truncated Description',
  description: 'Detects descriptions that appear cut off (start with lowercase)',
  category: 'descriptions',
  issueTypes: ['TRUNCATED_DESC'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;
      if (!loc.description) continue;
      if (!isTruncatedDescription(loc.description)) continue;

      const override = getDescriptionOverride(loc.id);

      issues.push({
        id: `${loc.id}-truncated-desc`,
        type: 'TRUNCATED_DESC',
        severity: 'medium',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Description appears truncated: "${loc.description.slice(0, 50)}..."`,
        details: {
          startsWithLowercase: true,
          descriptionPreview: loc.description.slice(0, 100),
        },
        suggestedFix: override
          ? {
              action: 'update_description',
              newValue: override,
              reason: 'Override configured',
              confidence: 100,
              source: 'override',
            }
          : loc.place_id
            ? {
                action: 'update_description',
                reason: 'Can fetch from Google Places API',
                confidence: 70,
                source: 'detection',
              }
            : loc.editorial_summary && loc.editorial_summary.length > 50
              ? {
                  action: 'update_description',
                  newValue: loc.editorial_summary,
                  reason: 'Use editorial summary',
                  confidence: 80,
                  source: 'editorial_summary',
                }
              : {
                  action: 'update_description',
                  reason: 'Needs manual entry (no place_id or editorial_summary)',
                  confidence: 0,
                  source: 'detection',
                },
      });
    }

    return issues;
  },
};

/**
 * Rule: Detect missing descriptions
 */
const missingDescRule: Rule = {
  id: 'missing-desc',
  name: 'Missing Description',
  description: 'Detects locations without descriptions (except food category)',
  category: 'descriptions',
  issueTypes: ['MISSING_DESC'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Skip food category - descriptions are optional
      if (loc.category === 'food' || loc.category === 'restaurant') continue;

      if (loc.description && loc.description.trim().length > 0) continue;

      const override = getDescriptionOverride(loc.id);

      issues.push({
        id: `${loc.id}-missing-desc`,
        type: 'MISSING_DESC',
        severity: 'medium',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Location has no description`,
        suggestedFix: override
          ? {
              action: 'update_description',
              newValue: override,
              reason: 'Override configured',
              confidence: 100,
              source: 'override',
            }
          : loc.editorial_summary && loc.editorial_summary.length > 50
            ? {
                action: 'update_description',
                newValue: loc.editorial_summary,
                reason: 'Use editorial summary',
                confidence: 90,
                source: 'editorial_summary',
              }
            : {
                action: 'update_description',
                newValue: generateCategoryDescription(loc.category, loc.city),
                reason: 'Generated from category template',
                confidence: 50,
                source: 'generated',
              },
      });
    }

    return issues;
  },
};

/**
 * Rule: Detect short/incomplete descriptions
 */
const shortIncompleteDescRule: Rule = {
  id: 'short-incomplete-desc',
  name: 'Short Incomplete Description',
  description: 'Detects descriptions that are too short and incomplete',
  category: 'descriptions',
  issueTypes: ['SHORT_INCOMPLETE_DESC'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;
      if (!loc.description) continue;

      const desc = loc.description.trim();

      // Skip if description is long enough
      if (desc.length >= 30) continue;

      // Skip if it's just an address (caught by other rule)
      if (isAddressLikeDescription(desc)) continue;

      // Skip if it ends with a period (might be intentionally brief)
      if (desc.endsWith('.')) continue;

      issues.push({
        id: `${loc.id}-short-desc`,
        type: 'SHORT_INCOMPLETE_DESC',
        severity: 'low',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Description is very short (${desc.length} chars): "${desc}"`,
        details: {
          length: desc.length,
        },
        suggestedFix: loc.editorial_summary && loc.editorial_summary.length > desc.length
          ? {
              action: 'update_description',
              newValue: loc.editorial_summary,
              reason: 'Use longer editorial summary',
              confidence: 80,
              source: 'editorial_summary',
            }
          : {
              action: 'update_description',
              reason: 'Needs expansion',
              confidence: 0,
              source: 'detection',
            },
      });
    }

    return issues;
  },
};

/**
 * Rule: Detect generic placeholder descriptions
 */
const genericDescRule: Rule = {
  id: 'generic-desc',
  name: 'Generic Description',
  description: 'Detects generic placeholder descriptions',
  category: 'descriptions',
  issueTypes: ['GENERIC_DESC'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;
      if (!loc.description) continue;
      if (!isGenericDescription(loc.description)) continue;

      issues.push({
        id: `${loc.id}-generic-desc`,
        type: 'GENERIC_DESC',
        severity: 'low',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Description is too generic: "${loc.description}"`,
        suggestedFix: loc.editorial_summary && loc.editorial_summary.length > 50
          ? {
              action: 'update_description',
              newValue: loc.editorial_summary,
              reason: 'Use editorial summary',
              confidence: 85,
              source: 'editorial_summary',
            }
          : {
              action: 'update_description',
              reason: 'Needs more specific description',
              confidence: 0,
              source: 'detection',
            },
      });
    }

    return issues;
  },
};

export const descriptionRules: Rule[] = [
  addressAsDescRule,
  truncatedDescRule,
  missingDescRule,
  shortIncompleteDescRule,
  genericDescRule,
];
