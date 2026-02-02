#!/usr/bin/env npx tsx
/**
 * Unified Data Quality CLI
 *
 * Usage:
 *   npm run dq audit                    # Run full audit
 *   npm run dq audit --rules=names      # Audit specific rules
 *   npm run dq audit --severity=high    # Filter by severity
 *   npm run dq fix --dry-run            # Preview fixes
 *   npm run dq fix                      # Apply fixes
 *   npm run dq report                   # Generate health report
 *   npm run dq list                     # List rules/fixers
 */

import { parseArgs, printHelp, colors, formatTable, severityColor } from './lib/cli';
import { fetchAllLocations, fetchLocations } from './lib/db';
import { loadOverrides } from './lib/overrides';
import { allRules, getRulesByCategories, listRules } from './rules';
import { allFixers, getFixerForIssueType, listFixers } from './fixers';
import { generateHealthReport, printHealthReport, printIssuesSummary, printIssuesDetailed } from './lib/report';
import { isGooglePlacesConfigured } from './lib/googlePlaces';
import type { Issue, Severity, RuleCategory, FixerContext } from './lib/types';
import { getSupabase } from './lib/db';

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

async function runAudit(options: {
  rules?: RuleCategory[];
  severity?: Severity;
  json?: boolean;
  limit?: number;
  city?: string;
  region?: string;
}): Promise<Issue[]> {
  console.log(colors.bold('\nRunning data quality audit...\n'));

  // Fetch locations
  const locations = options.city || options.region
    ? await fetchLocations({ city: options.city, region: options.region })
    : await fetchAllLocations();

  console.log(`Scanning ${locations.length} locations...\n`);

  // Load overrides
  const overrides = loadOverrides();

  // Get rules to run
  const rules = options.rules
    ? getRulesByCategories(options.rules)
    : allRules;

  console.log(`Running ${rules.length} rules: ${rules.map(r => r.id).join(', ')}\n`);

  // Run all rules
  const allIssues: Issue[] = [];

  for (const rule of rules) {
    try {
      const issues = await rule.detect({ locations, overrides, options });
      allIssues.push(...issues);
    } catch (error) {
      console.error(`Error running rule ${rule.id}:`, error);
    }
  }

  // Filter by minimum severity
  let filteredIssues = allIssues;
  if (options.severity) {
    const minSeverity = SEVERITY_ORDER[options.severity];
    filteredIssues = allIssues.filter(i => SEVERITY_ORDER[i.severity] <= minSeverity);
  }

  // Sort by severity
  filteredIssues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  // Apply limit
  if (options.limit) {
    filteredIssues = filteredIssues.slice(0, options.limit);
  }

  // Output
  if (options.json) {
    console.log(JSON.stringify(filteredIssues, null, 2));
  } else {
    printIssuesSummary(filteredIssues);
    printIssuesDetailed(filteredIssues);
  }

  return filteredIssues;
}

async function runFix(options: {
  dryRun: boolean;
  types?: string[];
  limit?: number;
  city?: string;
}): Promise<void> {
  console.log(colors.bold(`\n${options.dryRun ? '[DRY RUN] ' : ''}Running data quality fixes...\n`));

  // First run audit to get issues
  const locations = options.city
    ? await fetchLocations({ city: options.city })
    : await fetchAllLocations();

  const overrides = loadOverrides();

  // Get all issues
  let issues: Issue[] = [];
  for (const rule of allRules) {
    try {
      const ruleIssues = await rule.detect({ locations, overrides, options: {} });
      issues.push(...ruleIssues);
    } catch (error) {
      console.error(`Error running rule ${rule.id}:`, error);
    }
  }

  // Filter by types if specified
  if (options.types && options.types.length > 0) {
    issues = issues.filter(i => options.types!.includes(i.type));
  }

  // Filter to only fixable issues
  issues = issues.filter(i => {
    const fixer = getFixerForIssueType(i.type);
    return fixer !== undefined;
  });

  // Sort by severity (fix critical first)
  issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  // Apply limit
  if (options.limit) {
    issues = issues.slice(0, options.limit);
  }

  console.log(`Found ${issues.length} fixable issues\n`);

  if (issues.length === 0) {
    console.log(colors.green('Nothing to fix!\n'));
    return;
  }

  // Create fixer context
  const ctx: FixerContext = {
    supabase: getSupabase(),
    overrides,
    dryRun: options.dryRun,
    googleApiKey: process.env.GOOGLE_PLACES_API_KEY,
  };

  // Apply fixes
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const issue of issues) {
    const fixer = getFixerForIssueType(issue.type);
    if (!fixer) {
      skipCount++;
      continue;
    }

    try {
      const result = await fixer.fix(issue, ctx);

      if (result.success) {
        if (result.action === 'skip') {
          skipCount++;
          console.log(colors.gray(`⊘ ${result.message}`));
        } else {
          successCount++;
          console.log(colors.green(`✓ ${result.message}`));
        }
      } else {
        failCount++;
        console.log(colors.red(`✗ ${result.message}`));
      }
    } catch (error) {
      failCount++;
      console.log(colors.red(`✗ Error fixing ${issue.locationName}: ${error}`));
    }
  }

  console.log(`\n${colors.bold('Summary:')}`);
  console.log(`  ${colors.green(`✓ ${successCount} fixed`)}`);
  console.log(`  ${colors.gray(`⊘ ${skipCount} skipped`)}`);
  console.log(`  ${colors.red(`✗ ${failCount} failed`)}`);
  console.log();
}

async function runReport(options: {
  json?: boolean;
  detailed?: boolean;
}): Promise<void> {
  console.log(colors.bold('\nGenerating data quality report...\n'));

  // Fetch locations
  const locations = await fetchAllLocations();
  const overrides = loadOverrides();

  // Run all rules to get issues
  const allIssues: Issue[] = [];
  for (const rule of allRules) {
    try {
      const issues = await rule.detect({ locations, overrides, options: {} });
      allIssues.push(...issues);
    } catch (error) {
      console.error(`Error running rule ${rule.id}:`, error);
    }
  }

  // Generate report
  const report = generateHealthReport(allIssues, locations);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHealthReport(report, options.detailed);
  }
}

function runList(): void {
  console.log(colors.bold('\nAvailable Rules:\n'));

  const rules = listRules();
  const ruleRows = rules.map(r => [r.id, r.name, r.category, r.issueTypes.join(', ')]);
  console.log(formatTable(['ID', 'Name', 'Category', 'Issue Types'], ruleRows));

  console.log(colors.bold('\n\nAvailable Fixers:\n'));

  const fixers = listFixers();
  for (const fixer of fixers) {
    console.log(`  Handles: ${fixer.handles.join(', ')}`);
  }

  console.log(colors.bold('\n\nConfiguration:\n'));
  console.log(`  Google Places API: ${isGooglePlacesConfigured() ? colors.green('Configured') : colors.yellow('Not configured')}`);
  console.log(`  Overrides file: scripts/data-quality/overrides.json`);
  console.log();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, auditOptions, fixOptions, reportOptions } = parseArgs(args);

  try {
    switch (command) {
      case 'audit':
        await runAudit(auditOptions);
        break;

      case 'fix':
        await runFix(fixOptions);
        break;

      case 'report':
        await runReport(reportOptions);
        break;

      case 'list':
        runList();
        break;

      case 'help':
      default:
        printHelp();
        break;
    }
  } catch (error) {
    console.error(colors.red(`\nError: ${error}`));
    process.exit(1);
  }
}

main();
