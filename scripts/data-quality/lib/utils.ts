/**
 * Shared utilities for data quality scripts
 */

import type { Location, Severity } from './types';

// Event keywords that suggest a location name is actually an event/festival name
export const EVENT_KEYWORDS = [
  'festival', 'matsuri', 'matsui', 'noh', 'ebisu', 'honen', 'setsubun',
  'yayoi', 'toka', 'takigi', 'chibikko', 'oto', 'owari', 'kanda',
  'illumination', 'fireworks', 'parade', 'gozan'
];

// Keywords that indicate a shrine/temple in editorial summary
export const SHRINE_TEMPLE_KEYWORDS = [
  'shrine', 'temple', 'pagoda', 'torii', 'buddhist', 'shinto',
  'founded', 'established', 'century', 'worship', 'sacred',
  'deity', 'god', 'goddess'
];

// Keywords in location names that indicate it's already correctly named
export const SHRINE_TEMPLE_NAME_KEYWORDS = [
  'shrine', 'temple', 'jinja', 'taisha', 'jingu', '-ji', 'gu',
  'castle', 'sanctuary', 'pagoda'
];

// Patterns that indicate a description is just an address
export const ADDRESS_PATTERNS = [
  /^〒?\d{3}[-]?\d{4}/,              // Japanese postal code (〒xxx-xxxx)
  /^\d{1,4}[-\s]\d{1,4}[-\s]/,      // Street address pattern (numbers with dashes/spaces)
  /^[\d\s,]+$/,                     // Just numbers
  /^\d+-\d+\s+\w+,\s+\w+/,          // Pattern like "4-459-1 Dōgosagidanichō, Matsuyama"
];

// Patterns that indicate a generic/placeholder description
export const GENERIC_DESC_PATTERNS = [
  /^(beach|attraction|museum|temple|shrine|park) in/i,
  /^A (restaurant|cafe|shop) in/i,
];

/**
 * Check if a name contains event keywords
 */
export function containsEventKeyword(name: string): boolean {
  const lowerName = name.toLowerCase();
  return EVENT_KEYWORDS.some(keyword => lowerName.includes(keyword));
}

/**
 * Check if text contains shrine/temple keywords
 */
export function containsShrineTempIeKeyword(text: string): boolean {
  const lowerText = text.toLowerCase();
  return SHRINE_TEMPLE_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

/**
 * Check if name already has proper shrine/temple suffix
 */
export function hasProperShrineTempIeSuffix(name: string): boolean {
  const lowerName = name.toLowerCase();
  return SHRINE_TEMPLE_NAME_KEYWORDS.some(keyword => lowerName.includes(keyword));
}

/**
 * Check if a description looks like an address
 */
export function isAddressLikeDescription(desc: string | null | undefined): boolean {
  if (!desc) return false;

  // If the description is longer than 100 characters, it's likely a real description
  if (desc.length > 100) return false;

  // Check against address patterns
  return ADDRESS_PATTERNS.some(pattern => pattern.test(desc));
}

/**
 * Check if a description appears truncated (starts with lowercase)
 */
export function isTruncatedDescription(desc: string | null | undefined): boolean {
  if (!desc) return false;
  return /^[a-z]/.test(desc);
}

/**
 * Check if a description is generic/placeholder
 */
export function isGenericDescription(desc: string | null | undefined): boolean {
  if (!desc) return false;
  return GENERIC_DESC_PATTERNS.some(pattern => pattern.test(desc));
}

/**
 * Check if a name is in ALL CAPS
 */
export function isAllCaps(name: string): boolean {
  // Must have at least one letter
  if (!/[a-zA-Z]/.test(name)) return false;
  // All letters must be uppercase
  const letters = name.replace(/[^a-zA-Z]/g, '');
  return letters === letters.toUpperCase() && letters.length > 2;
}

/**
 * Check if a name starts with a bad character
 */
export function hasBadNameStart(name: string): boolean {
  return /^[-_\/\(\)]/.test(name);
}

/**
 * Check if a name is a generic plural
 */
export function isGenericPlural(name: string): boolean {
  const pluralPatterns = [
    /^(sake|ramen|sushi|udon|soba)\s+(shops?|restaurants?|breweries)/i,
    /^(local|traditional)\s+\w+s$/i,
  ];
  return pluralPatterns.some(p => p.test(name));
}

/**
 * Convert name to slug format
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Calculate confidence score for event name mismatch
 */
export function calculateEventMismatchConfidence(
  name: string,
  editorialSummary: string | null | undefined
): number {
  let score = 0;

  // Event keyword in name: +20 per keyword
  const lowerName = name.toLowerCase();
  for (const keyword of EVENT_KEYWORDS) {
    if (lowerName.includes(keyword)) {
      score += 20;
    }
  }

  // Shrine/temple keyword in editorial summary: +10 per keyword
  if (editorialSummary) {
    const lowerSummary = editorialSummary.toLowerCase();
    for (const keyword of SHRINE_TEMPLE_KEYWORDS) {
      if (lowerSummary.includes(keyword)) {
        score += 10;
      }
    }

    // Founding date mentioned: +15
    if (/\d{3,4}\s*(ad|ce|century|year)/i.test(editorialSummary)) {
      score += 15;
    }
  }

  // Short name (< 15 chars): +10
  if (name.length < 15) {
    score += 10;
  }

  // Missing shrine/temple suffix in name: +15
  if (!hasProperShrineTempIeSuffix(name)) {
    score += 15;
  }

  return Math.min(score, 100);
}

/**
 * Get severity based on issue characteristics
 */
export function getSeverityForIssue(
  type: string,
  confidence?: number
): Severity {
  // Critical: data corruption or major user impact
  if (['DUPLICATE_SAME_CITY'].includes(type)) {
    return 'critical';
  }

  // High: significant data quality issues
  if (['ADDRESS_AS_DESC', 'EVENT_NAME_MISMATCH', 'MISSING_COORDINATES'].includes(type)) {
    return confidence && confidence >= 80 ? 'high' : 'medium';
  }

  // Medium: moderate issues
  if (['TRUNCATED_DESC', 'ALL_CAPS_NAME', 'EVENT_WRONG_CATEGORY'].includes(type)) {
    return 'medium';
  }

  // Low: minor issues
  if (['NAME_ID_MISMATCH', 'SHORT_INCOMPLETE_DESC', 'DUPLICATE_MANY'].includes(type)) {
    return 'low';
  }

  // Info: informational only
  return 'info';
}

/**
 * Generate a description based on category
 */
export function generateCategoryDescription(category: string, city: string): string {
  const templates: Record<string, string> = {
    museum: `A museum in ${city} showcasing local culture and history.`,
    restaurant: `A dining establishment in ${city} offering local cuisine.`,
    food: `A food establishment in ${city} serving regional specialties.`,
    shrine: `A sacred Shinto shrine in ${city} with spiritual significance.`,
    temple: `A Buddhist temple in ${city} with historical and spiritual importance.`,
    landmark: `A notable landmark in ${city} worth visiting.`,
    entertainment: `An entertainment venue in ${city} offering activities and experiences.`,
    viewpoint: `A scenic viewpoint in ${city} with panoramic views.`,
    attraction: `A popular attraction in ${city} for visitors.`,
    nature: `A natural area in ${city} offering scenic beauty.`,
    culture: `A cultural site in ${city} with historical significance.`,
    shopping: `A shopping destination in ${city} for local goods.`,
    accommodation: `Accommodation in ${city} for travelers.`,
  };

  return templates[category.toLowerCase()] || `A point of interest in ${city}.`;
}

/**
 * Delay helper for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Group items by a key
 */
export function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * Find duplicates in an array of locations by name
 */
export function findDuplicatesByName(locations: Location[]): Map<string, Location[]> {
  const byName = new Map<string, Location[]>();

  for (const loc of locations) {
    const normalizedName = loc.name.toLowerCase().trim();
    const existing = byName.get(normalizedName) || [];
    existing.push(loc);
    byName.set(normalizedName, existing);
  }

  // Only return entries with more than one location
  const duplicates = new Map<string, Location[]>();
  for (const [name, locs] of byName) {
    if (locs.length > 1) {
      duplicates.set(name, locs);
    }
  }

  return duplicates;
}
