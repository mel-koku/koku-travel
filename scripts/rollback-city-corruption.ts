#!/usr/bin/env tsx
/**
 * Rollback script for city consolidation corruption.
 *
 * This script restores the original city values for locations that were
 * incorrectly mapped during the city consolidation process.
 *
 * The city consolidation script incorrectly mapped cities like:
 * - Miyakojima (Okinawa city) → Osaka (because Miyakojima is also an Osaka ward)
 * - Kanazawa (Chubu city) → Yokohama (because Kanazawa is also a Yokohama ward)
 *
 * This script uses the city_original column to restore correct values.
 *
 * Usage:
 *   npx tsx scripts/rollback-city-corruption.ts --dry-run   # Preview changes
 *   npx tsx scripts/rollback-city-corruption.ts              # Execute rollback
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// KNOWN CORRUPTION PATTERNS
// =============================================================================

/**
 * Known corruption patterns from the city consolidation script.
 * These are cities that share names with wards but are in different regions.
 *
 * Format: { consolidatedCity: expectedRegionForConsolidatedCity }
 * If location.city matches consolidatedCity but location.region doesn't match,
 * the location was likely corrupted.
 */
const CORRUPTION_PATTERNS: Record<string, string[]> = {
  // Osaka has a Miyakojima ward, but Miyakojima is also a city in Okinawa
  Osaka: ["Kansai"],
  // Yokohama has a Kanazawa ward, but Kanazawa is also a city in Chubu (Ishikawa)
  Yokohama: ["Kanto"],
  // Nagoya has a Moriyama ward, but Moriyama is also a city in Shiga (Kansai)
  Nagoya: ["Chubu"],
  // Sapporo has a Shiroishi ward, but Shiroishi is also a city in Miyagi (Tohoku)
  Sapporo: ["Hokkaido"],
};

/**
 * Region bounding boxes for coordinate validation
 */
const REGION_BOUNDS: Record<string, { north: number; south: number; east: number; west: number }> = {
  Hokkaido: { north: 45.5, south: 41.4, east: 145.9, west: 139.3 },
  Tohoku: { north: 41.5, south: 37.0, east: 142.1, west: 139.0 },
  Kanto: { north: 37.0, south: 34.5, east: 140.9, west: 138.2 },
  Chubu: { north: 37.5, south: 34.5, east: 139.2, west: 135.8 },
  Kansai: { north: 36.0, south: 33.4, east: 136.8, west: 134.0 },
  Chugoku: { north: 36.0, south: 33.5, east: 134.5, west: 130.8 },
  Shikoku: { north: 34.5, south: 32.7, east: 134.8, west: 132.0 },
  Kyushu: { north: 34.3, south: 31.0, east: 132.1, west: 129.5 },
  Okinawa: { north: 27.5, south: 24.0, east: 131.5, west: 122.9 },
};

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

interface LocationRecord {
  id: string;
  name: string;
  city: string;
  city_original: string | null;
  region: string;
  coordinates: { lat: number; lng: number } | null;
}

interface CorruptedLocation {
  id: string;
  name: string;
  currentCity: string;
  originalCity: string;
  region: string;
  coordinatesRegion: string | null;
}

/**
 * Check if coordinates fall within a region's bounds
 */
function getRegionByCoordinates(lat: number, lng: number): string | null {
  for (const [region, bounds] of Object.entries(REGION_BOUNDS)) {
    if (
      lat >= bounds.south &&
      lat <= bounds.north &&
      lng >= bounds.west &&
      lng <= bounds.east
    ) {
      return region;
    }
  }
  return null;
}

/**
 * Fetch locations that appear to be corrupted
 */
async function fetchCorruptedLocations(): Promise<CorruptedLocation[]> {
  const corrupted: CorruptedLocation[] = [];
  let from = 0;
  const pageSize = 1000;

  console.log("Scanning for corrupted locations...\n");

  while (true) {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, city, city_original, region, coordinates")
      .range(from, from + pageSize - 1)
      .order("name");

    if (error) {
      console.error("Error fetching locations:", error);
      throw error;
    }

    if (!data || data.length === 0) break;

    for (const loc of data as LocationRecord[]) {
      // Skip if no original city (wasn't changed)
      if (!loc.city_original) continue;

      // Skip if city wasn't changed
      if (loc.city === loc.city_original) continue;

      // Check if this looks like a corruption pattern
      const expectedRegions = CORRUPTION_PATTERNS[loc.city];
      if (!expectedRegions) continue;

      // If the location's region doesn't match the expected region for this city,
      // it was likely corrupted
      if (!expectedRegions.includes(loc.region)) {
        // Additional validation: check if coordinates match the claimed region
        let coordinatesRegion: string | null = null;
        if (loc.coordinates) {
          coordinatesRegion = getRegionByCoordinates(loc.coordinates.lat, loc.coordinates.lng);
        }

        // Only mark as corrupted if coordinates also disagree with the city
        // This prevents false positives for legitimate ward consolidations
        if (coordinatesRegion && coordinatesRegion !== expectedRegions[0]) {
          corrupted.push({
            id: loc.id,
            name: loc.name,
            currentCity: loc.city,
            originalCity: loc.city_original,
            region: loc.region,
            coordinatesRegion,
          });
        }
      }
    }

    from += pageSize;
    if (data.length < pageSize) break;
  }

  return corrupted;
}

/**
 * Rollback corrupted locations to their original city values
 */
async function rollbackCorruptedLocations(
  locations: CorruptedLocation[],
  isDryRun: boolean
): Promise<number> {
  if (locations.length === 0) {
    console.log("No corrupted locations to rollback.\n");
    return 0;
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`LOCATIONS TO ROLLBACK: ${locations.length}`);
  console.log(`${"═".repeat(60)}\n`);

  // Group by transformation for summary
  const transformations = new Map<string, CorruptedLocation[]>();
  for (const loc of locations) {
    const key = `"${loc.currentCity}" → "${loc.originalCity}" (${loc.region})`;
    if (!transformations.has(key)) {
      transformations.set(key, []);
    }
    transformations.get(key)!.push(loc);
  }

  for (const [transformation, locs] of transformations.entries()) {
    console.log(`${transformation}: ${locs.length} locations`);
    for (const loc of locs.slice(0, 5)) {
      console.log(`  - ${loc.name}`);
    }
    if (locs.length > 5) {
      console.log(`  ... and ${locs.length - 5} more`);
    }
    console.log("");
  }

  if (isDryRun) {
    console.log("[DRY RUN] No changes made.\n");
    return locations.length;
  }

  console.log("Applying rollback...\n");

  let rolledBack = 0;
  for (const loc of locations) {
    const { error } = await supabase
      .from("locations")
      .update({ city: loc.originalCity })
      .eq("id", loc.id);

    if (error) {
      console.error(`  Error rolling back "${loc.name}":`, error.message);
      continue;
    }

    rolledBack++;
    if (rolledBack % 10 === 0) {
      console.log(`  Rolled back ${rolledBack}/${locations.length}...`);
    }
  }

  console.log(`\n✅ Successfully rolled back ${rolledBack} locations.\n`);
  return rolledBack;
}

/**
 * Generate a migration SQL file for the rollback
 */
function generateMigrationSQL(locations: CorruptedLocation[]): string {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const lines: string[] = [
    "-- Migration: Rollback city consolidation corruption",
    `-- Generated: ${new Date().toISOString()}`,
    `-- Total locations: ${locations.length}`,
    "",
    "-- This migration restores original city values for locations that were",
    "-- incorrectly mapped during the city consolidation process.",
    "",
    "-- Example: Locations in Miyakojima (Okinawa) were incorrectly given city='Osaka'",
    "-- because Miyakojima is both an Okinawa city AND an Osaka ward.",
    "",
    "BEGIN;",
    "",
  ];

  // Group by original city for cleaner SQL
  const byOriginalCity = new Map<string, CorruptedLocation[]>();
  for (const loc of locations) {
    if (!byOriginalCity.has(loc.originalCity)) {
      byOriginalCity.set(loc.originalCity, []);
    }
    byOriginalCity.get(loc.originalCity)!.push(loc);
  }

  for (const [originalCity, locs] of byOriginalCity.entries()) {
    const currentCity = locs[0]?.currentCity ?? "Unknown";
    lines.push(`-- Restore ${locs.length} locations: "${currentCity}" → "${originalCity}"`);
    lines.push(`UPDATE locations SET city = '${originalCity.replace(/'/g, "''")}'`);
    lines.push(`WHERE id IN (`);
    lines.push(locs.map((l) => `  '${l.id}'`).join(",\n"));
    lines.push(`);`);
    lines.push("");
  }

  lines.push("COMMIT;");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║         Koku Travel - City Corruption Rollback                 ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  if (isDryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  // Find corrupted locations
  const corrupted = await fetchCorruptedLocations();

  if (corrupted.length === 0) {
    console.log("✅ No corrupted locations found!\n");
    return;
  }

  // Generate SQL migration file
  const sql = generateMigrationSQL(corrupted);
  const migrationFile = `supabase/migrations/${new Date().toISOString().replace(/[-:]/g, "").slice(0, 14)}_rollback_city_corruption.sql`;
  fs.writeFileSync(migrationFile, sql);
  console.log(`📝 Generated migration SQL: ${migrationFile}\n`);

  // Also save detailed JSON for reference
  const jsonFile = `scripts/rollback-details-${new Date().toISOString().split("T")[0]}.json`;
  fs.writeFileSync(jsonFile, JSON.stringify(corrupted, null, 2));
  console.log(`📝 Saved rollback details to: ${jsonFile}\n`);

  // Perform rollback
  const rolledBack = await rollbackCorruptedLocations(corrupted, isDryRun);

  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log(`  Corrupted locations found: ${corrupted.length}`);
  console.log(`  Locations rolled back: ${isDryRun ? `${rolledBack} (dry run)` : rolledBack}`);
  console.log(`  Migration file: ${migrationFile}`);
  console.log("═══════════════════════════════════════════════════════════════════\n");

  if (!isDryRun && rolledBack > 0) {
    console.log("✅ Rollback complete!\n");
  }
}

main().catch(console.error);
