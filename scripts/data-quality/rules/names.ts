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
import {
  cityNeedsNormalization,
  getCityNormalizationSuggestion,
  findMismatchedCityInName,
} from '../lib/geography';

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
 * Categories where single-word names are likely incomplete
 */
const CATEGORIES_NEEDING_FULL_NAMES = [
  'culture',
  'landmark',
  'museum',
  'attraction',
  'entertainment',
];

/**
 * Japanese geographic suffixes that indicate complete place names
 * These are single words that represent geographic features or areas
 */
const JAPANESE_GEOGRAPHIC_SUFFIXES = [
  'jima', 'shima',  // island (-島)
  'yama', 'san', 'dake', 'take', // mountain (-山, -岳)
  'kawa', 'gawa',   // river (-川)
  'machi', 'cho',   // town/district (-町)
  'juku', 'shuku',  // post town (-宿)
  'ji', 'dera', 'in', // temple (-寺, -院)
  'gu', 'sha', 'jinja', // shrine (-宮, -社, -神社)
  'ko', 'ike',      // lake/pond (-湖, -池)
  'hama', 'ura',    // beach/bay (-浜, -浦)
  'saki', 'zaki', 'misaki', // cape (-崎, -岬)
  'kyo', 'kei',     // gorge/valley (-峡, -渓)
  'dori', 'tori',   // street (-通り)
  'bashi', 'hashi', // bridge (-橋)
  'mon', 'kaku',    // gate/tower (-門, -閣)
  'en', 'tei',      // garden (-園, -庭)
  'onsen',          // hot spring (-温泉)
  'so', 'sou',      // villa/lodge (-荘)
  'kan',            // hall/building (-館)
  'bo',             // cliff/bluff (-坊)
  'daira', 'taira', // plateau (-平)
  'taki',           // waterfall (-滝)
  'hetsuri',        // eroded cliff (specific to Tō-no-Hetsuri)
  'kogen',          // highland (-高原)
];

/**
 * Known Japanese districts, neighborhoods, and areas that are complete single-word names
 */
const KNOWN_AREA_NAMES = [
  // Tokyo districts
  'shibuya', 'shinjuku', 'harajuku', 'akihabara', 'ginza', 'asakusa', 'roppongi',
  'ikebukuro', 'ueno', 'akasaka', 'azabu', 'meguro', 'nakameguro', 'shimokitazawa',
  'kagurazaka', 'kabukicho', 'odaiba', 'shiodome', 'marunouchi', 'nihonbashi',
  'inokashira', 'kiyosumi', 'sumiyoshi',
  // Osaka districts
  'namba', 'dotonbori', 'shinsekai', 'umeda', 'shinsaibashi', 'tennoji',
  // Kyoto districts
  'gion', 'arashiyama', 'higashiyama', 'pontocho', 'kitayama', 'naramachi', 'rakusei',
  // Other city districts
  'tenjin', 'nakasu', 'motomachi', 'sannomiya', 'sakae', 'chinatown', 'hamaotsu',
  'sakamoto', 'shuri', 'arimatsu',
  // Famous islands
  'naoshima', 'miyajima', 'enoshima', 'hashima', 'gunkanjima', 'yakushima',
  'iriomote', 'ishigaki', 'taketomi', 'zamami', 'tokashiki', 'okinawa', 'manazuru',
  // Famous areas/regions
  'hakone', 'nikko', 'kamakura', 'nara', 'kobe', 'yokohama', 'nagasaki',
  'hiroshima', 'kanazawa', 'takayama', 'shirakawago', 'tsumago', 'magome',
  'karuizawa', 'furano', 'biei', 'otaru', 'noboribetsu', 'hakodate',
  // Other notable single-word places
  'dorogawa', 'kurokawa', 'kinosaki', 'beppu', 'yufuin', 'ibusuki',
  // Mountain areas and valleys
  'kamikochi', 'owakudani', 'shiobara', 'yugawara', 'nagatoro',
  // Historic towns and areas
  'sawara', 'mimitsu', 'yuasa', 'soma',
  // Geographic features (cliffs, etc.)
  'tojinbo',
  // Famous landmarks (single word is the full name)
  'kabukiza', 'tamaudun',
  // Additional area names
  'shiraho', 'shizunai', 'mikamine', 'sakitama', 'senbonmatsu', 'kuroshio',
];

/**
 * Check if a name ends with a Japanese geographic suffix
 */
function hasJapaneseGeographicSuffix(name: string): boolean {
  // Normalize macrons: ō→o, ū→u, etc.
  const normalized = name.toLowerCase()
    .replace(/[ōôó]/g, 'o')
    .replace(/[ūûú]/g, 'u')
    .replace(/[āâá]/g, 'a')
    .replace(/[ēêé]/g, 'e')
    .replace(/[īîí]/g, 'i');
  return JAPANESE_GEOGRAPHIC_SUFFIXES.some(suffix =>
    normalized.endsWith(suffix) && normalized.length > suffix.length
  );
}

/**
 * Check if a name is a known area/district name
 */
function isKnownAreaName(name: string): boolean {
  // Normalize: remove diacritics and convert to lowercase
  const normalized = name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ōōô]/g, 'o')
    .replace(/[ūûü]/g, 'u')
    .replace(/[-]/g, '');
  return KNOWN_AREA_NAMES.includes(normalized);
}

/**
 * Rule: Detect single-word names for categories that typically need fuller names
 */
const shortIncompleteNameRule: Rule = {
  id: 'short-incomplete-name',
  name: 'Short Incomplete Name',
  description: 'Detects single-word names for culture/landmark/museum categories that likely need fuller names',
  category: 'names',
  issueTypes: ['SHORT_INCOMPLETE_NAME'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Only check relevant categories
      if (!CATEGORIES_NEEDING_FULL_NAMES.includes(loc.category?.toLowerCase())) continue;

      // Check if name is a single word (no spaces)
      // Names with hyphens are considered multi-word (e.g., "Kisouma-no-sato")
      const words = loc.name.trim().split(/[\s-]+/);
      if (words.length > 1) continue;

      // Skip if name is very short (likely abbreviation or special case)
      if (loc.name.length < 4) continue;

      // Skip common short names that are complete (e.g., proper nouns)
      const shortNameExceptions = ['spa', 'inn', 'pub', 'bar'];
      if (shortNameExceptions.includes(loc.name.toLowerCase())) continue;

      // Skip if name matches city (these are district/area entries)
      if (loc.name.toLowerCase() === loc.city.toLowerCase()) continue;

      // Skip if name has a Japanese geographic suffix (island, mountain, temple, etc.)
      if (hasJapaneseGeographicSuffix(loc.name)) continue;

      // Skip if it's a known district/area/neighborhood name
      if (isKnownAreaName(loc.name)) continue;

      const override = getNameOverride(loc.id);

      issues.push({
        id: `${loc.id}-short-name`,
        type: 'SHORT_INCOMPLETE_NAME',
        severity: 'high',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Single-word name "${loc.name}" in ${loc.category} category - likely incomplete`,
        details: {
          category: loc.category,
          wordCount: 1,
          hasPlaceId: !!loc.place_id,
        },
        suggestedFix: override
          ? {
              action: 'rename',
              newValue: override,
              reason: 'Override configured',
              confidence: 100,
              source: 'override',
            }
          : loc.place_id
            ? {
                action: 'rename',
                reason: 'Needs Google Places lookup to determine full name',
                confidence: 70,
                source: 'detection',
              }
            : {
                action: 'rename',
                reason: 'Needs manual lookup or place_id for Google verification',
                confidence: 30,
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

/**
 * Rule: Detect city spelling variants that need normalization
 */
const citySpellingVariantRule: Rule = {
  id: 'city-spelling-variant',
  name: 'City Spelling Variant',
  description: 'Detects city names that need normalization (e.g., "Amakusa, Kumamoto" -> "Amakusa")',
  category: 'names',
  issueTypes: ['CITY_SPELLING_VARIANT'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Check if city needs normalization
      if (!cityNeedsNormalization(loc.city)) continue;

      const suggestion = getCityNormalizationSuggestion(loc.city);
      if (!suggestion) continue;

      issues.push({
        id: `${loc.id}-city-variant`,
        type: 'CITY_SPELLING_VARIANT',
        severity: 'medium',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `City "${loc.city}" should be normalized to "${suggestion.normalized}"`,
        details: {
          currentCity: loc.city,
          normalizedCity: suggestion.normalized,
          reason: suggestion.reason,
        },
        suggestedFix: {
          action: 'skip',
          reason: `Normalize city name: ${suggestion.reason}`,
          confidence: 80,
          source: 'detection',
        },
      });
    }

    return issues;
  },
};

/**
 * Rule: Detect location names containing a different city name
 */
const nameCityMismatchRule: Rule = {
  id: 'name-city-mismatch',
  name: 'Name City Mismatch',
  description: 'Detects location names that contain a different city name than where they are located',
  category: 'names',
  issueTypes: ['NAME_CITY_MISMATCH'],

  async detect(ctx: RuleContext): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const loc of ctx.locations) {
      if (shouldSkipLocation(loc.id)) continue;

      // Find mismatched city in name
      const mismatchedCity = findMismatchedCityInName(loc.name, loc.city);
      if (!mismatchedCity) continue;

      issues.push({
        id: `${loc.id}-name-city-mismatch`,
        type: 'NAME_CITY_MISMATCH',
        severity: 'medium',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        region: loc.region,
        message: `Location "${loc.name}" contains city name "${mismatchedCity}" but is located in ${loc.city}`,
        details: {
          actualCity: loc.city,
          cityInName: mismatchedCity,
        },
        suggestedFix: {
          action: 'skip',
          reason: 'Needs manual review - may be correct (e.g., "Osaka-style Okonomiyaki" in Kyoto) or data error',
          confidence: 30,
          source: 'detection',
        },
      });
    }

    return issues;
  },
};

export const nameRules: Rule[] = [
  eventNameMismatchRule,
  nameIdMismatchRule,
  allCapsNameRule,
  badNameStartRule,
  genericPluralRule,
  genericArticleRule,
  truncatedNameRule,
  shortIncompleteNameRule,
  citySpellingVariantRule,
  nameCityMismatchRule,
];
