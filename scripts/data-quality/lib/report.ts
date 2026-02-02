/**
 * Report generation for data quality system
 */

import type { Issue, HealthReport, Severity, IssueType, Location } from './types';
import { colors, formatTable } from './cli';
import { groupBy } from './utils';

/**
 * Generate a health report from issues and locations
 */
export function generateHealthReport(
  issues: Issue[],
  locations: Location[]
): HealthReport {
  const totalLocations = locations.length;

  // Count issues by type
  const issuesByType = issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {} as Record<IssueType, number>);

  // Count issues by severity
  const issuesBySeverity = issues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] || 0) + 1;
    return acc;
  }, {} as Record<Severity, number>);

  // Calculate health score (0-100)
  const healthScore = calculateHealthScore(issues, totalLocations);

  // Get top issues (most common)
  const topIssues = getTopIssues(issues, 10);

  // Generate recommendations
  const recommendations = generateRecommendations(issuesByType, issuesBySeverity, totalLocations);

  return {
    timestamp: new Date().toISOString(),
    totalLocations,
    issuesByType,
    issuesBySeverity,
    healthScore,
    topIssues,
    recommendations,
  };
}

/**
 * Calculate overall health score (0-100)
 */
function calculateHealthScore(issues: Issue[], totalLocations: number): number {
  if (totalLocations === 0) return 100;

  // Weight issues by severity
  const severityWeights: Record<Severity, number> = {
    critical: 10,
    high: 5,
    medium: 2,
    low: 1,
    info: 0,
  };

  const totalPenalty = issues.reduce((sum, issue) => {
    return sum + severityWeights[issue.severity];
  }, 0);

  // Max penalty is 10 per location (all critical)
  const maxPenalty = totalLocations * 10;

  // Score is inverse of penalty ratio
  const penaltyRatio = Math.min(totalPenalty / maxPenalty, 1);
  return Math.round((1 - penaltyRatio) * 100);
}

/**
 * Get top issues sorted by frequency
 */
function getTopIssues(issues: Issue[], limit: number): Issue[] {
  // Group by type
  const byType = groupBy(issues, i => i.type);

  // Sort by count
  const sorted = Object.entries(byType)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, limit);

  // Return one example of each
  return sorted.map(([_, typeIssues]) => typeIssues[0]);
}

/**
 * Generate recommendations based on issues
 */
function generateRecommendations(
  issuesByType: Record<string, number>,
  issuesBySeverity: Record<Severity, number>,
  totalLocations: number
): string[] {
  const recommendations: string[] = [];

  // Critical issues
  if (issuesBySeverity.critical > 0) {
    recommendations.push(
      `Fix ${issuesBySeverity.critical} critical issue(s) immediately - these affect data integrity`
    );
  }

  // High severity
  if (issuesBySeverity.high > 0) {
    recommendations.push(
      `Address ${issuesBySeverity.high} high-severity issue(s) to improve data quality`
    );
  }

  // Specific recommendations
  if (issuesByType['DUPLICATE_SAME_CITY']) {
    recommendations.push(
      `Review ${issuesByType['DUPLICATE_SAME_CITY']} duplicate entries in same cities - run 'npm run dq fix --type=DUPLICATE_SAME_CITY'`
    );
  }

  if (issuesByType['ADDRESS_AS_DESC']) {
    recommendations.push(
      `Update ${issuesByType['ADDRESS_AS_DESC']} descriptions that are just addresses - run 'npm run dq fix --type=ADDRESS_AS_DESC'`
    );
  }

  if (issuesByType['EVENT_NAME_MISMATCH']) {
    recommendations.push(
      `Review ${issuesByType['EVENT_NAME_MISMATCH']} locations where event names may need correction`
    );
  }

  if (issuesByType['ALL_CAPS_NAME']) {
    recommendations.push(
      `Fix ${issuesByType['ALL_CAPS_NAME']} ALL CAPS names - run 'npm run dq fix --type=ALL_CAPS_NAME'`
    );
  }

  if (issuesByType['MISSING_COORDINATES']) {
    recommendations.push(
      `Geocode ${issuesByType['MISSING_COORDINATES']} locations missing coordinates`
    );
  }

  // Add completeness note
  const missingPlaceIds = issuesByType['MISSING_PLACE_ID'] || 0;
  if (missingPlaceIds > totalLocations * 0.3) {
    recommendations.push(
      `Consider enriching ${missingPlaceIds} locations with Google Place IDs for better data`
    );
  }

  return recommendations;
}

/**
 * Print health report to console
 */
export function printHealthReport(report: HealthReport, detailed: boolean = false): void {
  console.log('\n' + colors.bold('═══════════════════════════════════════════════════════════'));
  console.log(colors.bold('                     DATA QUALITY REPORT'));
  console.log(colors.bold('═══════════════════════════════════════════════════════════\n'));

  // Health score with color
  const scoreColor = report.healthScore >= 80 ? colors.green :
                     report.healthScore >= 60 ? colors.yellow :
                     colors.red;

  console.log(`${colors.bold('Health Score:')} ${scoreColor(report.healthScore + '/100')}`);
  console.log(`${colors.bold('Total Locations:')} ${report.totalLocations}`);
  console.log(`${colors.bold('Report Generated:')} ${report.timestamp}\n`);

  // Issues by severity
  console.log(colors.bold('Issues by Severity:'));
  const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
  for (const severity of severityOrder) {
    const count = report.issuesBySeverity[severity] || 0;
    if (count > 0 || detailed) {
      const color = severity === 'critical' || severity === 'high' ? colors.red :
                    severity === 'medium' ? colors.yellow :
                    colors.gray;
      console.log(`  ${color(severity.padEnd(10))} ${count}`);
    }
  }
  console.log();

  // Issues by type (if detailed)
  if (detailed) {
    console.log(colors.bold('Issues by Type:'));
    const sortedTypes = Object.entries(report.issuesByType)
      .sort((a, b) => b[1] - a[1]);

    for (const [type, count] of sortedTypes) {
      console.log(`  ${type.padEnd(25)} ${count}`);
    }
    console.log();
  }

  // Top issues
  if (report.topIssues.length > 0) {
    console.log(colors.bold('Top Issues:'));
    for (const issue of report.topIssues.slice(0, 5)) {
      const count = report.issuesByType[issue.type];
      console.log(`  ${colors.dim(`[${issue.type}]`)} ${issue.message} ${colors.gray(`(${count} total)`)}`);
    }
    console.log();
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log(colors.bold('Recommendations:'));
    for (const rec of report.recommendations) {
      console.log(`  • ${rec}`);
    }
    console.log();
  }

  console.log(colors.bold('═══════════════════════════════════════════════════════════\n'));
}

/**
 * Print issues summary to console
 */
export function printIssuesSummary(issues: Issue[]): void {
  if (issues.length === 0) {
    console.log(colors.green('\n✓ No issues found!\n'));
    return;
  }

  // Group by severity
  const bySeverity = groupBy(issues, i => i.severity);

  console.log(`\n${colors.bold('Issues Found:')} ${issues.length}\n`);

  // Print counts by severity
  const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
  for (const severity of severityOrder) {
    const count = bySeverity[severity]?.length || 0;
    if (count > 0) {
      const color = severity === 'critical' || severity === 'high' ? colors.red :
                    severity === 'medium' ? colors.yellow :
                    colors.gray;
      console.log(`  ${color(severity.toUpperCase().padEnd(10))} ${count}`);
    }
  }
  console.log();
}

/**
 * Print detailed issues list
 */
export function printIssuesDetailed(issues: Issue[], limit: number = 50): void {
  const displayed = issues.slice(0, limit);

  for (const issue of displayed) {
    const severityColor = issue.severity === 'critical' || issue.severity === 'high'
      ? colors.red
      : issue.severity === 'medium'
        ? colors.yellow
        : colors.gray;

    console.log(
      `${severityColor(`[${issue.severity.toUpperCase()}]`)} ` +
      `${colors.dim(issue.type)} ` +
      `${issue.locationName} ${colors.dim(`(${issue.city})`)}`
    );
    console.log(`  ${issue.message}`);

    if (issue.suggestedFix) {
      const fixColor = issue.suggestedFix.confidence >= 80 ? colors.green : colors.yellow;
      console.log(`  ${fixColor('Fix:')} ${issue.suggestedFix.reason}`);
      if (issue.suggestedFix.newValue) {
        console.log(`  ${colors.dim('Value:')} ${issue.suggestedFix.newValue.slice(0, 60)}...`);
      }
    }
    console.log();
  }

  if (issues.length > limit) {
    console.log(colors.gray(`... and ${issues.length - limit} more issues\n`));
  }
}
