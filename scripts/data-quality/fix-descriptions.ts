#!/usr/bin/env tsx
/**
 * Fix Descriptions Script
 *
 * Fixes locations with poor descriptions by:
 * 1. Copying editorial_summary to description (if available and better)
 * 2. Identifying locations that still need manual description updates
 *
 * This script does NOT make any external API calls - it only uses
 * data already in the database.
 *
 * Usage:
 *   npx tsx scripts/data-quality/fix-descriptions.ts --dry-run    # Preview changes
 *   npx tsx scripts/data-quality/fix-descriptions.ts              # Apply changes
 *   npx tsx scripts/data-quality/fix-descriptions.ts --report     # Show locations needing manual fixes
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

// Verify required environment variables
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const reportMode = args.includes("--report");

/**
 * Check if a description is poor quality
 */
function isBadDescription(desc: string | null, name: string): boolean {
  if (!desc || desc.length === 0) return true;

  // Too short to be useful
  if (desc.length < 50) return true;

  // Just an address
  if (/^(〒|\d{3}-\d{4}|\d+[- ]chōme|\d+[- ]chome)/i.test(desc)) return true;

  // Generic placeholder text
  if (/^(beach|attraction|museum|temple|shrine|park) in /i.test(desc))
    return true;

  // Just the name repeated
  if (desc.toLowerCase() === name.toLowerCase()) return true;

  // Just a partial address or coordinates
  if (/^[\d\s,.-]+$/.test(desc)) return true;

  // Starts with HTML or formatting artifacts
  if (/^<|^\[|^{/.test(desc)) return true;

  return false;
}

/**
 * Check if an editorial summary is good quality
 */
function isGoodEditorial(editorial: string | null): boolean {
  if (!editorial) return false;
  if (editorial.length < 50) return false;
  return true;
}

interface LocationToFix {
  id: string;
  name: string;
  city: string;
  description: string | null;
  editorial_summary: string | null;
}

/**
 * Find locations that can be fixed with editorial_summary
 */
async function findFixableLocations(): Promise<LocationToFix[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, city, description, editorial_summary")
    .order("name");

  if (error) {
    console.error("Failed to fetch locations:", error.message);
    process.exit(1);
  }

  return (data || []).filter(
    (loc) =>
      isBadDescription(loc.description, loc.name) &&
      isGoodEditorial(loc.editorial_summary)
  );
}

/**
 * Find locations that still need manual fixes
 */
async function findNeedsManualFix(): Promise<LocationToFix[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, city, description, editorial_summary")
    .order("name");

  if (error) {
    console.error("Failed to fetch locations:", error.message);
    process.exit(1);
  }

  return (data || []).filter(
    (loc) =>
      isBadDescription(loc.description, loc.name) &&
      !isGoodEditorial(loc.editorial_summary)
  );
}

/**
 * Apply fixes - copy editorial_summary to description
 */
async function applyFixes(locations: LocationToFix[]): Promise<void> {
  let successCount = 0;
  let errorCount = 0;

  for (const loc of locations) {
    if (dryRun) {
      console.log(`[DRY RUN] Would fix: ${loc.name} (${loc.city})`);
      console.log(`  Current: "${(loc.description || "EMPTY").slice(0, 50)}..."`);
      console.log(`  New: "${loc.editorial_summary!.slice(0, 50)}..."`);
      successCount++;
      continue;
    }

    const { error } = await supabase
      .from("locations")
      .update({ description: loc.editorial_summary })
      .eq("id", loc.id);

    if (error) {
      console.error(`✗ Failed to fix ${loc.name}: ${error.message}`);
      errorCount++;
    } else {
      console.log(`✓ Fixed: ${loc.name} (${loc.city})`);
      successCount++;
    }
  }

  console.log("\n=== Summary ===");
  if (dryRun) {
    console.log(`Would fix: ${successCount} locations`);
    console.log("\nTo apply changes, run without --dry-run");
  } else {
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
  }
}

/**
 * Generate report of locations needing manual fixes
 */
async function generateReport(locations: LocationToFix[]): Promise<void> {
  console.log("=== Locations Needing Manual Description Updates ===\n");
  console.log(`Total: ${locations.length} locations\n`);

  // Group by city
  const byCity = new Map<string, LocationToFix[]>();
  for (const loc of locations) {
    const city = loc.city || "Unknown";
    if (!byCity.has(city)) byCity.set(city, []);
    byCity.get(city)!.push(loc);
  }

  // Sort cities by count
  const sortedCities = [...byCity.entries()].sort(
    (a, b) => b[1].length - a[1].length
  );

  for (const [city, locs] of sortedCities.slice(0, 20)) {
    console.log(`\n${city} (${locs.length} locations):`);
    for (const loc of locs.slice(0, 5)) {
      console.log(`  - ${loc.name}`);
      console.log(`    ID: ${loc.id}`);
      console.log(
        `    Current: "${(loc.description || "EMPTY").slice(0, 60)}..."`
      );
    }
    if (locs.length > 5) {
      console.log(`  ... and ${locs.length - 5} more`);
    }
  }

  if (sortedCities.length > 20) {
    console.log(`\n... and ${sortedCities.length - 20} more cities`);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  if (reportMode) {
    console.log("\n=== Finding Locations Needing Manual Fixes ===\n");
    const needsManual = await findNeedsManualFix();
    await generateReport(needsManual);
    return;
  }

  console.log("\n=== Fix Descriptions ===");
  if (dryRun) {
    console.log("MODE: Dry run (no changes will be made)\n");
  } else {
    console.log("MODE: Live (changes will be applied)\n");
  }

  const fixable = await findFixableLocations();

  if (fixable.length === 0) {
    console.log("No locations need fixing.");
    return;
  }

  console.log(
    `Found ${fixable.length} locations with bad descriptions that can be fixed using editorial_summary\n`
  );

  await applyFixes(fixable);

  // Also show how many still need manual fixes
  const needsManual = await findNeedsManualFix();
  if (needsManual.length > 0) {
    console.log(`\nNote: ${needsManual.length} locations still need manual description updates.`);
    console.log("Run with --report to see the full list.");
  }
}

main().catch(console.error);
