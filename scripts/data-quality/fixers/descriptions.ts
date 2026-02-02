/**
 * Description-related fixers
 */

import type { Fixer, Issue, FixResult, FixerContext } from '../lib/types';
import { updateLocation, getLocationById } from '../lib/db';
import { getPlaceSummary } from '../lib/googlePlaces';
import { getDescriptionOverride } from '../lib/overrides';
import { generateCategoryDescription } from '../lib/utils';

export const descriptionFixer: Fixer = {
  handles: ['ADDRESS_AS_DESC', 'TRUNCATED_DESC', 'MISSING_DESC', 'SHORT_INCOMPLETE_DESC', 'GENERIC_DESC'],

  async fix(issue: Issue, ctx: FixerContext): Promise<FixResult> {
    // Check for override first
    const override = getDescriptionOverride(issue.locationId);
    if (override) {
      return applyDescriptionFix(issue, override, 'override', ctx);
    }

    // Check if issue has a suggested fix with a new value
    if (issue.suggestedFix?.newValue && issue.suggestedFix.source !== 'detection') {
      return applyDescriptionFix(
        issue,
        issue.suggestedFix.newValue,
        issue.suggestedFix.source || 'generated',
        ctx
      );
    }

    // Try Google Places API for description
    if (ctx.googleApiKey) {
      const location = await getLocationById(issue.locationId);

      if (location?.place_id) {
        const googleSummary = await getPlaceSummary(location.place_id);
        if (googleSummary && googleSummary.length > 50) {
          return applyDescriptionFix(issue, googleSummary, 'google_places', ctx);
        }
      }

      // Fallback to editorial_summary if available
      if (location?.editorial_summary && location.editorial_summary.length > 50) {
        return applyDescriptionFix(issue, location.editorial_summary, 'editorial_summary', ctx);
      }

      // Last resort: generate from category template
      if (location) {
        const generated = generateCategoryDescription(location.category, location.city);
        return applyDescriptionFix(issue, generated, 'generated', ctx);
      }
    }

    return {
      success: false,
      action: 'skip',
      locationId: issue.locationId,
      message: `No fix available for "${issue.locationName}" - needs manual entry or Google Places API key`,
    };
  },
};

async function applyDescriptionFix(
  issue: Issue,
  newDescription: string,
  source: string,
  ctx: FixerContext
): Promise<FixResult> {
  if (ctx.dryRun) {
    const preview = newDescription.length > 80
      ? newDescription.slice(0, 80) + '...'
      : newDescription;

    return {
      success: true,
      action: 'update_description',
      locationId: issue.locationId,
      message: `[DRY RUN] Would update description of "${issue.locationName}" (source: ${source}): "${preview}"`,
      newValue: newDescription,
    };
  }

  const result = await updateLocation(issue.locationId, { description: newDescription });

  if (!result.success) {
    return {
      success: false,
      action: 'update_description',
      locationId: issue.locationId,
      message: `Failed to update description: ${result.error}`,
      error: result.error,
    };
  }

  const preview = newDescription.length > 80
    ? newDescription.slice(0, 80) + '...'
    : newDescription;

  return {
    success: true,
    action: 'update_description',
    locationId: issue.locationId,
    message: `Updated description of "${issue.locationName}" (source: ${source}): "${preview}"`,
    newValue: newDescription,
  };
}
