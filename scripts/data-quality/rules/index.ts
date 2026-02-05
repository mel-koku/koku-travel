/**
 * Rule registry - exports all detection rules
 */

import type { Rule, RuleCategory } from '../lib/types';
import { nameRules } from './names';
import { descriptionRules } from './descriptions';
import { duplicateRules } from './duplicates';
import { categoryRules } from './categories';
import { completenessRules } from './completeness';
import { googleRules } from './google';

// All available rules
export const allRules: Rule[] = [
  ...nameRules,
  ...descriptionRules,
  ...duplicateRules,
  ...categoryRules,
  ...completenessRules,
  ...googleRules,
];

// Rules grouped by category
export const rulesByCategory: Record<RuleCategory, Rule[]> = {
  names: nameRules,
  descriptions: descriptionRules,
  duplicates: duplicateRules,
  categories: categoryRules,
  completeness: completenessRules,
  google: googleRules,
};

/**
 * Get rules by category
 */
export function getRulesByCategories(categories: RuleCategory[]): Rule[] {
  return categories.flatMap(cat => rulesByCategory[cat] || []);
}

/**
 * Get a single rule by ID
 */
export function getRuleById(id: string): Rule | undefined {
  return allRules.find(r => r.id === id);
}

/**
 * List all available rules
 */
export function listRules(): Array<{ id: string; name: string; category: RuleCategory; issueTypes: string[] }> {
  return allRules.map(r => ({
    id: r.id,
    name: r.name,
    category: r.category,
    issueTypes: r.issueTypes,
  }));
}

export { nameRules, descriptionRules, duplicateRules, categoryRules, completenessRules, googleRules };
