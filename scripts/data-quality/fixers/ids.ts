/**
 * ID-related fixers - handles updating location IDs
 */

import type { Fixer, Issue, FixResult, FixerContext } from '../lib/types';
import { locationIdExists, updateLocationId } from '../lib/db';

export const idFixer: Fixer = {
  handles: ['NAME_ID_MISMATCH'],

  async fix(issue: Issue, ctx: FixerContext): Promise<FixResult> {
    // Must have a suggested fix with the new ID
    if (!issue.suggestedFix?.newValue) {
      return {
        success: false,
        action: 'skip',
        locationId: issue.locationId,
        message: `No suggested ID available for "${issue.locationName}" - needs manual review`,
      };
    }

    const newId = issue.suggestedFix.newValue;

    // Check for conflicts (new ID already exists)
    const exists = await locationIdExists(newId);
    if (exists) {
      return {
        success: false,
        action: 'skip',
        locationId: issue.locationId,
        message: `Cannot update ID: new ID "${newId}" already exists`,
        error: 'ID conflict',
      };
    }

    // Dry run - just show what would happen
    if (ctx.dryRun) {
      return {
        success: true,
        action: 'update_id',
        locationId: issue.locationId,
        message: `[DRY RUN] Would update ID from "${issue.locationId}" to "${newId}"`,
        previousValue: issue.locationId,
        newValue: newId,
      };
    }

    // Actually update the ID
    const result = await updateLocationId(issue.locationId, newId);

    if (!result.success) {
      return {
        success: false,
        action: 'update_id',
        locationId: issue.locationId,
        message: `Failed to update ID: ${result.error}`,
        error: result.error,
      };
    }

    return {
      success: true,
      action: 'update_id',
      locationId: newId, // Use the new ID in the result
      message: `Updated ID from "${issue.locationId}" to "${newId}"`,
      previousValue: issue.locationId,
      newValue: newId,
    };
  },
};
