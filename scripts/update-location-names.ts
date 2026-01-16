#!/usr/bin/env tsx
/**
 * Script to update location names in the database with Google Places displayNames.
 * This fixes locations that were seeded with scraped names instead of official names.
 *
 * Usage:
 *   npx tsx scripts/update-location-names.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

interface EnrichedLocation {
  name: string;
  region: string;
  googleDisplayName?: string;
  enrichmentStatus: "success" | "partial" | "failed";
}

function generateLocationId(name: string, region: string): string {
  const normalized = `${name}-${region}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const hash = createHash("md5").update(`${name}-${region}`).digest("hex").substring(0, 8);
  return `${normalized}-${hash}`;
}

/**
 * Checks if a string contains Japanese characters (Hiragana, Katakana, or Kanji)
 */
function containsJapanese(text: string): boolean {
  // Hiragana: \u3040-\u309F, Katakana: \u30A0-\u30FF, Kanji: \u4E00-\u9FFF
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
  return japanesePattern.test(text);
}

/**
 * Gets the best display name for a location.
 * Prefers Google's displayName unless it contains Japanese characters,
 * in which case we use the original English scraped name.
 */
function getBestDisplayName(scrapedName: string, googleDisplayName?: string): string {
  if (!googleDisplayName || googleDisplayName.trim() === "") {
    return scrapedName;
  }

  const trimmedGoogleName = googleDisplayName.trim();

  // If Google's name contains Japanese, prefer the scraped English name
  if (containsJapanese(trimmedGoogleName)) {
    return scrapedName;
  }

  return trimmedGoogleName;
}

async function updateLocationNames() {
  console.log("Starting location name update...\n");

  // Dynamically import after env vars are loaded
  const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
  const supabase = getServiceRoleClient();

  // Load enriched data
  const enrichedPath = join(process.cwd(), "tmp", "enriched-locations.json");
  const fileContent = readFileSync(enrichedPath, "utf-8");
  const enrichedData = JSON.parse(fileContent);
  const scrapedLocations: EnrichedLocation[] = enrichedData.locations;

  console.log(`Found ${scrapedLocations.length} locations in enriched data\n`);

  // Build a map of location ID -> best display name
  // We update ALL locations to ensure the database has the best name
  const nameUpdates: { id: string; scrapedName: string; bestName: string }[] = [];

  for (const loc of scrapedLocations) {
    const bestName = getBestDisplayName(loc.name, loc.googleDisplayName);
    const id = generateLocationId(loc.name, loc.region);
    nameUpdates.push({
      id,
      scrapedName: loc.name,
      bestName,
    });
  }

  console.log(`Found ${nameUpdates.length} locations needing name updates\n`);

  if (nameUpdates.length === 0) {
    console.log("No updates needed.");
    return;
  }

  // Update in batches
  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const update of nameUpdates) {
    const { error } = await supabase
      .from("locations")
      .update({ name: update.bestName })
      .eq("id", update.id);

    if (error) {
      // Location might not exist in DB
      skipped++;
    } else {
      updated++;
      if (updated % 100 === 0) {
        console.log(`Updated ${updated} locations...`);
      }
    }
  }

  console.log(`\n✅ Updated ${updated} location names`);
  if (skipped > 0) {
    console.log(`⏭️  Skipped ${skipped} locations (not in database)`);
  }

  // Also clear the place_details cache to force fresh fetches
  console.log("\nClearing place_details cache...");
  const { error: cacheError } = await supabase
    .from("place_details")
    .delete()
    .neq("location_id", ""); // Delete all rows

  if (cacheError) {
    console.error(`Failed to clear cache: ${cacheError.message}`);
  } else {
    console.log("✅ Cache cleared successfully");
  }
}

updateLocationNames()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
