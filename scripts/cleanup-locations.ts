#!/usr/bin/env tsx
/**
 * Identifies and removes non-tourist locations from the database.
 *
 * Categories of non-tourist locations:
 * 1. Product listings (e-commerce items scraped by mistake)
 * 2. Schools/educational facilities (non-historic)
 * 3. Generic businesses (not attractions)
 *
 * Run with --delete flag to actually remove locations.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

async function cleanup() {
  const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
  const supabase = getServiceRoleClient();

  console.log("=== Location Cleanup Tool ===\n");

  // Get all locations
  const { data: locations, error } = await supabase
    .from("locations")
    .select("id, name, category, city, region, short_description");

  if (error || !locations) {
    console.error("Failed to fetch locations:", error?.message);
    return;
  }

  console.log(`Total locations in database: ${locations.length}\n`);

  // Categories of non-tourist locations to remove
  const toRemove: { loc: typeof locations[0]; reason: string }[] = [];

  for (const loc of locations) {
    const name = loc.name;
    const nameLower = name.toLowerCase();
    let reason = "";

    // 1. Product listings - items for sale, not places to visit
    if (name.startsWith("[") && name.includes("]")) {
      reason = "Product listing (starts with bracket)";
    }
    // Product pattern: "ITEM NAME | CATEGORY WARE"
    else if (/\|\s*[\w\s]+(WARE|CERAMICS|POTTERY)\s*$/i.test(name)) {
      reason = "Product listing (ends with WARE/CERAMICS/POTTERY)";
    }
    // 2. Non-tourist educational facilities
    else if (
      (nameLower.includes("playpourri") ||
        nameLower.includes("kindergarten") ||
        nameLower.includes("preschool") ||
        nameLower.includes("daycare")) &&
      !nameLower.includes("museum") &&
      !nameLower.includes("memorial") &&
      !nameLower.includes("heritage")
    ) {
      reason = "Non-tourist educational facility";
    }
    // 3. Generic "variety of programs" type entries that are not real places
    else if (
      nameLower.startsWith("a variety of") ||
      nameLower.startsWith("various ") ||
      nameLower.includes("creative programs for children")
    ) {
      reason = "Generic activity description, not a specific place";
    }

    if (reason) {
      toRemove.push({ loc, reason });
    }
  }

  // Display findings
  console.log(`Found ${toRemove.length} non-tourist locations:\n`);

  for (const { loc, reason } of toRemove) {
    console.log(`❌ ${loc.name}`);
    console.log(`   Category: ${loc.category} | City: ${loc.city}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   ID: ${loc.id}`);
    console.log();
  }

  console.log(`\n=== Summary ===`);
  console.log(`Locations to remove: ${toRemove.length}`);
  console.log(`Locations to keep: ${locations.length - toRemove.length}`);

  // Delete if --delete flag is provided
  if (process.argv.includes("--delete") && toRemove.length > 0) {
    console.log(`\n🗑️  Deleting ${toRemove.length} locations...`);

    let deleted = 0;
    for (const { loc } of toRemove) {
      const { error: delError } = await supabase
        .from("locations")
        .delete()
        .eq("id", loc.id);

      if (delError) {
        console.error(`Failed to delete ${loc.id}: ${delError.message}`);
      } else {
        deleted++;
      }
    }

    console.log(`\n✅ Deleted ${deleted} locations`);

    // Verify final count
    const { count } = await supabase
      .from("locations")
      .select("*", { count: "exact", head: true });

    console.log(`Remaining locations: ${count}`);
  } else if (toRemove.length > 0) {
    console.log(`\nRun with --delete flag to remove these locations:`);
    console.log(`  npx tsx scripts/cleanup-locations.ts --delete`);
  }
}

cleanup()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
