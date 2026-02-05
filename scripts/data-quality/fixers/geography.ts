/**
 * Geography-related fixers
 */

import type { Fixer, Issue, FixerContext, FixResult } from '../lib/types';
import { updateLocation } from '../lib/db';

/**
 * Fixer for region mismatches based on prefecture
 */
export const geographyFixer: Fixer = {
  handles: ['PREFECTURE_REGION_MISMATCH'],

  async fix(issue: Issue, ctx: FixerContext): Promise<FixResult> {
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
