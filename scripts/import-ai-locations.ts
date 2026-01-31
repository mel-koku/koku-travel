#!/usr/bin/env tsx
/**
 * Import AI-discovered locations into the database.
 *
 * Usage:
 *   npx tsx scripts/import-ai-locations.ts data/ai-discovered/kansai-temples.json
 *   npx tsx scripts/import-ai-locations.ts data/ai-discovered/ --all
 *   npx tsx scripts/import-ai-locations.ts data/ai-discovered/kansai-temples.json --dry-run
 *   npx tsx scripts/import-ai-locations.ts data/ai-discovered/kansai-temples.json --check-proximity
 *
 * Options:
 *   --all             Import all JSON files in the directory
 *   --dry-run         Validate only, no database writes
 *   --check-proximity Enable coordinate proximity checking (100m radius)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createHash } from "crypto";
import { readFileSync, readdirSync, statSync } from "fs";
import { basename, join } from "path";
import {
  aiLocationsArraySchema,
  AILocation,
  normalizeCategory,
  normalizeLocationName,
  VALID_REGIONS,
} from "./lib/ai-location-schema";

// Parse CLI arguments
const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--"));
const isDryRun = args.includes("--dry-run");
const importAll = args.includes("--all");
const checkProximity = args.includes("--check-proximity");

if (!inputPath) {
  console.error(
    "Usage: npx tsx scripts/import-ai-locations.ts <path> [--all] [--dry-run] [--check-proximity]",
  );
  console.error("");
  console.error("Examples:");
  console.error(
    "  npx tsx scripts/import-ai-locations.ts data/ai-discovered/kansai-temples.json",
  );
  console.error(
    "  npx tsx scripts/import-ai-locations.ts data/ai-discovered/ --all",
  );
  console.error(
    "  npx tsx scripts/import-ai-locations.ts data/ai-discovered/kansai-temples.json --dry-run",
  );
  process.exit(1);
}

// Constants
const PROXIMITY_THRESHOLD_METERS = 100;

/**
 * Generate a deterministic location ID based on name and region.
 * Matches the pattern used in seed-locations.ts.
 */
function generateLocationId(name: string, region: string): string {
  const normalized = `${name}-${region}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const hash = createHash("md5")
    .update(`${name}-${region}`)
    .digest("hex")
    .substring(0, 8);
  return `${normalized}-${hash}`;
}

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in meters.
 */
function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface ExistingLocation {
  id: string;
  name: string;
  region: string;
  coordinates: { lat: number; lng: number } | null;
}

interface DuplicateInfo {
  location: AILocation;
  reason: string;
  existingName?: string;
}

/**
 * Transform an AI location to database format.
 */
function transformForDatabase(location: AILocation) {
  const id = generateLocationId(location.name, location.region);
  const normalizedCategory = normalizeCategory(location.category);

  return {
    id,
    name: location.name,
    region: location.region,
    city: location.city,
    neighborhood: location.neighborhood || null,
    prefecture: location.prefecture || null,
    category: normalizedCategory,
    image: "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800", // Placeholder
    coordinates: {
      lat: location.coordinates.lat,
      lng: location.coordinates.lng,
    },
    short_description: location.short_description || null,
    description: location.description || null,
    estimated_duration: location.estimated_duration || null,
    rating: location.rating || null,
    review_count: location.review_count || null,
    min_budget: location.min_budget || null,
    is_seasonal: location.is_seasonal || false,
    seasonal_type: location.seasonal_type || null,
    operating_hours: location.operating_hours || null,
    timezone: "Asia/Tokyo",
    seed_source: "ai_discovered",
    seed_source_url: null,
    scraped_at: new Date().toISOString(),
    enrichment_confidence: 0.85,
    note: "AI-discovered location via Claude web search",
  };
}

/**
 * Load and validate a JSON file containing AI-discovered locations.
 */
function loadAndValidateFile(filePath: string): AILocation[] {
  console.log(`\n📂 Loading: ${basename(filePath)}`);

  let fileContent: string;
  try {
    fileContent = readFileSync(filePath, "utf-8");
  } catch (error) {
    console.error(`❌ Failed to read file: ${filePath}`);
    throw error;
  }

  let parsedData: unknown;
  try {
    parsedData = JSON.parse(fileContent);
  } catch (error) {
    console.error(`❌ Invalid JSON in file: ${filePath}`);
    throw error;
  }

  // Handle both array format and object with locations property
  const locationsData = Array.isArray(parsedData)
    ? parsedData
    : (parsedData as { locations?: unknown }).locations;

  if (!locationsData) {
    console.error(`❌ No locations array found in file: ${filePath}`);
    throw new Error("No locations array found");
  }

  // Validate with Zod
  const result = aiLocationsArraySchema.safeParse(locationsData);

  if (!result.success) {
    console.error(`❌ Validation failed for: ${filePath}`);
    console.error("");
    result.error.errors.forEach((err, idx) => {
      console.error(
        `  Error ${idx + 1}: ${err.path.join(".")} - ${err.message}`,
      );
    });
    throw new Error("Validation failed");
  }

  console.log(`✅ Validated ${result.data.length} locations`);
  return result.data;
}

/**
 * Get all JSON files from a directory.
 */
function getJsonFiles(dirPath: string): string[] {
  const files = readdirSync(dirPath);
  return files
    .filter((file) => file.endsWith(".json"))
    .map((file) => join(dirPath, file));
}

/**
 * Check for duplicates against existing database locations.
 */
function findDuplicates(
  newLocations: AILocation[],
  existingLocations: ExistingLocation[],
): { unique: AILocation[]; duplicates: DuplicateInfo[] } {
  const unique: AILocation[] = [];
  const duplicates: DuplicateInfo[] = [];

  // Build lookup maps for existing locations
  const existingByNormalizedName = new Map<string, ExistingLocation>();
  for (const loc of existingLocations) {
    const key = `${normalizeLocationName(loc.name)}|${loc.region}`;
    existingByNormalizedName.set(key, loc);
  }

  for (const location of newLocations) {
    // Check 1: Name + Region match
    const normalizedKey = `${normalizeLocationName(location.name)}|${location.region}`;
    const nameMatch = existingByNormalizedName.get(normalizedKey);

    if (nameMatch) {
      duplicates.push({
        location,
        reason: "Name + Region match",
        existingName: nameMatch.name,
      });
      continue;
    }

    // Check 2: Coordinate proximity (if enabled)
    if (checkProximity) {
      let proximityMatch: ExistingLocation | null = null;

      for (const existing of existingLocations) {
        if (existing.coordinates && existing.region === location.region) {
          const distance = calculateDistanceMeters(
            location.coordinates.lat,
            location.coordinates.lng,
            existing.coordinates.lat,
            existing.coordinates.lng,
          );

          if (distance <= PROXIMITY_THRESHOLD_METERS) {
            proximityMatch = existing;
            break;
          }
        }
      }

      if (proximityMatch) {
        duplicates.push({
          location,
          reason: `Within ${PROXIMITY_THRESHOLD_METERS}m of existing location`,
          existingName: proximityMatch.name,
        });
        continue;
      }
    }

    unique.push(location);
  }

  return { unique, duplicates };
}

async function main() {
  console.log("🗾 AI Location Import Tool");
  console.log("=".repeat(50));

  if (isDryRun) {
    console.log("🔍 DRY RUN MODE - No database writes will be made");
  }
  if (checkProximity) {
    console.log(
      `📍 Proximity checking enabled (${PROXIMITY_THRESHOLD_METERS}m radius)`,
    );
  }

  // Determine files to process
  let filesToProcess: string[] = [];

  const stats = statSync(inputPath);
  if (stats.isDirectory()) {
    if (!importAll) {
      console.error(
        "❌ Path is a directory. Use --all flag to import all JSON files.",
      );
      process.exit(1);
    }
    filesToProcess = getJsonFiles(inputPath);
    if (filesToProcess.length === 0) {
      console.error("❌ No JSON files found in directory.");
      process.exit(1);
    }
    console.log(`\n📁 Found ${filesToProcess.length} JSON files to process`);
  } else {
    filesToProcess = [inputPath];
  }

  // Load and validate all files
  let allLocations: AILocation[] = [];

  for (const file of filesToProcess) {
    try {
      const locations = loadAndValidateFile(file);
      allLocations = allLocations.concat(locations);
    } catch (error) {
      console.error(`\n⚠️  Skipping file due to errors: ${file}`);
    }
  }

  if (allLocations.length === 0) {
    console.error("\n❌ No valid locations to import.");
    process.exit(1);
  }

  console.log(`\n📊 Total locations to process: ${allLocations.length}`);

  // Show category breakdown
  const categoryBreakdown: Record<string, number> = {};
  for (const loc of allLocations) {
    const cat = normalizeCategory(loc.category);
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
  }
  console.log("\nCategory breakdown:");
  for (const [cat, count] of Object.entries(categoryBreakdown).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${cat}: ${count}`);
  }

  // Show region breakdown
  const regionBreakdown: Record<string, number> = {};
  for (const loc of allLocations) {
    regionBreakdown[loc.region] = (regionBreakdown[loc.region] || 0) + 1;
  }
  console.log("\nRegion breakdown:");
  for (const [region, count] of Object.entries(regionBreakdown).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${region}: ${count}`);
  }

  if (isDryRun) {
    console.log("\n✅ Dry run complete. All locations validated successfully.");
    console.log("   Remove --dry-run flag to insert into database.");
    process.exit(0);
  }

  // Connect to database
  console.log("\n🔌 Connecting to database...");

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY is missing!");
    console.error("   Add it to your .env.local file");
    process.exit(1);
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL is missing!");
    process.exit(1);
  }

  const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
  const supabase = getServiceRoleClient();

  // Fetch existing locations for deduplication
  console.log("📥 Fetching existing locations for deduplication...");

  const { data: existingLocations, error: fetchError } = await supabase
    .from("locations")
    .select("id, name, region, coordinates");

  if (fetchError) {
    console.error("❌ Failed to fetch existing locations:", fetchError.message);
    process.exit(1);
  }

  console.log(`   Found ${existingLocations?.length || 0} existing locations`);

  // Find duplicates
  const { unique, duplicates } = findDuplicates(
    allLocations,
    existingLocations || [],
  );

  // Report duplicates
  if (duplicates.length > 0) {
    console.log(
      `\n⚠️  Found ${duplicates.length} duplicates (will be skipped):`,
    );
    for (const dup of duplicates) {
      console.log(
        `   - "${dup.location.name}" (${dup.location.region}): ${dup.reason}`,
      );
      if (dup.existingName && dup.existingName !== dup.location.name) {
        console.log(`     Matched: "${dup.existingName}"`);
      }
    }
  }

  if (unique.length === 0) {
    console.log("\n✅ All locations are duplicates. Nothing to insert.");
    process.exit(0);
  }

  // Transform for database
  const locationsToInsert = unique.map(transformForDatabase);

  // Deduplicate by generated ID (in case same name+region appears multiple times in input)
  const seenIds = new Set<string>();
  const deduplicatedLocations = locationsToInsert.filter((loc) => {
    if (seenIds.has(loc.id)) {
      return false;
    }
    seenIds.add(loc.id);
    return true;
  });

  const inputDuplicates =
    locationsToInsert.length - deduplicatedLocations.length;
  if (inputDuplicates > 0) {
    console.log(
      `\n⚠️  Removed ${inputDuplicates} duplicate entries within input files`,
    );
  }

  // Insert in batches
  console.log(
    `\n📤 Inserting ${deduplicatedLocations.length} new locations...`,
  );

  const BATCH_SIZE = 100;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < deduplicatedLocations.length; i += BATCH_SIZE) {
    const batch = deduplicatedLocations.slice(i, i + BATCH_SIZE);

    const { error: insertError, count } = await supabase
      .from("locations")
      .upsert(batch, { onConflict: "id", ignoreDuplicates: true, count: "exact" });

    if (insertError) {
      console.error(
        `\n❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`,
        insertError.message,
      );
      failed += batch.length;
    } else {
      const batchInserted = count ?? batch.length;
      inserted += batchInserted;
      const skipped = batch.length - batchInserted;
      if (skipped > 0) {
        console.log(
          `   Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchInserted} inserted, ${skipped} skipped (already exist)`,
        );
      } else {
        console.log(`   Inserted ${inserted}/${deduplicatedLocations.length}...`);
      }
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Import Summary:");
  console.log(`   ✅ Inserted: ${inserted}`);
  console.log(`   ⚠️  Duplicates skipped: ${duplicates.length}`);
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed}`);
  }
  console.log("=".repeat(50));

  if (inserted > 0) {
    console.log("\n✅ Import complete!");
  }
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
