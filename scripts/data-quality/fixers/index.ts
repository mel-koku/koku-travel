/**
 * Fixer registry - exports all fix handlers
 */

import type { Fixer, IssueType } from '../lib/types';
import { nameFixer } from './names';
import { descriptionFixer } from './descriptions';
import { duplicateFixer } from './duplicates';
import { categoryFixer } from './categories';
import { idFixer } from './ids';
import { geographyFixer } from './geography';

// All available fixers
export const allFixers: Fixer[] = [
  nameFixer,
  descriptionFixer,
  duplicateFixer,
  categoryFixer,
  idFixer,
  geographyFixer,
];

/**
 * Get fixer that handles a specific issue type
 */
export function getFixerForIssueType(type: IssueType): Fixer | undefined {
  return allFixers.find(f => f.handles.includes(type));
}

/**
 * List all fixers and what they handle
 */
export function listFixers(): Array<{ handles: IssueType[] }> {
  return allFixers.map(f => ({
    handles: f.handles,
  }));
}

export { nameFixer, descriptionFixer, duplicateFixer, categoryFixer, idFixer, geographyFixer };
