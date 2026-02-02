/**
 * Name-related fixers
 */

import type { Fixer, Issue, FixResult, FixerContext } from '../lib/types';
import { updateLocation } from '../lib/db';
import { getPlaceDisplayName } from '../lib/googlePlaces';
import { getNameOverride } from '../lib/overrides';

export const nameFixer: Fixer = {
  handles: ['EVENT_NAME_MISMATCH', 'ALL_CAPS_NAME', 'BAD_NAME_START', 'NAME_ID_MISMATCH', 'TRUNCATED_NAME'],

  async fix(issue: Issue, ctx: FixerContext): Promise<FixResult> {
    // Check for override first
    const override = getNameOverride(issue.locationId);
    if (override) {
      return applyNameFix(issue, override, 'override', ctx);
    }

    // Check if issue has a suggested fix with a new value
    if (issue.suggestedFix?.newValue) {
      return applyNameFix(issue, issue.suggestedFix.newValue, issue.suggestedFix.source || 'detection', ctx);
    }

    // For name issues that need lookup, try Google Places
    if ((issue.type === 'EVENT_NAME_MISMATCH' || issue.type === 'TRUNCATED_NAME') && ctx.googleApiKey) {
      // Need to fetch the location to get place_id
      const { getLocationById } = await import('../lib/db');
      const location = await getLocationById(issue.locationId);

      if (location?.place_id) {
        const googleName = await getPlaceDisplayName(location.place_id);
        if (googleName && googleName !== issue.locationName) {
          return applyNameFix(issue, googleName, 'google_places', ctx);
        }
      }
    }

    return {
      success: false,
      action: 'skip',
      locationId: issue.locationId,
      message: `No fix available for "${issue.locationName}" - needs manual review or Google Places lookup`,
    };
  },
};

async function applyNameFix(
  issue: Issue,
  newName: string,
  source: string,
  ctx: FixerContext
): Promise<FixResult> {
  if (ctx.dryRun) {
    return {
      success: true,
      action: 'rename',
      locationId: issue.locationId,
      message: `[DRY RUN] Would rename "${issue.locationName}" to "${newName}" (source: ${source})`,
      previousValue: issue.locationName,
      newValue: newName,
    };
  }

  const result = await updateLocation(issue.locationId, { name: newName });

  if (!result.success) {
    return {
      success: false,
      action: 'rename',
      locationId: issue.locationId,
      message: `Failed to rename: ${result.error}`,
      error: result.error,
    };
  }

  return {
    success: true,
    action: 'rename',
    locationId: issue.locationId,
    message: `Renamed "${issue.locationName}" to "${newName}" (source: ${source})`,
    previousValue: issue.locationName,
    newValue: newName,
  };
}
