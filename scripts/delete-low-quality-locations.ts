/**
 * Script to delete low-quality location entries from the database.
 * These entries have vague/incomplete names or are not actual destinations.
 *
 * Usage:
 *   npx tsx scripts/delete-low-quality-locations.ts --dry-run  # Preview deletions
 *   npx tsx scripts/delete-low-quality-locations.ts            # Execute deletions
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const LOCATIONS_TO_DELETE = [
  "Asia Pacific",
  "Gonokawa",
  "National Route 1",
  "Nikko Kaido",
  "Route 58",
  "The East",
  "The Japanese",
  "Things To Do In Okinawa",
];

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("=== Delete Low-Quality Location Entries ===\n");

  // Get current count
  const { count: beforeCount } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true });

  console.log(`Current total locations: ${beforeCount}`);

  // Find the locations to delete
  const { data: locationsFound, error: findError } = await supabase
    .from("locations")
    .select("id, name, city, prefecture")
    .in("name", LOCATIONS_TO_DELETE);

  if (findError) {
    console.error("Error finding locations:", findError);
    process.exit(1);
  }

  console.log(`\nFound ${locationsFound?.length || 0} of ${LOCATIONS_TO_DELETE.length} locations to delete:\n`);

  if (locationsFound && locationsFound.length > 0) {
    for (const loc of locationsFound) {
      console.log(`  - "${loc.name}" (city: ${loc.city}, prefecture: ${loc.prefecture})`);
    }
  }

  // Check for any locations not found
  const foundNames = new Set(locationsFound?.map((l) => l.name) || []);
  const notFound = LOCATIONS_TO_DELETE.filter((name) => !foundNames.has(name));
  if (notFound.length > 0) {
    console.log(`\nNot found in database (may have been deleted already):`);
    for (const name of notFound) {
      console.log(`  - "${name}"`);
    }
  }

  if (isDryRun) {
    console.log("\n[DRY RUN] No changes made. Remove --dry-run to execute deletion.");
    return;
  }

  if (!locationsFound || locationsFound.length === 0) {
    console.log("\nNo locations to delete.");
    return;
  }

  // Execute deletion
  console.log("\nDeleting locations...");

  const { error: deleteError } = await supabase
    .from("locations")
    .delete()
    .in("name", LOCATIONS_TO_DELETE);

  if (deleteError) {
    console.error("Error deleting locations:", deleteError);
    process.exit(1);
  }

  // Verify deletion
  const { count: afterCount } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true });

  console.log(`\n=== Results ===`);
  console.log(`Before: ${beforeCount} locations`);
  console.log(`After:  ${afterCount} locations`);
  console.log(`Deleted: ${(beforeCount || 0) - (afterCount || 0)} locations`);

  // Verify remaining city=region locations
  const regionNames = ["Kanto", "Kansai", "Chubu", "Tohoku", "Kyushu", "Chugoku", "Shikoku", "Hokkaido", "Okinawa"];
  const { data: remainingCityRegion } = await supabase
    .from("locations")
    .select("name, city, prefecture")
    .in("city", regionNames);

  console.log(`\nRemaining locations with city=region (${remainingCityRegion?.length || 0}):`);
  if (remainingCityRegion && remainingCityRegion.length > 0) {
    for (const loc of remainingCityRegion) {
      console.log(`  - "${loc.name}" (city: ${loc.city}, prefecture: ${loc.prefecture})`);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
