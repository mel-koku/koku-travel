/**
 * Comprehensive data quality cleanup script for location entries.
 *
 * Phase 1: Delete service/experience entries (tour services, rental services, etc.)
 * Phase 2: Delete duplicate entries (keeping one per unique place_id)
 * Phase 3: Delete incomplete/truncated name entries
 *
 * Usage:
 *   npx tsx scripts/cleanup-data-quality.ts --dry-run     # Preview all changes
 *   npx tsx scripts/cleanup-data-quality.ts --phase=1     # Services only
 *   npx tsx scripts/cleanup-data-quality.ts --phase=2     # Duplicates only
 *   npx tsx scripts/cleanup-data-quality.ts --phase=3     # Incomplete names only
 *   npx tsx scripts/cleanup-data-quality.ts               # Full cleanup (all phases)
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

// Phase 1: Services/Experiences to delete (not physical venues)
const SERVICES_TO_DELETE = [
  "Free walking tour Kyoto | GuruWalk",
  "ASO KUJU CYCLE TOUR",
  "Asobo-Ya tours",
  "Canyoning, shower climbing, and rafting tour",
  "Hachimantai Cat Tours",
  "Headwaters Adventure Tour (Shower Climbing, Canyoning)",
  "Hida-Osaka Waterfall Tour",
  "Hiroshima-Onomichi SUIGUN RIB TOURS",
  "Ice Fall Tour Snow Trekking in Yamagata",
  "Kurobe Gorge Panorama View Tour",
  "Kyoto Bike Tour - The Bamboo Forest & Arashiyama",
  "Lake Shizenko Nature Canoe Tour",
  "Rindo Bike Tour Japan",
  "Segway guided tour",
  "Segway Guided Tour",
  "Flying fish-catching experience",
  "Kumano River Experience",
  "Lotus root digging experience",
  "Rental kimono dressing",
  "Rental Kimono Goen Style",
];

// Phase 3: Incomplete/truncated names to delete
const INCOMPLETE_NAMES_TO_DELETE = [
  "Museum of",
  "Site of",
  "National",
  "Port of",
  "Tobacco and",
  "Tomb of",
  "House of",
  "Hells of", // Could be "Hells of Beppu" but too truncated
  "Rafting",
  "J R A",
];

// Highways/roads to delete (found in duplicates analysis)
const HIGHWAYS_TO_DELETE = ["Chugoku Expressway"];

interface LocationRecord {
  id: string;
  name: string;
  place_id: string | null;
  city: string | null;
  prefecture: string | null;
  primary_photo_url: string | null;
}

interface DeletionLog {
  timestamp: string;
  phase: number;
  entries: LocationRecord[];
}

async function getLocationCount(): Promise<number> {
  const { count } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true });
  return count || 0;
}

async function logDeletions(phase: number, entries: LocationRecord[]): Promise<void> {
  const logEntry: DeletionLog = {
    timestamp: new Date().toISOString(),
    phase,
    entries,
  };

  const logFile = `scripts/deletion-log-${new Date().toISOString().split("T")[0]}.json`;
  let existingLogs: DeletionLog[] = [];

  if (fs.existsSync(logFile)) {
    existingLogs = JSON.parse(fs.readFileSync(logFile, "utf-8"));
  }

  existingLogs.push(logEntry);
  fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));
  console.log(`  Logged ${entries.length} deletions to ${logFile}`);
}

async function phase1Services(isDryRun: boolean): Promise<number> {
  console.log("\n=== Phase 1: Service/Experience Cleanup ===\n");

  // Find services to delete
  const { data: servicesFound, error: findError } = await supabase
    .from("locations")
    .select("id, name, place_id, city, prefecture, primary_photo_url")
    .in("name", SERVICES_TO_DELETE);

  if (findError) {
    console.error("Error finding services:", findError);
    return 0;
  }

  console.log(`Found ${servicesFound?.length || 0} of ${SERVICES_TO_DELETE.length} services to delete:\n`);

  if (servicesFound && servicesFound.length > 0) {
    for (const loc of servicesFound) {
      console.log(`  - "${loc.name}" (city: ${loc.city}, prefecture: ${loc.prefecture})`);
    }
  }

  // Check for any not found
  const foundNames = new Set(servicesFound?.map((l) => l.name) || []);
  const notFound = SERVICES_TO_DELETE.filter((name) => !foundNames.has(name));
  if (notFound.length > 0) {
    console.log(`\n  Not found (may be named differently or already deleted):`);
    for (const name of notFound) {
      console.log(`    - "${name}"`);
    }
  }

  if (isDryRun || !servicesFound || servicesFound.length === 0) {
    return servicesFound?.length || 0;
  }

  // Log before deletion
  await logDeletions(1, servicesFound);

  // Execute deletion
  const idsToDelete = servicesFound.map((s) => s.id);
  const { error: deleteError } = await supabase
    .from("locations")
    .delete()
    .in("id", idsToDelete);

  if (deleteError) {
    console.error("Error deleting services:", deleteError);
    return 0;
  }

  console.log(`\n  ✓ Deleted ${servicesFound.length} service entries`);
  return servicesFound.length;
}

async function phase2Duplicates(isDryRun: boolean): Promise<number> {
  console.log("\n=== Phase 2: Duplicate Cleanup ===\n");

  // Get all locations
  const { data: allLocations, error: fetchError } = await supabase
    .from("locations")
    .select("id, name, place_id, city, prefecture, primary_photo_url")
    .order("name");

  if (fetchError) {
    console.error("Error fetching locations:", fetchError);
    return 0;
  }

  if (!allLocations) {
    console.log("  No locations found");
    return 0;
  }

  // Group by name
  const nameGroups = new Map<string, LocationRecord[]>();
  for (const loc of allLocations) {
    const existing = nameGroups.get(loc.name) || [];
    existing.push(loc);
    nameGroups.set(loc.name, existing);
  }

  // Find duplicates (more than one entry with same name)
  const duplicateGroups: { name: string; entries: LocationRecord[] }[] = [];
  for (const [name, entries] of nameGroups.entries()) {
    if (entries.length > 1) {
      duplicateGroups.push({ name, entries });
    }
  }

  console.log(`Found ${duplicateGroups.length} duplicate groups`);

  // Determine which entries to delete
  const toDelete: LocationRecord[] = [];
  const toKeep: LocationRecord[] = [];

  for (const group of duplicateGroups) {
    // Check if it's a highway (delete all)
    if (HIGHWAYS_TO_DELETE.includes(group.name)) {
      console.log(`\n  "${group.name}" (${group.entries.length} entries) - HIGHWAY, deleting all`);
      toDelete.push(...group.entries);
      continue;
    }

    // Group by place_id within this name group
    const placeIdGroups = new Map<string | null, LocationRecord[]>();
    for (const entry of group.entries) {
      const key = entry.place_id || "NULL";
      const existing = placeIdGroups.get(key) || [];
      existing.push(entry);
      placeIdGroups.set(key, existing);
    }

    // For each place_id group, keep the one with the most data
    for (const [placeId, entries] of placeIdGroups.entries()) {
      if (entries.length === 1) {
        // Only one entry for this place_id, keep it
        toKeep.push(entries[0]);
        continue;
      }

      // Multiple entries with same place_id - keep one with best data
      // Prefer entries with: photo > prefecture > city
      const sorted = entries.sort((a, b) => {
        const scoreA =
          (a.primary_photo_url ? 4 : 0) +
          (a.prefecture ? 2 : 0) +
          (a.city ? 1 : 0);
        const scoreB =
          (b.primary_photo_url ? 4 : 0) +
          (b.prefecture ? 2 : 0) +
          (b.city ? 1 : 0);
        return scoreB - scoreA;
      });

      toKeep.push(sorted[0]);
      toDelete.push(...sorted.slice(1));
    }
  }

  console.log(`\nDuplicates to delete: ${toDelete.length}`);
  console.log(`Entries to keep: ${toKeep.length}`);

  if (toDelete.length > 0) {
    console.log(`\nSample of duplicates to delete (first 20):`);
    const sample = toDelete.slice(0, 20);
    for (const loc of sample) {
      console.log(`  - "${loc.name}" (place_id: ${loc.place_id?.slice(0, 20)}...)`);
    }
    if (toDelete.length > 20) {
      console.log(`  ... and ${toDelete.length - 20} more`);
    }
  }

  if (isDryRun || toDelete.length === 0) {
    return toDelete.length;
  }

  // Log before deletion
  await logDeletions(2, toDelete);

  // Execute deletion in batches (Supabase has limits)
  const batchSize = 100;
  let deleted = 0;

  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    const idsToDelete = batch.map((loc) => loc.id);

    const { error: deleteError } = await supabase
      .from("locations")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      console.error(`Error deleting batch ${i / batchSize + 1}:`, deleteError);
      continue;
    }

    deleted += batch.length;
    console.log(`  ✓ Deleted batch ${Math.floor(i / batchSize) + 1} (${deleted}/${toDelete.length})`);
  }

  console.log(`\n  ✓ Deleted ${deleted} duplicate entries`);
  return deleted;
}

async function phase3IncompleteNames(isDryRun: boolean): Promise<number> {
  console.log("\n=== Phase 3: Incomplete Name Cleanup ===\n");

  // Find incomplete names
  const { data: incompleteFound, error: findError } = await supabase
    .from("locations")
    .select("id, name, place_id, city, prefecture, primary_photo_url")
    .in("name", INCOMPLETE_NAMES_TO_DELETE);

  if (findError) {
    console.error("Error finding incomplete names:", findError);
    return 0;
  }

  console.log(`Found ${incompleteFound?.length || 0} of ${INCOMPLETE_NAMES_TO_DELETE.length} incomplete entries:\n`);

  if (incompleteFound && incompleteFound.length > 0) {
    for (const loc of incompleteFound) {
      console.log(`  - "${loc.name}" (city: ${loc.city}, prefecture: ${loc.prefecture})`);
    }
  }

  // Check for any not found
  const foundNames = new Set(incompleteFound?.map((l) => l.name) || []);
  const notFound = INCOMPLETE_NAMES_TO_DELETE.filter((name) => !foundNames.has(name));
  if (notFound.length > 0) {
    console.log(`\n  Not found (may not exist or already deleted):`);
    for (const name of notFound) {
      console.log(`    - "${name}"`);
    }
  }

  if (isDryRun || !incompleteFound || incompleteFound.length === 0) {
    return incompleteFound?.length || 0;
  }

  // Log before deletion
  await logDeletions(3, incompleteFound);

  // Execute deletion
  const idsToDelete = incompleteFound.map((loc) => loc.id);
  const { error: deleteError } = await supabase
    .from("locations")
    .delete()
    .in("id", idsToDelete);

  if (deleteError) {
    console.error("Error deleting incomplete names:", deleteError);
    return 0;
  }

  console.log(`\n  ✓ Deleted ${incompleteFound.length} incomplete name entries`);
  return incompleteFound.length;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const phaseArg = args.find((a) => a.startsWith("--phase="));
  const specificPhase = phaseArg ? parseInt(phaseArg.split("=")[1]) : null;

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║        Koku Travel - Data Quality Cleanup Script           ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  if (isDryRun) {
    console.log("\n🔍 DRY RUN MODE - No changes will be made\n");
  }

  const beforeCount = await getLocationCount();
  console.log(`Current total locations: ${beforeCount}`);

  let totalDeleted = 0;

  // Run phases based on arguments
  if (!specificPhase || specificPhase === 1) {
    totalDeleted += await phase1Services(isDryRun);
  }

  if (!specificPhase || specificPhase === 2) {
    totalDeleted += await phase2Duplicates(isDryRun);
  }

  if (!specificPhase || specificPhase === 3) {
    totalDeleted += await phase3IncompleteNames(isDryRun);
  }

  // Final summary
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║                        SUMMARY                             ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  if (isDryRun) {
    console.log(`\n📊 Would delete: ${totalDeleted} entries`);
    console.log(`📊 Before: ${beforeCount} → After: ~${beforeCount - totalDeleted}`);
    console.log("\n[DRY RUN] No changes made. Remove --dry-run to execute.");
  } else {
    const afterCount = await getLocationCount();
    console.log(`\n📊 Before: ${beforeCount} locations`);
    console.log(`📊 After:  ${afterCount} locations`);
    console.log(`📊 Deleted: ${beforeCount - afterCount} entries`);

    if (beforeCount - afterCount !== totalDeleted) {
      console.log(`\n⚠️  Note: Expected to delete ${totalDeleted}, actually deleted ${beforeCount - afterCount}`);
      console.log("   (Some entries may have been deleted by other operations)");
    }
  }

  console.log("\n✅ Done!");
}

main().catch(console.error);
