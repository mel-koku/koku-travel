/**
 * Audit script to identify duplicate locations in the database.
 *
 * This script analyzes location names to find:
 * 1. Exact duplicates (same name, different IDs)
 * 2. Near-duplicates (similar names after normalization)
 * 3. Locations with slight variations (unicode, whitespace)
 *
 * Usage:
 *   npx tsx scripts/audit-duplicate-locations.ts              # Full audit
 *   npx tsx scripts/audit-duplicate-locations.ts --name "Bistro n/n"  # Search specific name
 *   npx tsx scripts/audit-duplicate-locations.ts --json       # Output as JSON
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

interface LocationRecord {
  id: string;
  name: string;
  city: string | null;
  prefecture: string | null;
  category: string | null;
  coordinates: { lat: number; lng: number } | null;
  place_id: string | null;
}

interface DuplicateGroup {
  normalizedName: string;
  locations: LocationRecord[];
  samePlaceId: boolean;
  sameCity: boolean;
}

interface AuditReport {
  timestamp: string;
  totalLocations: number;
  totalDuplicateGroups: number;
  totalDuplicateLocations: number;
  duplicateGroups: DuplicateGroup[];
  searchTermMatches?: DuplicateGroup[];
}

/**
 * Normalize a location name for comparison.
 * Handles unicode, whitespace, and case variations.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Normalize unicode (e.g., full-width characters)
    .normalize("NFKC")
    // Remove common punctuation variations
    .replace(/[''`]/g, "'")
    .replace(/[""]/g, '"')
    // Collapse multiple spaces
    .replace(/\s+/g, " ")
    // Remove trailing/leading punctuation
    .replace(/^[^a-z0-9\u3000-\u9fff]+|[^a-z0-9\u3000-\u9fff]+$/gi, "");
}

/**
 * Calculate similarity between two strings (Levenshtein distance based).
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

async function fetchAllLocations(): Promise<LocationRecord[]> {
  let allLocations: LocationRecord[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, city, prefecture, category, coordinates, place_id")
      .range(from, from + pageSize - 1)
      .order("name");

    if (error) {
      console.error("Error fetching locations:", error);
      throw error;
    }

    if (!data || data.length === 0) break;

    allLocations = allLocations.concat(data as LocationRecord[]);
    from += pageSize;

    if (data.length < pageSize) break;
  }

  return allLocations;
}

function findDuplicates(locations: LocationRecord[]): DuplicateGroup[] {
  // Group by normalized name
  const byNormalizedName = new Map<string, LocationRecord[]>();

  for (const loc of locations) {
    if (!loc.name) continue;
    const normalized = normalizeName(loc.name);
    const existing = byNormalizedName.get(normalized) || [];
    existing.push(loc);
    byNormalizedName.set(normalized, existing);
  }

  // Filter to only groups with multiple entries
  const duplicateGroups: DuplicateGroup[] = [];

  for (const [normalizedName, locs] of byNormalizedName) {
    if (locs.length > 1) {
      // Check if all have same place_id
      const placeIds = new Set(locs.map((l) => l.place_id).filter(Boolean));
      const samePlaceId = placeIds.size <= 1;

      // Check if all in same city
      const cities = new Set(locs.map((l) => l.city?.toLowerCase().trim()).filter(Boolean));
      const sameCity = cities.size <= 1;

      duplicateGroups.push({
        normalizedName,
        locations: locs,
        samePlaceId,
        sameCity,
      });
    }
  }

  // Sort by number of duplicates (descending)
  return duplicateGroups.sort((a, b) => b.locations.length - a.locations.length);
}

function searchByName(locations: LocationRecord[], searchTerm: string): DuplicateGroup[] {
  const normalizedSearch = normalizeName(searchTerm);
  const matching: LocationRecord[] = [];

  for (const loc of locations) {
    if (!loc.name) continue;
    const normalized = normalizeName(loc.name);

    // Exact normalized match
    if (normalized === normalizedSearch) {
      matching.push(loc);
      continue;
    }

    // Partial match (contains search term)
    if (normalized.includes(normalizedSearch) || normalizedSearch.includes(normalized)) {
      matching.push(loc);
      continue;
    }

    // Similarity match (> 80%)
    if (calculateSimilarity(normalized, normalizedSearch) > 0.8) {
      matching.push(loc);
    }
  }

  if (matching.length === 0) return [];

  // Group the matches by normalized name
  const byNormalizedName = new Map<string, LocationRecord[]>();
  for (const loc of matching) {
    const normalized = normalizeName(loc.name);
    const existing = byNormalizedName.get(normalized) || [];
    existing.push(loc);
    byNormalizedName.set(normalized, existing);
  }

  const groups: DuplicateGroup[] = [];
  for (const [normalizedName, locs] of byNormalizedName) {
    const placeIds = new Set(locs.map((l) => l.place_id).filter(Boolean));
    const cities = new Set(locs.map((l) => l.city?.toLowerCase().trim()).filter(Boolean));

    groups.push({
      normalizedName,
      locations: locs,
      samePlaceId: placeIds.size <= 1,
      sameCity: cities.size <= 1,
    });
  }

  return groups;
}

async function main() {
  const args = process.argv.slice(2);
  const outputJson = args.includes("--json");
  const nameIndex = args.indexOf("--name");
  const searchName = nameIndex !== -1 ? args[nameIndex + 1] : null;

  console.log("======================================================================");
  console.log("         Koku Travel - Duplicate Locations Audit Script               ");
  console.log("======================================================================\n");

  // Fetch all locations
  console.log("Fetching all locations...");
  const locations = await fetchAllLocations();
  console.log(`Found ${locations.length} total locations\n`);

  // Find duplicates
  const duplicateGroups = findDuplicates(locations);
  const totalDuplicateLocations = duplicateGroups.reduce((sum, g) => sum + g.locations.length, 0);

  // Build report
  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    totalLocations: locations.length,
    totalDuplicateGroups: duplicateGroups.length,
    totalDuplicateLocations,
    duplicateGroups,
  };

  // Search for specific name if provided
  if (searchName) {
    report.searchTermMatches = searchByName(locations, searchName);
  }

  // Output results
  if (outputJson) {
    const outputPath = `scripts/duplicate-audit-${new Date().toISOString().split("T")[0]}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Report saved to ${outputPath}`);
    return;
  }

  // Print summary
  console.log("===================================================================");
  console.log("                        AUDIT SUMMARY");
  console.log("===================================================================\n");

  console.log(`Total locations analyzed:    ${report.totalLocations}`);
  console.log(`Total duplicate groups:      ${report.totalDuplicateGroups}`);
  console.log(`Total duplicate locations:   ${report.totalDuplicateLocations}`);

  // Search results
  if (searchName && report.searchTermMatches) {
    console.log("\n===================================================================");
    console.log(`SEARCH RESULTS FOR: "${searchName}"`);
    console.log("===================================================================\n");

    if (report.searchTermMatches.length === 0) {
      console.log("  No matching locations found.");
    } else {
      for (const group of report.searchTermMatches) {
        console.log(`\n  Normalized name: "${group.normalizedName}"`);
        console.log(`  Same place_id: ${group.samePlaceId ? "Yes" : "No (potential duplicates!)"}`);
        console.log(`  Same city: ${group.sameCity ? "Yes" : "No (multiple cities)"}`);
        console.log(`  Entries: ${group.locations.length}`);
        console.log("");

        for (const loc of group.locations) {
          console.log(`    ID: ${loc.id}`);
          console.log(`    Name: "${loc.name}"`);
          console.log(`    City: ${loc.city || "N/A"}`);
          console.log(`    Category: ${loc.category || "N/A"}`);
          console.log(`    Place ID: ${loc.place_id || "N/A"}`);
          console.log(`    Coords: ${loc.coordinates ? `${loc.coordinates.lat}, ${loc.coordinates.lng}` : "N/A"}`);
          console.log("");
        }
      }
    }
  }

  // Print top duplicate groups
  console.log("\n===================================================================");
  console.log("TOP DUPLICATE GROUPS (by count)");
  console.log("===================================================================\n");

  const topGroups = duplicateGroups.slice(0, 20);
  for (const group of topGroups) {
    console.log(`  "${group.normalizedName}" - ${group.locations.length} entries`);
    console.log(`    Same place_id: ${group.samePlaceId ? "Yes" : "No (likely true duplicates!)"}`);
    console.log(`    Same city: ${group.sameCity ? "Yes" : "No"}`);

    // Show first 3 entries
    for (const loc of group.locations.slice(0, 3)) {
      console.log(`      - "${loc.name}" (${loc.city || "no city"}, ID: ${loc.id.slice(0, 8)}...)`);
    }
    if (group.locations.length > 3) {
      console.log(`      ... and ${group.locations.length - 3} more`);
    }
    console.log("");
  }

  // High-risk duplicates (same name, different place_id)
  const highRiskDuplicates = duplicateGroups.filter((g) => !g.samePlaceId);
  if (highRiskDuplicates.length > 0) {
    console.log("===================================================================");
    console.log("HIGH-RISK: Different place_ids (Likely Database Duplicates)");
    console.log("===================================================================\n");

    for (const group of highRiskDuplicates.slice(0, 10)) {
      console.log(`  "${group.normalizedName}"`);
      for (const loc of group.locations) {
        console.log(`    - ID: ${loc.id.slice(0, 8)}...`);
        console.log(`      Name: "${loc.name}"`);
        console.log(`      City: ${loc.city || "N/A"}`);
        console.log(`      Place ID: ${loc.place_id || "N/A"}`);
      }
      console.log("");
    }
  }

  // Save full report
  const outputPath = `scripts/duplicate-audit-${new Date().toISOString().split("T")[0]}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nFull report saved to ${outputPath}`);

  console.log("\n===================================================================");
  console.log("RECOMMENDED NEXT STEPS");
  console.log("===================================================================\n");
  console.log("1. Review high-risk duplicates (different place_ids)");
  console.log("2. Decide which entries to keep (prefer ones with more complete data)");
  console.log("3. Delete or merge duplicate entries in the database");
  console.log("4. Run: npx tsx scripts/audit-duplicate-locations.ts --name \"Bistro n/n\"");
}

main().catch(console.error);
