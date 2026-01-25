#!/usr/bin/env tsx
/**
 * Fix script for corrupted location city values.
 *
 * This script corrects locations that were incorrectly assigned to major cities
 * during the city consolidation process.
 *
 * Example: "Cape Higashi" in Miyakojima (Okinawa) was incorrectly given city="Osaka"
 * because "Miyakojima" is both an Okinawa city AND an Osaka ward.
 *
 * Usage:
 *   npx tsx scripts/fix-corrupted-locations.ts --dry-run   # Preview changes
 *   npx tsx scripts/fix-corrupted-locations.ts              # Apply fixes
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Known corrections based on the corruption patterns from city consolidation.
 * Format: { locationId: correctCityName }
 */
const CORRECTIONS: Record<string, string> = {
  // Osaka -> Miyakojima (Okinawa city, NOT Osaka ward)
  // These are beach/cape locations on Miyakojima island in Okinawa
  "cape-higashi-okinawa-7e430989": "Miyakojima",
  "shigira-beach-okinawa-f7f1950d": "Miyakojima",
  "hakuai-waiwai-beach-okinawa-6947132e": "Miyakojima",
  "yonaha-maehama-okinawa-9ac3bbce": "Miyakojima",

  // Yokohama -> Kanazawa (Chubu city, NOT Yokohama ward)
  // These are locations in Kanazawa city, Ishikawa prefecture
  "nagamachi-chubu-2ad46c09": "Kanazawa",
  "omicho-market-chubu-f77be206": "Kanazawa",
  "ishikawa-chubu-75a8ab67": "Kanazawa",
  "d-t-suzuki-chubu-95d4b2d1": "Kanazawa",
  "kanazawa-chubu-6d8925be": "Kanazawa",

  // Yokohama -> Konan (Shikoku city in Kochi, NOT Yokohama ward)
  "the-ekin-museum-shikoku-4ebd0567": "Konan",

  // Yokohama -> Osaka (Tsurumi is an Osaka ward, should stay as Osaka)
  // Actually this location is Tsurumi Ryokuchi Park in Osaka, not Yokohama
  "tsurumi-ryokuchi-kanto-a39392bf": "Osaka",

  // Nagoya -> Moriyama (Shiga city, NOT Nagoya ward)
  "sagawa-art-kansai-ea2274e3": "Moriyama",

  // Sapporo -> Shiroishi (Miyagi city, NOT Sapporo ward)
  "shiroishi-tohoku-d648e99b": "Shiroishi",
};

interface LocationRecord {
  id: string;
  name: string;
  city: string;
  region: string;
}

async function fixCorruptedLocations(isDryRun: boolean): Promise<void> {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║         Fix Corrupted Location City Values                     ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  if (isDryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (const [id, correctCity] of Object.entries(CORRECTIONS)) {
    // Get current location data
    const { data: loc, error: fetchError } = await supabase
      .from("locations")
      .select("id, name, city, region")
      .eq("id", id)
      .single();

    if (fetchError || !loc) {
      console.log(`⚠️  Location not found: ${id}`);
      skipped++;
      continue;
    }

    const location = loc as LocationRecord;

    // Skip if already correct
    if (location.city === correctCity) {
      console.log(`✓  "${location.name}" already has correct city: "${correctCity}"`);
      skipped++;
      continue;
    }

    console.log(`📍 ${location.name}`);
    console.log(`   Current: city="${location.city}", region="${location.region}"`);
    console.log(`   Fix: city="${correctCity}"`);

    if (!isDryRun) {
      const { error: updateError } = await supabase
        .from("locations")
        .update({ city: correctCity })
        .eq("id", id);

      if (updateError) {
        console.log(`   ❌ Error: ${updateError.message}`);
        errors++;
      } else {
        console.log(`   ✅ Fixed!`);
        fixed++;
      }
    } else {
      fixed++; // Count as would-be-fixed for dry run
    }
    console.log("");
  }

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log(`  Total corrections defined: ${Object.keys(CORRECTIONS).length}`);
  console.log(`  ${isDryRun ? "Would fix" : "Fixed"}: ${fixed}`);
  console.log(`  Skipped (already correct or not found): ${skipped}`);
  if (!isDryRun) {
    console.log(`  Errors: ${errors}`);
  }
  console.log("═══════════════════════════════════════════════════════════════════\n");

  if (isDryRun && fixed > 0) {
    console.log("Run without --dry-run to apply these fixes.");
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  await fixCorruptedLocations(isDryRun);
}

main().catch(console.error);
