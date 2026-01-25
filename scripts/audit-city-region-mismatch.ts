#!/usr/bin/env tsx
/**
 * Audit script to identify city-region mismatches in the locations table.
 *
 * This script detects data corruption from the city consolidation script
 * where locations were incorrectly mapped to cities in the wrong region.
 *
 * Example: "Cape Higashi" in Okinawa was incorrectly given city: "Osaka"
 * because "Miyakojima" is both an Osaka ward and an Okinawa city.
 *
 * Usage:
 *   npx tsx scripts/audit-city-region-mismatch.ts
 *   npx tsx scripts/audit-city-region-mismatch.ts --fix  # Generate rollback SQL
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
// REGION DEFINITIONS AND VALIDATION
// =============================================================================

/**
 * Japan's 9 regions with their bounding boxes for coordinate validation.
 */
const REGIONS: Record<string, { name: string; bounds: { north: number; south: number; east: number; west: number } }> = {
  hokkaido: {
    name: "Hokkaido",
    bounds: { north: 45.5, south: 41.4, east: 145.9, west: 139.3 },
  },
  tohoku: {
    name: "Tohoku",
    bounds: { north: 41.5, south: 37.0, east: 142.1, west: 139.0 },
  },
  kanto: {
    name: "Kanto",
    bounds: { north: 37.0, south: 34.5, east: 140.9, west: 138.2 },
  },
  chubu: {
    name: "Chubu",
    bounds: { north: 37.5, south: 34.5, east: 139.2, west: 135.8 },
  },
  kansai: {
    name: "Kansai",
    bounds: { north: 36.0, south: 33.4, east: 136.8, west: 134.0 },
  },
  chugoku: {
    name: "Chugoku",
    bounds: { north: 36.0, south: 33.5, east: 134.5, west: 130.8 },
  },
  shikoku: {
    name: "Shikoku",
    bounds: { north: 34.5, south: 32.7, east: 134.8, west: 132.0 },
  },
  kyushu: {
    name: "Kyushu",
    bounds: { north: 34.3, south: 31.0, east: 132.1, west: 129.5 },
  },
  okinawa: {
    name: "Okinawa",
    bounds: { north: 27.5, south: 24.0, east: 131.5, west: 122.9 },
  },
};

/**
 * Known valid city-to-region mappings.
 * Cities that were consolidated from wards should map to these regions.
 */
const CITY_TO_EXPECTED_REGION: Record<string, string> = {
  // Major cities and their expected regions
  Tokyo: "Kanto",
  Yokohama: "Kanto",
  Kawasaki: "Kanto",
  Osaka: "Kansai",
  Kyoto: "Kansai",
  Kobe: "Kansai",
  Nara: "Kansai",
  Nagoya: "Chubu",
  Fukuoka: "Kyushu",
  Sapporo: "Hokkaido",
  Sendai: "Tohoku",
  Hiroshima: "Chugoku",
  Kanazawa: "Chubu", // Capital of Ishikawa, NOT Yokohama ward
  Naha: "Okinawa",
};

/**
 * Normalize region name to match database values
 */
function normalizeRegion(region: string): string {
  return region.charAt(0).toUpperCase() + region.slice(1).toLowerCase();
}

/**
 * Get expected region for a city
 */
function getExpectedRegion(city: string): string | undefined {
  return CITY_TO_EXPECTED_REGION[city];
}

/**
 * Check if coordinates are within a region's bounds
 */
function isWithinRegionBounds(
  lat: number,
  lng: number,
  regionName: string
): boolean {
  const regionKey = regionName.toLowerCase();
  const region = REGIONS[regionKey];
  if (!region) return false;

  const { bounds } = region;
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

/**
 * Find which region contains the given coordinates
 */
function findRegionByCoordinates(lat: number, lng: number): string | null {
  for (const [key, region] of Object.entries(REGIONS)) {
    const { bounds } = region;
    if (
      lat >= bounds.south &&
      lat <= bounds.north &&
      lng >= bounds.west &&
      lng <= bounds.east
    ) {
      return region.name;
    }
  }
  return null;
}

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

interface MismatchRecord {
  id: string;
  name: string;
  city: string;
  cityOriginal: string | null;
  region: string;
  expectedRegion: string | null;
  coordinateRegion: string | null;
  mismatchType: "city-region" | "coordinate-region" | "both";
  coordinates: { lat: number; lng: number } | null;
}

async function fetchAllLocations(): Promise<LocationRecord[]> {
  const allLocations: LocationRecord[] = [];
  let from = 0;
  const pageSize = 1000;

  console.log("Fetching all locations...");

  // First check if city_original column exists
  const { error: columnCheckError } = await supabase
    .from("locations")
    .select("city_original")
    .limit(1);

  const hasCityOriginal = !columnCheckError || !columnCheckError.message.includes("city_original");
  const columns = hasCityOriginal
    ? "id, name, city, city_original, region, coordinates"
    : "id, name, city, region, coordinates";

  if (!hasCityOriginal) {
    console.log("  Note: city_original column not found, using city values only");
  }

  while (true) {
    const { data, error } = await supabase
      .from("locations")
      .select(columns)
      .range(from, from + pageSize - 1)
      .order("name");

    if (error) {
      console.error("Error fetching locations:", error);
      throw error;
    }

    if (!data || data.length === 0) break;

    // Add city_original: null if column doesn't exist
    const records = (data as LocationRecord[]).map((row) => ({
      ...row,
      city_original: hasCityOriginal ? row.city_original : null,
    }));

    allLocations.push(...records);
    console.log(`  Fetched ${allLocations.length} locations...`);
    from += pageSize;

    if (data.length < pageSize) break;
  }

  return allLocations;
}

async function auditCityRegionMismatches(): Promise<MismatchRecord[]> {
  const locations = await fetchAllLocations();
  const mismatches: MismatchRecord[] = [];

  console.log(`\nAnalyzing ${locations.length} locations for city-region mismatches...\n`);

  for (const loc of locations) {
    const expectedRegion = getExpectedRegion(loc.city);
    let coordinateRegion: string | null = null;

    // Check coordinate-based region
    if (loc.coordinates) {
      coordinateRegion = findRegionByCoordinates(loc.coordinates.lat, loc.coordinates.lng);
    }

    // Determine mismatch type
    let hasCityMismatch = false;
    let hasCoordinateMismatch = false;

    // Check if city's expected region doesn't match actual region
    if (expectedRegion && expectedRegion !== loc.region) {
      hasCityMismatch = true;
    }

    // Check if coordinates don't match the claimed region
    if (coordinateRegion && coordinateRegion !== loc.region) {
      hasCoordinateMismatch = true;
    }

    if (hasCityMismatch || hasCoordinateMismatch) {
      let mismatchType: MismatchRecord["mismatchType"];
      if (hasCityMismatch && hasCoordinateMismatch) {
        mismatchType = "both";
      } else if (hasCityMismatch) {
        mismatchType = "city-region";
      } else {
        mismatchType = "coordinate-region";
      }

      mismatches.push({
        id: loc.id,
        name: loc.name,
        city: loc.city,
        cityOriginal: loc.city_original,
        region: loc.region,
        expectedRegion,
        coordinateRegion,
        mismatchType,
        coordinates: loc.coordinates,
      });
    }
  }

  return mismatches;
}

function generateReport(mismatches: MismatchRecord[]): void {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║         City-Region Mismatch Audit Report                      ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  if (mismatches.length === 0) {
    console.log("✅ No city-region mismatches found!\n");
    return;
  }

  console.log(`Found ${mismatches.length} mismatches:\n`);

  // Group by mismatch type
  const cityRegionMismatches = mismatches.filter((m) => m.mismatchType === "city-region" || m.mismatchType === "both");
  const coordinateMismatches = mismatches.filter((m) => m.mismatchType === "coordinate-region" || m.mismatchType === "both");

  // Critical mismatches: city says one region, coordinates say another
  const criticalMismatches = mismatches.filter(
    (m) => m.mismatchType === "both" || (m.coordinateRegion && m.expectedRegion && m.coordinateRegion !== m.expectedRegion)
  );

  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("CRITICAL: City assigned to wrong region (confirmed by coordinates)");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  if (criticalMismatches.length === 0) {
    console.log("  None found.\n");
  } else {
    for (const m of criticalMismatches) {
      console.log(`  📍 ${m.name}`);
      console.log(`     ID: ${m.id}`);
      console.log(`     Current: city="${m.city}", region="${m.region}"`);
      console.log(`     Original city: "${m.cityOriginal ?? "N/A"}"`);
      console.log(`     Expected region for "${m.city}": ${m.expectedRegion ?? "Unknown"}`);
      console.log(`     Region by coordinates: ${m.coordinateRegion ?? "Unknown"}`);
      if (m.coordinates) {
        console.log(`     Coordinates: (${m.coordinates.lat}, ${m.coordinates.lng})`);
      }
      console.log("");
    }
  }

  // Group by city for summary
  const byCityRegion = new Map<string, MismatchRecord[]>();
  for (const m of mismatches) {
    const key = `${m.city} -> ${m.region} (should be ${m.coordinateRegion ?? m.expectedRegion ?? "?"})`;
    if (!byCityRegion.has(key)) {
      byCityRegion.set(key, []);
    }
    byCityRegion.get(key)!.push(m);
  }

  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("SUMMARY BY CITY-REGION COMBINATION");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  for (const [combo, locs] of byCityRegion.entries()) {
    console.log(`  ${combo}: ${locs.length} locations`);
    for (const loc of locs.slice(0, 5)) {
      console.log(`    - ${loc.name}`);
    }
    if (locs.length > 5) {
      console.log(`    ... and ${locs.length - 5} more`);
    }
    console.log("");
  }
}

function generateRollbackSQL(mismatches: MismatchRecord[]): string {
  const lines: string[] = [
    "-- Rollback script for city consolidation corruption",
    `-- Generated: ${new Date().toISOString()}`,
    `-- Total locations to fix: ${mismatches.length}`,
    "",
    "BEGIN;",
    "",
  ];

  // Group by original city for cleaner SQL
  const byOriginalCity = new Map<string, MismatchRecord[]>();
  for (const m of mismatches) {
    if (m.cityOriginal) {
      if (!byOriginalCity.has(m.cityOriginal)) {
        byOriginalCity.set(m.cityOriginal, []);
      }
      byOriginalCity.get(m.cityOriginal)!.push(m);
    }
  }

  for (const [originalCity, locs] of byOriginalCity.entries()) {
    lines.push(`-- Restore ${locs.length} locations from "${locs[0]?.city}" back to "${originalCity}"`);
    lines.push(`UPDATE locations`);
    lines.push(`SET city = '${originalCity}'`);
    lines.push(`WHERE id IN (`);
    lines.push(`  ${locs.map((l) => `'${l.id}'`).join(",\n  ")}`);
    lines.push(`);`);
    lines.push("");
  }

  // For locations without city_original, we need to restore based on region/coordinates
  const withoutOriginal = mismatches.filter((m) => !m.cityOriginal);
  if (withoutOriginal.length > 0) {
    lines.push("-- WARNING: The following locations don't have city_original backup");
    lines.push("-- Manual verification may be needed");
    for (const m of withoutOriginal) {
      lines.push(`-- ${m.name} (${m.id}): city="${m.city}", region="${m.region}", coords region="${m.coordinateRegion}"`);
    }
    lines.push("");
  }

  lines.push("COMMIT;");
  lines.push("");

  return lines.join("\n");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const generateFix = args.includes("--fix");

  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║         Koku Travel - City-Region Mismatch Auditor             ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  const mismatches = await auditCityRegionMismatches();
  generateReport(mismatches);

  if (generateFix && mismatches.length > 0) {
    const sql = generateRollbackSQL(mismatches);
    const filename = `scripts/rollback-city-corruption-${new Date().toISOString().split("T")[0]}.sql`;
    fs.writeFileSync(filename, sql);
    console.log(`\n✅ Generated rollback SQL: ${filename}`);
  }

  // Output JSON for further processing
  const jsonFilename = `scripts/city-region-mismatches-${new Date().toISOString().split("T")[0]}.json`;
  fs.writeFileSync(jsonFilename, JSON.stringify(mismatches, null, 2));
  console.log(`\n📝 Saved detailed report to: ${jsonFilename}`);

  console.log(`\n${"═".repeat(60)}`);
  console.log(`TOTAL MISMATCHES: ${mismatches.length}`);
  console.log(`${"═".repeat(60)}\n`);

  if (mismatches.length > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
