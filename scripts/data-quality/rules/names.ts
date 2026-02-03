/**
 * Name-related detection rules
 */

import type { Rule, Issue, RuleContext } from '../lib/types';
import {
  containsEventKeyword,
  containsShrineTempIeKeyword,
  hasProperShrineTempIeSuffix,
  calculateEventMismatchConfidence,
  isAllCaps,
  hasBadNameStart,
  isGenericPlural,
  toSlug,
  getSeverityForIssue,
} from '../lib/utils';
import { shouldSkipLocation, getNameOverride } from '../lib/overrides';

/**
 * Rule: Detect event names that should be shrine/temple names
 */
const eventNameMismatchRule: Rule = {
  id: 'event-name-mismatch',
  name: 'Event Name Mismatch',
  description: 'Detects locations where the name is an event/festival but should be a shrine/temple',
  category: 'names',
  issueTypes: ['EVENT_NAME_MISMATCH'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Check if name contains event keywords
      if (!containsEventKeyword(loc.name)) continue;

      // Skip if already has proper shrine/temple suffix
      if (hasProperShrineTempIeSuffix(loc.name)) continue;

      // Check if editorial_summary suggests it's a shrine/temple
      if (!loc.editorial_summary || !containsShrineTempIeKeyword(loc.editorial_summary)) continue;

      const confidence = calculateEventMismatchConfidence(loc.name, loc.editorial_summary);

      // Only report if confidence is above threshold
      if (confidence < 40) continue;

      const override = getNameOverride(loc.id);

      issues.push({
        id: `${loc.id}-event-name`,
        type: 'EVENT_NAME_MISMATCH',
        severity: getSeverityForIssue('EVENT_NAME_MISMATCH', confidence),
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Event name "${loc.name}" appears to describe a shrine/temple based on editorial summary`,
        details: {
          confidence,
          editorialSummary: loc.editorial_summary?.slice(0, 100) + '...',
        },
        suggestedFix: override
          ? {
              action: 'rename',
              newValue: override,
              reason: 'Override configured',
              confidence: 100,
              source: 'override',
            }
          : {
              action: 'rename',
              reason: 'Needs Google Places lookup to determine correct name',
              confidence,
              source: 'detection',
            },
      });
    }

    return issues;
  },
};

/**
 * Rule: Detect name/ID slug mismatches
 */
const nameIdMismatchRule: Rule = {
  id: 'name-id-mismatch',
  name: 'Name/ID Mismatch',
  description: 'Detects locations where the ID slug does not match the current name',
  category: 'names',
  issueTypes: ['NAME_ID_MISMATCH'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      const nameSlug = toSlug(loc.name);
      const idSlug = loc.id.replace(/-[a-f0-9]{8}$/, ''); // Remove UUID suffix

      // Check if slug from name is significantly different from ID
      if (nameSlug === idSlug) continue;
      if (idSlug.includes(nameSlug) || nameSlug.includes(idSlug)) continue;

      // Skip if it's a short mismatch (often just formatting)
      if (Math.abs(nameSlug.length - idSlug.length) < 5) continue;

      // Extract UUID suffix from current ID and generate new ID
      const uuidSuffix = loc.id.match(/-([a-f0-9]{8})$/)?.[1] || '';
      const regionSlug = loc.region.toLowerCase().replace(/\s+/g, '-');
      const newId = uuidSuffix ? `${nameSlug}-${regionSlug}-${uuidSuffix}` : `${nameSlug}-${regionSlug}`;

      issues.push({
        id: `${loc.id}-name-id`,
        type: 'NAME_ID_MISMATCH',
        severity: 'low',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `ID slug "${idSlug}" doesn't match name slug "${nameSlug}"`,
        details: {
          idSlug,
          nameSlug,
          newId,
        },
        suggestedFix: {
          action: 'update_id',
          newValue: newId,
          reason: 'ID regenerated from current name',
          confidence: 100,
          source: 'generated',
        },
      });
    }

    return issues;
  },
};

/**
 * Rule: Detect ALL CAPS names
 */
const allCapsNameRule: Rule = {
  id: 'all-caps-name',
  name: 'All Caps Name',
  description: 'Detects location names that are in ALL CAPS and need reformatting',
  category: 'names',
  issueTypes: ['ALL_CAPS_NAME'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;
      if (!isAllCaps(loc.name)) continue;

      const override = getNameOverride(loc.id);

      issues.push({
        id: `${loc.id}-all-caps`,
        type: 'ALL_CAPS_NAME',
        severity: 'medium',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Name "${loc.name}" is in ALL CAPS`,
        suggestedFix: override
          ? {
              action: 'rename',
              newValue: override,
              reason: 'Override configured',
              confidence: 100,
              source: 'override',
            }
          : {
              action: 'rename',
              newValue: toTitleCase(loc.name),
              reason: 'Converted to title case',
              confidence: 80,
              source: 'generated',
            },
      });
    }

    return issues;
  },
};

/**
 * Rule: Detect names starting with bad characters
 */
const badNameStartRule: Rule = {
  id: 'bad-name-start',
  name: 'Bad Name Start',
  description: 'Detects location names starting with special characters',
  category: 'names',
  issueTypes: ['BAD_NAME_START'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;
      if (!hasBadNameStart(loc.name)) continue;

      issues.push({
        id: `${loc.id}-bad-start`,
        type: 'BAD_NAME_START',
        severity: 'medium',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Name "${loc.name}" starts with a special character`,
        suggestedFix: {
          action: 'rename',
          newValue: loc.name.replace(/^[-_\/\(\)]+/, '').trim(),
          reason: 'Removed leading special characters',
          confidence: 90,
          source: 'generated',
        },
      });
    }

    return issues;
  },
};

/**
 * Rule: Detect generic plural names
 */
const genericPluralRule: Rule = {
  id: 'generic-plural-name',
  name: 'Generic Plural Name',
  description: 'Detects generic plural names like "Ramen Shops"',
  category: 'names',
  issueTypes: ['GENERIC_PLURAL_NAME'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;
      if (!isGenericPlural(loc.name)) continue;

      issues.push({
        id: `${loc.id}-generic-plural`,
        type: 'GENERIC_PLURAL_NAME',
        severity: 'medium',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Name "${loc.name}" is a generic plural category, not a specific location`,
      });
    }

    return issues;
  },
};

/**
 * Rule: Detect generic article names like "The X"
 */
const genericArticleRule: Rule = {
  id: 'generic-article-name',
  name: 'Generic Article Name',
  description: 'Detects names like "The X" or single generic words',
  category: 'names',
  issueTypes: ['GENERIC_ARTICLE_NAME'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Check for "The X" pattern where X is a single word
      if (/^The\s+\w+$/i.test(loc.name) && loc.name.split(' ').length === 2) {
        issues.push({
          id: `${loc.id}-generic-article`,
          type: 'GENERIC_ARTICLE_NAME',
          severity: 'low',
          locationId: loc.id,
          locationName: loc.name,
          city: loc.city,
          region: loc.region,
          message: `Name "${loc.name}" is too generic (article + single word)`,
        });
      }
    }

    return issues;
  },
};

/**
 * Words that typically require a suffix (e.g., "Imperial" needs "Palace" or "Villa")
 */
const TRUNCATED_NAME_ENDINGS = [
  'Imperial',   // Imperial Palace, Imperial Villa
  'National',   // National Park, National Museum
  'Memorial',   // Memorial Museum, Memorial Park
  'Peace',      // Peace Memorial, Peace Park
  'Royal',      // Royal Palace, Royal Garden
  'Prefectural', // Prefectural Museum, Prefectural Park
  'Municipal',  // Municipal Museum, Municipal Hall
  'City',       // City Hall, City Museum (when standalone)
];

/**
 * Rule: Detect truncated names that are missing their suffix
 */
const truncatedNameRule: Rule = {
  id: 'truncated-name',
  name: 'Truncated Name',
  description: 'Detects names that appear cut off and are missing their suffix',
  category: 'names',
  issueTypes: ['TRUNCATED_NAME'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      const words = loc.name.split(/\s+/);
      const lastWord = words[words.length - 1];

      // Check if name ends with a word that typically needs a suffix
      if (!TRUNCATED_NAME_ENDINGS.includes(lastWord)) continue;

      // Skip if name is very long (likely complete)
      if (words.length > 4) continue;

      // Skip if it's just a single word (might be intentional brand name)
      if (words.length === 1) continue;

      const override = getNameOverride(loc.id);

      issues.push({
        id: `${loc.id}-truncated-name`,
        type: 'TRUNCATED_NAME',
        severity: 'high',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Name "${loc.name}" appears truncated - missing suffix after "${lastWord}"`,
        details: {
          truncatedEnding: lastWord,
          editorialSummary: loc.editorial_summary?.slice(0, 100),
        },
        suggestedFix: override
          ? {
              action: 'rename',
              newValue: override,
              reason: 'Override configured',
              confidence: 100,
              source: 'override',
            }
          : {
              action: 'rename',
              reason: 'Needs Google Places lookup to determine full name',
              confidence: 50,
              source: 'detection',
            },
      });
    }

    return issues;
  },
};

/**
 * Convert ALL CAPS string to Title Case
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const nameRules: Rule[] = [
  eventNameMismatchRule,
  nameIdMismatchRule,
  allCapsNameRule,
  badNameStartRule,
  genericPluralRule,
  genericArticleRule,
  truncatedNameRule,
];
