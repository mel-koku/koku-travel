/**
 * Duplicate resolution fixers
 */

import type { Fixer, Issue, FixResult, FixerContext } from '../lib/types';
import { deleteLocation, getLocationById, updateLocation } from '../lib/db';
import { getDuplicateResolution } from '../lib/overrides';

export const duplicateFixer: Fixer = {
  handles: ['DUPLICATE_SAME_CITY', 'DUPLICATE_MANY', 'DUPLICATE_COORDINATES'],

  async fix(issue: Issue, ctx: FixerContext): Promise<FixResult> {
    // Check for configured resolution
    const resolution = getDuplicateResolution(issue.locationId);

    if (resolution?.action === 'keep') {
      return {
        success: true,
        action: 'skip',
        locationId: issue.locationId,
        message: `Keeping "${issue.locationName}" as primary (${resolution.reason || 'configured'})`,
      };
    }

    if (resolution?.action === 'delete') {
      return applyDuplicateDelete(issue, resolution.reason || 'configured as duplicate', ctx);
    }

    // Check suggested fix from detection
    if (issue.suggestedFix?.action === 'delete') {
      return applyDuplicateDelete(issue, issue.suggestedFix.reason, ctx);
    }

    if (issue.suggestedFix?.action === 'skip') {
      return {
        success: true,
        action: 'skip',
        locationId: issue.locationId,
        message: `Keeping "${issue.locationName}" (${issue.suggestedFix.reason})`,
      };
    }

    // No clear resolution - skip
    return {
      success: false,
      action: 'skip',
      locationId: issue.locationId,
      message: `No resolution for duplicate "${issue.locationName}" - needs manual review`,
    };
  },
};

async function applyDuplicateDelete(
  issue: Issue,
  reason: string,
  ctx: FixerContext
): Promise<FixResult> {
  // Before deleting, check if we should preserve any data
  const location = await getLocationById(issue.locationId);

  if (!location) {
    return {
      success: false,
      action: 'delete',
      locationId: issue.locationId,
      message: `Location "${issue.locationId}" not found`,
      error: 'Location not found',
    };
  }

  // Check if there's a "keep" location we should transfer data to
  const otherIds = (issue.details?.otherIds as string[]) || [];
  let keepLocationId: string | null = null;

  for (const otherId of otherIds) {
    const otherResolution = getDuplicateResolution(otherId);
    if (otherResolution?.action === 'keep') {
      keepLocationId = otherId;
      break;
    }
  }

  // Transfer valuable data before deletion if we have a target
  if (keepLocationId && !ctx.dryRun) {
    const keepLocation = await getLocationById(keepLocationId);
    if (keepLocation) {
      const updates: Record<string, unknown> = {};

      // Transfer place_id if missing
      if (!keepLocation.place_id && location.place_id) {
        updates.place_id = location.place_id;
      }

      // Transfer description if missing or shorter
      if (location.description &&
          (!keepLocation.description || location.description.length > keepLocation.description.length)) {
        updates.description = location.description;
      }

      // Transfer editorial_summary if missing
      if (!keepLocation.editorial_summary && location.editorial_summary) {
        updates.editorial_summary = location.editorial_summary;
      }

      // Apply transfers
      if (Object.keys(updates).length > 0) {
        await updateLocation(keepLocationId, updates);
      }
    }
  }

  if (ctx.dryRun) {
    return {
      success: true,
      action: 'delete',
      locationId: issue.locationId,
      message: `[DRY RUN] Would delete duplicate "${issue.locationName}" (${reason})${keepLocationId ? `, transferring data to ${keepLocationId}` : ''}`,
    };
  }

  const result = await deleteLocation(issue.locationId);

  if (!result.success) {
    return {
      success: false,
      action: 'delete',
      locationId: issue.locationId,
      message: `Failed to delete: ${result.error}`,
      error: result.error,
    };
  }

  return {
    success: true,
    action: 'delete',
    locationId: issue.locationId,
    message: `Deleted duplicate "${issue.locationName}" (${reason})`,
  };
}
