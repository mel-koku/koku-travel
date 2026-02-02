#!/usr/bin/env tsx
/**
 * Fix Location Names Script
 *
 * Applies corrections to fix misnamed locations in the database.
 * - RENAME: Updates the location name to the correct name
 * - DELETE: Removes duplicate entries where correct location already exists
 *
 * Usage:
 *   npx tsx scripts/data-quality/fix-location-names.ts --dry-run           # Preview changes
 *   npx tsx scripts/data-quality/fix-location-names.ts                     # Apply changes
 *   npx tsx scripts/data-quality/fix-location-names.ts --input file.json   # Use corrections file
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Verify required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in .env.local");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

interface CorrectionReport {
  id: string;
  currentName: string;
  correctName: string;
  city: string;
  region: string;
  editorial_summary: string | null;
  coordinates: { lat: number; lng: number } | null;
  place_id: string | null;
  googlePlaceId: string | null;
  action: "rename" | "delete" | "skip";
  reason: string;
  existingLocationId?: string;
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const inputIndex = args.indexOf("--input");

/**
 * Load corrections from file or run the lookup process inline
 */
async function loadCorrections(inputFile?: string): Promise<CorrectionReport[]> {
  if (inputFile) {
    const fullPath = path.isAbsolute(inputFile) ? inputFile : path.join(process.cwd(), inputFile);
    if (!fs.existsSync(fullPath)) {
      console.error(`File not found: ${fullPath}`);
      process.exit(1);
    }
    const content = fs.readFileSync(fullPath, "utf-8");
    return JSON.parse(content);
  }

  // If no input file, run the detection and lookup inline
  console.log("No input file provided. Running detection and lookup...\n");

  const { data, error } = await supabase
    .from("locations")
    .select("id, name, city, region, category, editorial_summary, coordinates, place_id")
    .not("editorial_summary", "is", null)
    .in("category", ["shrine", "temple", "culture", "landmark", "attraction"])
    .order("name");

  if (error) {
    console.error("Failed to fetch locations:", error.message);
    process.exit(1);
  }

  // Filter to suspicious ones and create corrections
  const EVENT_KEYWORDS = ["festival", "matsuri", "noh", "ebisu", "honen", "setsubun", "yayoi", "toka", "takigi", "chibikko", "oto", "owari", "kanda"];
  const SHRINE_TEMPLE_KEYWORDS = ["shrine", "temple", "pagoda", "buddhist", "shinto", "founded", "established", "century"];

  const suspicious = (data || []).filter(loc => {
    const lowerName = loc.name.toLowerCase();
    const lowerSummary = (loc.editorial_summary || "").toLowerCase();
    const hasEventName = EVENT_KEYWORDS.some(k => lowerName.includes(k));
    const describesShrine = SHRINE_TEMPLE_KEYWORDS.some(k => lowerSummary.includes(k));
    return hasEventName && describesShrine;
  });

  if (suspicious.length === 0) {
    return [];
  }

  // For inline mode, we need Google API
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error("Error: GOOGLE_PLACES_API_KEY required for inline lookup.");
    console.error("Either set the API key or provide an input file with --input");
    process.exit(1);
  }

  const corrections: CorrectionReport[] = [];
  const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  for (const loc of suspicious) {
    console.log(`Looking up: ${loc.name}...`);

    let correctName: string | null = null;
    let googlePlaceId: string | null = loc.place_id;

    // Query Google Places for correct name
    if (loc.place_id) {
      try {
        const url = `https://places.googleapis.com/v1/places/${loc.place_id}`;
        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_API_KEY,
            "X-Goog-FieldMask": "displayName",
          },
        });

        if (response.ok) {
          const data = await response.json();
          correctName = data.displayName?.text || null;
        }
      } catch (err) {
        console.error(`  Failed to lookup ${loc.name}:`, err);
      }
    }

    // Check for existing duplicate
    let existingId: string | null = null;
    if (correctName && correctName.toLowerCase() !== loc.name.toLowerCase()) {
      const { data: existing } = await supabase
        .from("locations")
        .select("id")
        .ilike("name", correctName)
        .ilike("city", loc.city)
        .limit(1);

      if (existing && existing.length > 0) {
        existingId = existing[0].id;
      }
    }

    let action: "rename" | "delete" | "skip" = "skip";
    let reason = "Could not determine action";

    if (!correctName) {
      action = "skip";
      reason = "Could not determine correct name";
    } else if (correctName.toLowerCase() === loc.name.toLowerCase()) {
      action = "skip";
      reason = "Name already correct";
    } else if (existingId) {
      action = "delete";
      reason = "Duplicate of existing location";
    } else {
      action = "rename";
      reason = "Name should be updated";
    }

    corrections.push({
      id: loc.id,
      currentName: loc.name,
      correctName: correctName || loc.name,
      city: loc.city,
      region: loc.region,
      editorial_summary: loc.editorial_summary,
      coordinates: loc.coordinates,
      place_id: loc.place_id,
      googlePlaceId,
      action,
      reason,
      existingLocationId: existingId || undefined,
    });

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return corrections;
}

/**
 * Apply rename correction
 */
async function applyRename(correction: CorrectionReport): Promise<boolean> {
  if (dryRun) {
    console.log(`  [DRY RUN] Would rename "${correction.currentName}" → "${correction.correctName}"`);
    return true;
  }

  const { error } = await supabase
    .from("locations")
    .update({ name: correction.correctName })
    .eq("id", correction.id);

  if (error) {
    console.error(`  ✗ Failed to rename: ${error.message}`);
    return false;
  }

  console.log(`  ✓ Renamed "${correction.currentName}" → "${correction.correctName}"`);
  return true;
}

/**
 * Apply delete correction
 */
async function applyDelete(correction: CorrectionReport): Promise<boolean> {
  if (dryRun) {
    console.log(`  [DRY RUN] Would delete "${correction.currentName}" (duplicate of ${correction.existingLocationId})`);
    return true;
  }

  const { error } = await supabase
    .from("locations")
    .delete()
    .eq("id", correction.id);

  if (error) {
    console.error(`  ✗ Failed to delete: ${error.message}`);
    return false;
  }

  console.log(`  ✓ Deleted "${correction.currentName}" (was duplicate of ${correction.existingLocationId})`);
  return true;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log("\n=== Fix Location Names ===");
  if (dryRun) {
    console.log("MODE: Dry run (no changes will be made)\n");
  } else {
    console.log("MODE: Live (changes will be applied)\n");
  }

  const inputFile = inputIndex !== -1 ? args[inputIndex + 1] : undefined;
  const corrections = await loadCorrections(inputFile);

  if (corrections.length === 0) {
    console.log("No corrections to apply.");
    return;
  }

  // Filter to actionable corrections
  const renames = corrections.filter(c => c.action === "rename");
  const deletes = corrections.filter(c => c.action === "delete");
  const skips = corrections.filter(c => c.action === "skip");

  console.log(`Found ${corrections.length} entries:`);
  console.log(`  - ${renames.length} to rename`);
  console.log(`  - ${deletes.length} to delete`);
  console.log(`  - ${skips.length} to skip\n`);

  let successCount = 0;
  let errorCount = 0;

  // Apply renames
  if (renames.length > 0) {
    console.log("=== Applying Renames ===\n");
    for (const correction of renames) {
      const success = await applyRename(correction);
      if (success) successCount++;
      else errorCount++;
    }
    console.log("");
  }

  // Apply deletes
  if (deletes.length > 0) {
    console.log("=== Applying Deletes ===\n");
    for (const correction of deletes) {
      const success = await applyDelete(correction);
      if (success) successCount++;
      else errorCount++;
    }
    console.log("");
  }

  // Report skips
  if (skips.length > 0) {
    console.log("=== Skipped ===\n");
    for (const correction of skips) {
      console.log(`  - ${correction.currentName}: ${correction.reason}`);
    }
    console.log("");
  }

  // Summary
  console.log("=== Summary ===");
  if (dryRun) {
    console.log(`Would process: ${renames.length + deletes.length} changes`);
    console.log(`Skipped: ${skips.length}`);
    console.log("\nTo apply changes, run without --dry-run:");
    console.log("  npx tsx scripts/data-quality/fix-location-names.ts" + (inputFile ? ` --input ${inputFile}` : ""));
  } else {
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Skipped: ${skips.length}`);
  }
}

main().catch(console.error);
