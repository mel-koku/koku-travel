/**
 * Category-related fixers
 */

import type { Fixer, Issue, FixResult, FixerContext } from '../lib/types';
import { updateLocation } from '../lib/db';
import { getCategoryOverride } from '../lib/overrides';

export const categoryFixer: Fixer = {
  handles: ['EVENT_WRONG_CATEGORY'],

  async fix(issue: Issue, ctx: FixerContext): Promise<FixResult> {
    // Check for override first
    const override = getCategoryOverride(issue.locationId);
    if (override) {
      return applyCategoryFix(issue, override, 'override', ctx);
    }

    // Check if issue has a suggested fix with a new value
    if (issue.suggestedFix?.newValue) {
      return applyCategoryFix(
        issue,
        issue.suggestedFix.newValue,
        issue.suggestedFix.source || 'detection',
        ctx
      );
    }

    return {
      success: false,
      action: 'skip',
      locationId: issue.locationId,
      message: `No category fix available for "${issue.locationName}"`,
    };
  },
};

async function applyCategoryFix(
  issue: Issue,
  newCategory: string,
  source: string,
  ctx: FixerContext
): Promise<FixResult> {
  const currentCategory = (issue.details?.currentCategory as string) || 'unknown';

  if (ctx.dryRun) {
    return {
      success: true,
      action: 'update_category',
      locationId: issue.locationId,
      message: `[DRY RUN] Would change category of "${issue.locationName}" from "${currentCategory}" to "${newCategory}" (source: ${source})`,
      previousValue: currentCategory,
      newValue: newCategory,
    };
  }

  const result = await updateLocation(issue.locationId, { category: newCategory });

  if (!result.success) {
    return {
      success: false,
      action: 'update_category',
      locationId: issue.locationId,
      message: `Failed to update category: ${result.error}`,
      error: result.error,
    };
  }

  return {
    success: true,
    action: 'update_category',
    locationId: issue.locationId,
    message: `Changed category of "${issue.locationName}" from "${currentCategory}" to "${newCategory}" (source: ${source})`,
    previousValue: currentCategory,
    newValue: newCategory,
  };
}
