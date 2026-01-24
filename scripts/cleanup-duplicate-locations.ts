/**
 * Cleanup script to remove duplicate locations from the database.
 *
 * This script finds locations with the same normalized name and:
 * 1. Keeps the "best" entry (based on data quality: place_id, coordinates, description)
 * 2. Deletes the duplicate entries
 *
 * Usage:
 *   npx tsx scripts/cleanup-duplicate-locations.ts --dry-run    # Preview changes (default)
 *   npx tsx scripts/cleanup-duplicate-locations.ts --execute    # Actually delete duplicates
 *   npx tsx scripts/cleanup-duplicate-locations.ts --same-city  # Only remove duplicates in same city
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
  region: string | null;
  category: string | null;
  coordinates: { lat: number; lng: number } | null;
  place_id: string | null;
  description: string | null;
  rating: number | null;
  image: string | null;
  created_at: string | null;
}

interface DuplicateGroup {
  normalizedName: string;
  keep: LocationRecord;
  delete: LocationRecord[];
  reason: string;
}

/**
 * Normalize a location name for comparison.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFKC")
    .replace(/[''`]/g, "'")
    .replace(/[""]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/^[^a-z0-9\u3000-\u9fff]+|[^a-z0-9\u3000-\u9fff]+$/gi, "");
}

/**
 * Score a location based on data quality.
 * Higher score = better quality data = should be kept.
 */
function scoreLocationQuality(loc: LocationRecord): number {
  let score = 0;

  // Has place_id (Google Places verified)
  if (loc.place_id) score += 100;

  // Has coordinates
  if (loc.coordinates) score += 50;

  // Has description
  if (loc.description && loc.description.length > 10) score += 30;

  // Has rating
  if (loc.rating && loc.rating > 0) score += 20;

  // Has image
  if (loc.image) score += 10;

  // Has city
  if (loc.city) score += 5;

  // Has category
  if (loc.category) score += 5;

  return score;
}

async function fetchAllLocations(): Promise<LocationRecord[]> {
  let allLocations: LocationRecord[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, city, prefecture, region, category, coordinates, place_id, description, rating, image, created_at")
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

function findDuplicatesToRemove(locations: LocationRecord[], sameCityOnly: boolean): DuplicateGroup[] {
  // Group by normalized name
  const byNormalizedName = new Map<string, LocationRecord[]>();

  for (const loc of locations) {
    if (!loc.name) continue;
    const normalized = normalizeName(loc.name);
    const existing = byNormalizedName.get(normalized) || [];
    existing.push(loc);
    byNormalizedName.set(normalized, existing);
  }

  const duplicateGroups: DuplicateGroup[] = [];

  for (const [normalizedName, locs] of byNormalizedName) {
    if (locs.length <= 1) continue;

    // If sameCityOnly, group by city first
    if (sameCityOnly) {
      const byCity = new Map<string, LocationRecord[]>();
      for (const loc of locs) {
        const cityKey = (loc.city || "unknown").toLowerCase().trim();
        const existing = byCity.get(cityKey) || [];
        existing.push(loc);
        byCity.set(cityKey, existing);
      }

      for (const [, cityLocs] of byCity) {
        if (cityLocs.length <= 1) continue;

        // Score each location
        const scored = cityLocs.map((loc) => ({
          loc,
          score: scoreLocationQuality(loc),
        }));

        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);

        const keep = scored[0];
        const toDelete = scored.slice(1);

        duplicateGroups.push({
          normalizedName,
          keep: keep.loc,
          delete: toDelete.map((s) => s.loc),
          reason: `Keep score: ${keep.score}, Delete scores: ${toDelete.map((s) => s.score).join(", ")}`,
        });
      }
    } else {
      // Check if all have the same place_id (true duplicates)
      const placeIds = new Set(locs.map((l) => l.place_id).filter(Boolean));

      // Only remove duplicates if they have the same place_id OR same city
      // This prevents removing legitimately different locations with same name in different cities
      const cities = new Set(locs.map((l) => (l.city || "").toLowerCase().trim()).filter(Boolean));

      if (placeIds.size > 1 && cities.size > 1) {
        // Different place_ids AND different cities - these are likely different places
        // Skip this group
        continue;
      }

      // Score each location
      const scored = locs.map((loc) => ({
        loc,
        score: scoreLocationQuality(loc),
      }));

      // Sort by score descending
      scored.sort((a, b) => b.score - a.score);

      const keep = scored[0];
      const toDelete = scored.slice(1);

      duplicateGroups.push({
        normalizedName,
        keep: keep.loc,
        delete: toDelete.map((s) => s.loc),
        reason: `Keep score: ${keep.score}, Delete scores: ${toDelete.map((s) => s.score).join(", ")}`,
      });
    }
  }

  return duplicateGroups;
}

async function deleteDuplicates(groups: DuplicateGroup[]): Promise<{ deleted: number; errors: string[] }> {
  let deleted = 0;
  const errors: string[] = [];

  for (const group of groups) {
    for (const loc of group.delete) {
      const { error } = await supabase
        .from("locations")
        .delete()
        .eq("id", loc.id);

      if (error) {
        errors.push(`Failed to delete ${loc.id} (${loc.name}): ${error.message}`);
      } else {
        deleted++;
      }
    }
  }

  return { deleted, errors };
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes("--execute");
  const sameCityOnly = args.includes("--same-city");
  const dryRun = !execute;

  console.log("======================================================================");
  console.log("       Koku Travel - Duplicate Locations Cleanup Script              ");
  console.log("======================================================================\n");

  if (dryRun) {
    console.log("MODE: DRY RUN (no changes will be made)");
    console.log("Use --execute to actually delete duplicates\n");
  } else {
    console.log("MODE: EXECUTE (duplicates will be deleted!)\n");
  }

  if (sameCityOnly) {
    console.log("FILTER: Only removing duplicates within the same city\n");
  }

  // Fetch all locations
  console.log("Fetching all locations...");
  const locations = await fetchAllLocations();
  console.log(`Found ${locations.length} total locations\n`);

  // Find duplicates to remove
  console.log("Analyzing duplicates...");
  const duplicateGroups = findDuplicatesToRemove(locations, sameCityOnly);

  const totalToDelete = duplicateGroups.reduce((sum, g) => sum + g.delete.length, 0);
  console.log(`Found ${duplicateGroups.length} duplicate groups with ${totalToDelete} entries to delete\n`);

  if (duplicateGroups.length === 0) {
    console.log("No duplicates found to clean up!");
    return;
  }

  // Show what will be deleted
  console.log("===================================================================");
  console.log("DUPLICATE GROUPS TO CLEAN UP");
  console.log("===================================================================\n");

  for (const group of duplicateGroups.slice(0, 30)) {
    console.log(`"${group.normalizedName}"`);
    console.log(`  KEEP: "${group.keep.name}" (${group.keep.city || "no city"})`);
    console.log(`         ID: ${group.keep.id}`);
    console.log(`         Place ID: ${group.keep.place_id || "N/A"}`);
    console.log(`         Score: ${scoreLocationQuality(group.keep)}`);

    for (const del of group.delete) {
      console.log(`  DELETE: "${del.name}" (${del.city || "no city"})`);
      console.log(`          ID: ${del.id}`);
      console.log(`          Place ID: ${del.place_id || "N/A"}`);
      console.log(`          Score: ${scoreLocationQuality(del)}`);
    }
    console.log("");
  }

  if (duplicateGroups.length > 30) {
    console.log(`... and ${duplicateGroups.length - 30} more groups\n`);
  }

  // Summary
  console.log("===================================================================");
  console.log("SUMMARY");
  console.log("===================================================================\n");
  console.log(`Total duplicate groups: ${duplicateGroups.length}`);
  console.log(`Locations to keep: ${duplicateGroups.length}`);
  console.log(`Locations to delete: ${totalToDelete}`);
  console.log(`Locations after cleanup: ${locations.length - totalToDelete}`);

  // Save report
  const reportPath = `scripts/duplicate-cleanup-${new Date().toISOString().split("T")[0]}.json`;
  const report = {
    timestamp: new Date().toISOString(),
    mode: dryRun ? "dry-run" : "execute",
    sameCityOnly,
    totalLocations: locations.length,
    duplicateGroups: duplicateGroups.length,
    toDelete: totalToDelete,
    groups: duplicateGroups.map((g) => ({
      name: g.normalizedName,
      keep: { id: g.keep.id, name: g.keep.name, city: g.keep.city, score: scoreLocationQuality(g.keep) },
      delete: g.delete.map((d) => ({ id: d.id, name: d.name, city: d.city, score: scoreLocationQuality(d) })),
    })),
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to ${reportPath}`);

  if (dryRun) {
    console.log("\n===================================================================");
    console.log("DRY RUN COMPLETE - No changes made");
    console.log("===================================================================\n");
    console.log("To actually delete duplicates, run:");
    console.log("  npx tsx scripts/cleanup-duplicate-locations.ts --execute");
    if (!sameCityOnly) {
      console.log("\nOr to only delete duplicates within the same city:");
      console.log("  npx tsx scripts/cleanup-duplicate-locations.ts --execute --same-city");
    }
  } else {
    console.log("\n===================================================================");
    console.log("EXECUTING CLEANUP...");
    console.log("===================================================================\n");

    const result = await deleteDuplicates(duplicateGroups);

    console.log(`Deleted: ${result.deleted} locations`);
    if (result.errors.length > 0) {
      console.log(`\nErrors (${result.errors.length}):`);
      for (const err of result.errors.slice(0, 10)) {
        console.log(`  - ${err}`);
      }
      if (result.errors.length > 10) {
        console.log(`  ... and ${result.errors.length - 10} more errors`);
      }
    }

    console.log("\nCleanup complete!");
  }
}

main().catch(console.error);
