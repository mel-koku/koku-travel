/**
 * Override loading for data quality scripts
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Overrides } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OVERRIDES_PATH = resolve(__dirname, '..', 'overrides.json');

let cachedOverrides: Overrides | null = null;

/**
 * Load overrides from JSON file
 */
export function loadOverrides(): Overrides {
  if (cachedOverrides) {
    return cachedOverrides;
  }

  if (!existsSync(OVERRIDES_PATH)) {
    console.warn(`Warning: Overrides file not found at ${OVERRIDES_PATH}`);
    return getEmptyOverrides();
  }

  try {
    const content = readFileSync(OVERRIDES_PATH, 'utf-8');
    cachedOverrides = JSON.parse(content) as Overrides;

    // Validate structure
    if (!cachedOverrides.names) cachedOverrides.names = {};
    if (!cachedOverrides.descriptions) cachedOverrides.descriptions = {};
    if (!cachedOverrides.duplicates) cachedOverrides.duplicates = [];
    if (!cachedOverrides.skip) cachedOverrides.skip = [];
    if (!cachedOverrides.categories) cachedOverrides.categories = {};

    return cachedOverrides;
  } catch (error) {
    console.error(`Error loading overrides: ${error}`);
    return getEmptyOverrides();
  }
}

/**
 * Get empty overrides object
 */
export function getEmptyOverrides(): Overrides {
  return {
    names: {},
    descriptions: {},
    duplicates: [],
    skip: [],
    categories: {},
  };
}

/**
 * Check if a location has a name override
 */
export function getNameOverride(locationId: string): string | null {
  const overrides = loadOverrides();
  return overrides.names[locationId] || null;
}

/**
 * Check if a location has a description override
 */
export function getDescriptionOverride(locationId: string): string | null {
  const overrides = loadOverrides();
  return overrides.descriptions[locationId] || null;
}

/**
 * Check if a location should be skipped
 */
export function shouldSkipLocation(locationId: string): boolean {
  const overrides = loadOverrides();
  return overrides.skip.includes(locationId);
}

/**
 * Get duplicate resolution for a location
 */
export function getDuplicateResolution(locationId: string): { action: 'keep' | 'delete'; reason?: string } | null {
  const overrides = loadOverrides();

  for (const dup of overrides.duplicates) {
    if (dup.keep === locationId) {
      return { action: 'keep', reason: dup.reason };
    }
    if (dup.delete.includes(locationId)) {
      return { action: 'delete', reason: dup.reason };
    }
  }

  return null;
}

/**
 * Get category override for a location
 */
export function getCategoryOverride(locationId: string): string | null {
  const overrides = loadOverrides();
  return overrides.categories[locationId] || null;
}

/**
 * Clear cached overrides (for testing or reload)
 */
export function clearOverridesCache(): void {
  cachedOverrides = null;
}
