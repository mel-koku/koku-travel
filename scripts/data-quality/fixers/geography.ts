/**
 * Geography-related fixers
 */

import type { Fixer, Issue, FixerContext, FixResult } from '../lib/types';
import { updateLocation } from '../lib/db';
import { normalizeCityName } from '../lib/geography';

/**
 * Fixer for geography-related issues
 */
export const geographyFixer: Fixer = {
  handles: ['PREFECTURE_REGION_MISMATCH', 'CITY_SPELLING_VARIANT'],

  async fix(issue: Issue, ctx: FixerContext): Promise<FixResult> {
    // Handle city normalization
    if (issue.type === 'CITY_SPELLING_VARIANT') {
      return fixCitySpellingVariant(issue, ctx);
    }

    // Handle region mismatch
    const { suggestedFix } = issue;

    if (!suggestedFix || suggestedFix.action !== 'update_region' || !suggestedFix.newValue) {
      return {
        success: false,
        action: 'skip',
        locationId: issue.locationId,
        message: 'No valid region fix suggested',
      };
    }

    const newRegion = suggestedFix.newValue;

    if (ctx.dryRun) {
      return {
        success: true,
        action: 'update_region',
        locationId: issue.locationId,
        message: `Would update region from "${issue.region}" to "${newRegion}"`,
        previousValue: issue.region,
        newValue: newRegion,
      };
    }

    // Perform the actual update
    const result = await updateLocation(issue.locationId, { region: newRegion } as Record<string, unknown>);

    if (!result.success) {
      return {
        success: false,
        action: 'update_region',
        locationId: issue.locationId,
        message: `Failed to update region: ${result.error}`,
        error: result.error,
      };
    }

    return {
      success: true,
      action: 'update_region',
      locationId: issue.locationId,
      message: `Updated region from "${issue.region}" to "${newRegion}"`,
      previousValue: issue.region,
      newValue: newRegion,
    };
  },
};

/**
 * Fix city spelling variant issues
 */
async function fixCitySpellingVariant(
  issue: Issue,
  ctx: FixerContext
): Promise<FixResult> {
  const currentCity = issue.city;
  const normalizedCity = issue.details?.normalizedCity as string || normalizeCityName(currentCity);

  if (normalizedCity === currentCity) {
    return {
      success: true,
      action: 'skip',
      locationId: issue.locationId,
      message: `City "${currentCity}" is already normalized`,
    };
  }

  if (ctx.dryRun) {
    return {
      success: true,
      action: 'update_city',
      locationId: issue.locationId,
      message: `[DRY RUN] Would normalize city from "${currentCity}" to "${normalizedCity}"`,
      previousValue: currentCity,
      newValue: normalizedCity,
    };
  }

  const result = await updateLocation(issue.locationId, { city: normalizedCity });

  if (!result.success) {
    return {
      success: false,
      action: 'update_city',
      locationId: issue.locationId,
      message: `Failed to normalize city: ${result.error}`,
      error: result.error,
    };
  }

  return {
    success: true,
    action: 'update_city',
    locationId: issue.locationId,
    message: `Normalized city from "${currentCity}" to "${normalizedCity}"`,
    previousValue: currentCity,
    newValue: normalizedCity,
  };
}
