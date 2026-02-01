#!/usr/bin/env tsx
/**
 * Script to import Gemini-enriched location data
 *
 * This script:
 * 1. Reads all JSON files from data/gemini-discovered/
 * 2. Parses operating_hours and meal_options data
 * 3. Updates the locations table with the enrichment data
 *
 * Usage:
 *   npx tsx scripts/import-gemini-enrichment.ts
 *   npx tsx scripts/import-gemini-enrichment.ts --dry-run  # Test without updating DB
 */

// Load environment variables FIRST before any other imports
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";

const result = config({ path: ".env.local" });

if (result.error) {
  console.error("Failed to load .env.local:", result.error);
  process.exit(1);
}

// Type definitions for the JSON data
interface OperatingHoursEntry {
  id: string;
  operating_hours: {
    open: string;
    close: string;
  };
}

interface MealOptionsEntry {
  id: string;
  meal_options: {
    servesBreakfast: boolean;
    servesBrunch: boolean;
    servesLunch: boolean;
    servesDinner: boolean;
  };
}

interface ImportStats {
  hoursFiles: number;
  mealOptionsFiles: number;
  hoursEntries: number;
  mealOptionsEntries: number;
  hoursUpdated: number;
  mealOptionsUpdated: number;
  hoursNotFound: number;
  mealOptionsNotFound: number;
  hoursErrors: number;
  mealOptionsErrors: number;
}

async function loadJsonFiles<T>(directory: string, pattern: string): Promise<T[]> {
  const files = fs.readdirSync(directory).filter(f => f.startsWith(pattern) && f.endsWith(".json"));
  const entries: T[] = [];

  for (const file of files) {
    const filePath = path.join(directory, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content) as T[];
    entries.push(...data);
    console.log(`  Loaded ${data.length} entries from ${file}`);
  }

  return entries;
}

async function importGeminiEnrichment() {
  const isDryRun = process.argv.includes("--dry-run");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL must be configured");
    process.exit(1);
  }

  // Use service role client for updates (has write permissions)
  const serviceRoleModule = await import("@/lib/supabase/serviceRole");
  const supabase = serviceRoleModule.getServiceRoleClient();

  console.log("=".repeat(80));
  console.log("GEMINI ENRICHMENT DATA IMPORT");
  console.log("=".repeat(80));
  console.log("");

  if (isDryRun) {
    console.log("⚠️  DRY RUN MODE - No database updates will be made\n");
  }

  const stats: ImportStats = {
    hoursFiles: 0,
    mealOptionsFiles: 0,
    hoursEntries: 0,
    mealOptionsEntries: 0,
    hoursUpdated: 0,
    mealOptionsUpdated: 0,
    hoursNotFound: 0,
    mealOptionsNotFound: 0,
    hoursErrors: 0,
    mealOptionsErrors: 0,
  };

  const dataDir = path.join(process.cwd(), "data", "gemini-discovered");

  // Load operating hours data
  console.log("Loading operating hours data...");
  const hoursFiles = fs.readdirSync(dataDir).filter(f => f.startsWith("hours_result") && f.endsWith(".json"));
  stats.hoursFiles = hoursFiles.length;
  const hoursEntries = await loadJsonFiles<OperatingHoursEntry>(dataDir, "hours_result");
  stats.hoursEntries = hoursEntries.length;
  console.log(`  Total: ${hoursEntries.length} operating hours entries from ${hoursFiles.length} files\n`);

  // Load meal options data
  console.log("Loading meal options data...");
  const mealOptionsFiles = fs.readdirSync(dataDir).filter(f => f.startsWith("meal_options_result") && f.endsWith(".json"));
  stats.mealOptionsFiles = mealOptionsFiles.length;
  const mealOptionsEntries = await loadJsonFiles<MealOptionsEntry>(dataDir, "meal_options_result");
  stats.mealOptionsEntries = mealOptionsEntries.length;
  console.log(`  Total: ${mealOptionsEntries.length} meal options entries from ${mealOptionsFiles.length} files\n`);

  // Create lookup maps
  const hoursMap = new Map<string, OperatingHoursEntry["operating_hours"]>();
  for (const entry of hoursEntries) {
    hoursMap.set(entry.id, entry.operating_hours);
  }

  const mealOptionsMap = new Map<string, MealOptionsEntry["meal_options"]>();
  for (const entry of mealOptionsEntries) {
    mealOptionsMap.set(entry.id, entry.meal_options);
  }

  // Get all unique IDs to update
  const allIds = new Set([...hoursMap.keys(), ...mealOptionsMap.keys()]);
  console.log(`Found ${allIds.size} unique location IDs to update\n`);

  // Process updates
  console.log("Processing updates...");
  let processed = 0;
  const notFoundIds: string[] = [];

  for (const id of allIds) {
    processed++;
    if (processed % 100 === 0) {
      console.log(`  Processed ${processed}/${allIds.size} locations...`);
    }

    const hours = hoursMap.get(id);
    const mealOptions = mealOptionsMap.get(id);

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (hours) {
      updateData.operating_hours = hours;
    }

    if (mealOptions) {
      updateData.meal_options = mealOptions;
    }

    if (Object.keys(updateData).length === 0) {
      continue;
    }

    if (!isDryRun) {
      const { error, data } = await supabase
        .from("locations")
        .update(updateData)
        .eq("id", id)
        .select("id");

      if (error) {
        if (hours) stats.hoursErrors++;
        if (mealOptions) stats.mealOptionsErrors++;
        console.error(`  ⚠️  Error updating ${id}: ${error.message}`);
      } else if (!data || data.length === 0) {
        notFoundIds.push(id);
        if (hours) stats.hoursNotFound++;
        if (mealOptions) stats.mealOptionsNotFound++;
      } else {
        if (hours) stats.hoursUpdated++;
        if (mealOptions) stats.mealOptionsUpdated++;
      }
    } else {
      // Dry run - check if location exists
      const { data } = await supabase
        .from("locations")
        .select("id")
        .eq("id", id)
        .single();

      if (!data) {
        notFoundIds.push(id);
        if (hours) stats.hoursNotFound++;
        if (mealOptions) stats.mealOptionsNotFound++;
      } else {
        if (hours) stats.hoursUpdated++;
        if (mealOptions) stats.mealOptionsUpdated++;
      }
    }
  }

  // Print summary
  console.log("");
  console.log("=".repeat(80));
  console.log("IMPORT COMPLETE!");
  console.log("=".repeat(80));
  console.log("");
  console.log("Operating Hours:");
  console.log(`  Files loaded:      ${stats.hoursFiles}`);
  console.log(`  Entries found:     ${stats.hoursEntries}`);
  console.log(`  ✅ Updated:        ${stats.hoursUpdated}`);
  console.log(`  ⚠️  Not found:     ${stats.hoursNotFound}`);
  console.log(`  ❌ Errors:         ${stats.hoursErrors}`);
  console.log("");
  console.log("Meal Options:");
  console.log(`  Files loaded:      ${stats.mealOptionsFiles}`);
  console.log(`  Entries found:     ${stats.mealOptionsEntries}`);
  console.log(`  ✅ Updated:        ${stats.mealOptionsUpdated}`);
  console.log(`  ⚠️  Not found:     ${stats.mealOptionsNotFound}`);
  console.log(`  ❌ Errors:         ${stats.mealOptionsErrors}`);

  if (isDryRun) {
    console.log("");
    console.log("⚠️  This was a dry run. No database updates were made.");
    console.log("   Run without --dry-run to update the database.");
  }

  // Show not found locations (first 20)
  if (notFoundIds.length > 0) {
    console.log("");
    console.log(`Locations not found in database (${notFoundIds.length} total):`);
    const toShow = notFoundIds.slice(0, 20);
    toShow.forEach(id => console.log(`  • ${id}`));
    if (notFoundIds.length > 20) {
      console.log(`  ... and ${notFoundIds.length - 20} more`);
    }
  }

  console.log("");
  console.log("=".repeat(80));
}

importGeminiEnrichment()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
