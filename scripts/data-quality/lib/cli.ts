/**
 * CLI parsing utilities for data quality scripts
 */

import type { AuditOptions, FixOptions, ReportOptions, RuleCategory, Severity, IssueType } from './types';

export type Command = 'audit' | 'fix' | 'report' | 'list' | 'help';

export interface ParsedArgs {
  command: Command;
  auditOptions: AuditOptions;
  fixOptions: FixOptions;
  reportOptions: ReportOptions;
}

const RULE_CATEGORIES: RuleCategory[] = ['names', 'descriptions', 'duplicates', 'categories', 'completeness'];
const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

/**
 * Parse command line arguments
 */
export function parseArgs(args: string[]): ParsedArgs {
  const command = (args[0] as Command) || 'help';

  const flags = args.slice(1);
  const parsed: Record<string, string | boolean> = {};

  for (const flag of flags) {
    if (flag.startsWith('--')) {
      const [key, value] = flag.slice(2).split('=');
      parsed[key] = value ?? true;
    } else if (flag.startsWith('-')) {
      parsed[flag.slice(1)] = true;
    }
  }

  return {
    command: isValidCommand(command) ? command : 'help',
    auditOptions: parseAuditOptions(parsed),
    fixOptions: parseFixOptions(parsed),
    reportOptions: parseReportOptions(parsed),
  };
}

function isValidCommand(cmd: string): cmd is Command {
  return ['audit', 'fix', 'report', 'list', 'help'].includes(cmd);
}

function parseAuditOptions(parsed: Record<string, string | boolean>): AuditOptions {
  const options: AuditOptions = {};

  if (typeof parsed.rules === 'string') {
    const rules = parsed.rules.split(',').filter((r): r is RuleCategory =>
      RULE_CATEGORIES.includes(r as RuleCategory)
    );
    if (rules.length > 0) {
      options.rules = rules;
    }
  }

  if (typeof parsed.severity === 'string' && SEVERITIES.includes(parsed.severity as Severity)) {
    options.severity = parsed.severity as Severity;
  }

  if (parsed.json === true || parsed.json === 'true') {
    options.json = true;
  }

  if (typeof parsed.limit === 'string') {
    options.limit = parseInt(parsed.limit, 10);
  }

  if (typeof parsed.city === 'string') {
    options.city = parsed.city;
  }

  if (typeof parsed.region === 'string') {
    options.region = parsed.region;
  }

  return options;
}

function parseFixOptions(parsed: Record<string, string | boolean>): FixOptions {
  const options: FixOptions = {
    dryRun: parsed['dry-run'] === true || parsed['dry-run'] === 'true',
  };

  if (typeof parsed.type === 'string') {
    options.types = parsed.type.split(',') as IssueType[];
  }

  if (typeof parsed.limit === 'string') {
    options.limit = parseInt(parsed.limit, 10);
  }

  if (typeof parsed.city === 'string') {
    options.city = parsed.city;
  }

  return options;
}

function parseReportOptions(parsed: Record<string, string | boolean>): ReportOptions {
  return {
    json: parsed.json === true || parsed.json === 'true',
    detailed: parsed.detailed === true || parsed.detailed === 'true',
  };
}

/**
 * Print help message
 */
export function printHelp(): void {
  console.log(`
Unified Data Quality System

Usage: npm run dq <command> [options]

Commands:
  audit     Run data quality audit
  fix       Apply fixes to detected issues
  report    Generate health report
  list      List available rules and fixers
  help      Show this help message

Audit Options:
  --rules=<category>    Run specific rule categories (names,descriptions,duplicates,categories,completeness)
  --severity=<level>    Filter by minimum severity (critical,high,medium,low,info)
  --json                Output in JSON format
  --limit=<n>           Limit number of issues returned
  --city=<name>         Filter by city
  --region=<name>       Filter by region

Fix Options:
  --dry-run             Preview fixes without applying
  --type=<type>         Fix specific issue type(s)
  --limit=<n>           Limit number of fixes applied
  --city=<name>         Only fix issues in specific city

Report Options:
  --json                Output report in JSON format
  --detailed            Include detailed breakdowns

Examples:
  npm run dq audit                         # Run full audit
  npm run dq audit --rules=names           # Audit name issues only
  npm run dq audit --severity=high --json  # High+ issues as JSON
  npm run dq fix --dry-run                 # Preview all fixes
  npm run dq fix --type=ALL_CAPS_NAME      # Fix specific issue type
  npm run dq report                        # Generate health report
  npm run dq list                          # List rules and fixers
`);
}

/**
 * Format a table for console output
 */
export function formatTable(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) => {
    const maxRowWidth = Math.max(...rows.map(r => (r[i] || '').length));
    return Math.max(h.length, maxRowWidth);
  });

  const separator = colWidths.map(w => '-'.repeat(w)).join(' | ');
  const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ');
  const dataLines = rows.map(row =>
    row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join(' | ')
  );

  return [headerLine, separator, ...dataLines].join('\n');
}

/**
 * Color helpers for terminal output
 */
export const colors = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

export function severityColor(severity: Severity): (s: string) => string {
  switch (severity) {
    case 'critical':
      return colors.red;
    case 'high':
      return colors.red;
    case 'medium':
      return colors.yellow;
    case 'low':
      return colors.blue;
    case 'info':
      return colors.gray;
    default:
      return (s: string) => s;
  }
}
