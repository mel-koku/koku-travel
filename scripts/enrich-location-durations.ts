#!/usr/bin/env tsx
/**
 * Script to enrich locations with estimated_duration based on category defaults
 *
 * This script sets the estimated_duration field for all locations that have NULL duration.
 * Duration is assigned based on the location's category using defaults from durationExtractor.ts
 *
 * Usage:
 *   npx tsx scripts/enrich-location-durations.ts --dry-run  # Preview changes
 *   npx tsx scripts/enrich-location-durations.ts --limit=50 # Process only 50 locations
 *   npx tsx scripts/enrich-location-durations.ts            # Full enrichment
 */

// Load environment variables FIRST before any other imports
import { config } from "dotenv";
const result = config({ path: ".env.local" });

if (result.error) {
  console.error("Failed to load .env.local:", result.error);
  process.exit(1);
}

// Verify required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL must be configured in .env.local"
  );
  process.exit(1);
}

/**
 * Default duration in minutes for different location categories.
 * Matches the constants from src/lib/durationExtractor.ts
 */
const CATEGORY_DEFAULT_DURATIONS: Record<string, number> = {
  culture: 90, // Temples, museums, historical sites -> "1-2 hours"
  food: 60, // Restaurants, cafes -> "1 hour"
  nature: 120, // Parks, gardens, hiking trails -> "2 hours"
  shopping: 90, // Markets, shopping districts -> "1-2 hours"
  entertainment: 120, // Shows, events -> "2 hours"
  accommodation: 0, // Not a visit duration (skip)
  transportation: 0, // Not a visit duration (skip)
};

const DEFAULT_DURATION = 90; // Default fallback in minutes

/**
 * Convert minutes to a human-readable duration string
 * Matches the format used in the database
 */
function minutesToDisplayString(minutes: number): string {
  if (minutes <= 0) return "";
  if (minutes <= 30) return "30 minutes";
  if (minutes <= 60) return "Up to 1 hour";
  if (minutes <= 90) return "1-2 hours";
  if (minutes <= 120) return "2 hours";
  if (minutes <= 180) return "2-3 hours";
  return "3+ hours";
}

interface LocationRow {
  id: string;
  name: string;
  category: string | null;
  estimated_duration: string | null;
}

interface EnrichmentResult {
  id: string;
  name: string;
  category: string | null;
  duration: string;
  minutes: number;
  skipped: boolean;
  reason?: string;
}

const BATCH_SIZE = 100;

/**
 * Main enrichment function
 */
async function enrichLocationDurations() {
  const isDryRun = process.argv.includes("--dry-run");

  // Parse --limit flag
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;

  // Use service role client for updates (has write permissions)
  const serviceRoleModule = await import("@/lib/supabase/serviceRole");
  const supabase = serviceRoleModule.getServiceRoleClient();

  console.log("=".repeat(80));
  console.log("LOCATION DURATION ENRICHMENT");
  console.log("=".repeat(80));
  console.log("");

  if (isDryRun) {
    console.log("  DRY RUN MODE - No database updates will be made\n");
  }

  if (limit) {
    console.log(`  LIMIT MODE - Processing only ${limit} locations\n`);
  }

  // Display category -> duration mapping
  console.log("Duration mapping:");
  for (const [category, minutes] of Object.entries(CATEGORY_DEFAULT_DURATIONS)) {
    if (minutes === 0) {
      console.log(`  ${category}: (skipped - not a visit duration)`);
    } else {
      console.log(`  ${category}: ${minutes} min -> "${minutesToDisplayString(minutes)}"`);
    }
  }
  console.log(`  (default): ${DEFAULT_DURATION} min -> "${minutesToDisplayString(DEFAULT_DURATION)}"`);
  console.log("");

  // Fetch locations with NULL estimated_duration
  console.log("Fetching locations with NULL estimated_duration...");

  let allLocations: LocationRow[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, category, estimated_duration")
      .is("estimated_duration", null)
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching locations:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allLocations = [...allLocations, ...(data as LocationRow[])];
    page++;

    if (data.length < pageSize) {
      hasMore = false;
    }
  }

  console.log(`Found ${allLocations.length} locations with NULL duration\n`);

  if (allLocations.length === 0) {
    console.log("All locations already have duration data!");
    return;
  }

  // Apply limit if specified
  const locationsToProcess = limit
    ? allLocations.slice(0, limit)
    : allLocations;

  // Group by category for reporting
  const byCategory: Record<string, number> = {};
  for (const loc of locationsToProcess) {
    const cat = loc.category || "(null)";
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }

  console.log("Locations by category:");
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    const minutes = cat === "(null)" ? DEFAULT_DURATION : (CATEGORY_DEFAULT_DURATIONS[cat] ?? DEFAULT_DURATION);
    console.log(`  ${cat}: ${count} locations -> "${minutesToDisplayString(minutes)}"`);
  }
  console.log("");

  // Process locations and collect results
  console.log(`Processing ${locationsToProcess.length} locations...`);

  const results: EnrichmentResult[] = [];
  let successCount = 0;
  let skippedCount = 0;

  for (const location of locationsToProcess) {
    const category = location.category || null;
    const minutes = category
      ? (CATEGORY_DEFAULT_DURATIONS[category] ?? DEFAULT_DURATION)
      : DEFAULT_DURATION;

    // Skip accommodation and transportation (0 duration)
    if (minutes === 0) {
      results.push({
        id: location.id,
        name: location.name,
        category,
        duration: "",
        minutes: 0,
        skipped: true,
        reason: "Category does not have visit duration",
      });
      skippedCount++;
      continue;
    }

    const displayString = minutesToDisplayString(minutes);

    results.push({
      id: location.id,
      name: location.name,
      category,
      duration: displayString,
      minutes,
      skipped: false,
    });
    successCount++;
  }

  // Batch update database
  if (!isDryRun) {
    const toUpdate = results.filter((r) => !r.skipped);

    console.log(`\nUpdating ${toUpdate.length} locations in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(toUpdate.length / BATCH_SIZE);

      // Update each location in the batch
      for (const item of batch) {
        const { error } = await supabase
          .from("locations")
          .update({ estimated_duration: item.duration })
          .eq("id", item.id);

        if (error) {
          console.error(`  Error updating ${item.name}: ${error.message}`);
        }
      }

      console.log(`  Batch ${batchNum}/${totalBatches} complete (${batch.length} locations)`);
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total processed: ${locationsToProcess.length}`);
  console.log(`  Updated: ${successCount}`);
  console.log(`  Skipped: ${skippedCount}`);

  // Show sample updates
  console.log("\nSample updates:");
  const sampleUpdates = results.filter((r) => !r.skipped).slice(0, 5);
  for (const update of sampleUpdates) {
    console.log(`  ${update.name} (${update.category || "no category"}) -> "${update.duration}"`);
  }
  if (successCount > 5) {
    console.log(`  ... and ${successCount - 5} more`);
  }

  // Show skipped (if any)
  if (skippedCount > 0) {
    console.log("\nSkipped locations:");
    const sampleSkipped = results.filter((r) => r.skipped).slice(0, 3);
    for (const skipped of sampleSkipped) {
      console.log(`  ${skipped.name} (${skipped.category}) - ${skipped.reason}`);
    }
    if (skippedCount > 3) {
      console.log(`  ... and ${skippedCount - 3} more`);
    }
  }

  if (isDryRun) {
    console.log("\n  This was a dry run - no database updates were made");
    console.log("  Run without --dry-run to apply changes");
  }

  if (limit && allLocations.length > limit) {
    console.log(
      `\n  ${allLocations.length - limit} locations remaining (remove --limit to process all)`
    );
  }

  console.log("");
}

// Run the script
enrichLocationDurations().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
