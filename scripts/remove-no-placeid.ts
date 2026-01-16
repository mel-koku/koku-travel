#!/usr/bin/env tsx
/**
 * Finds and removes locations without valid Google Place IDs.
 * These locations will show errors when users try to view details.
 *
 * Run with --delete flag to actually remove locations.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

async function cleanup() {
  const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
  const supabase = getServiceRoleClient();

  console.log("=== Finding Locations Without Valid Place IDs ===\n");

  // Get locations without place_id or with empty place_id
  const { data: noPlaceId, error } = await supabase
    .from("locations")
    .select("id, name, category, city, place_id")
    .or("place_id.is.null,place_id.eq.");

  if (error) {
    console.error("Error fetching locations:", error.message);
    return;
  }

  console.log(`Found ${noPlaceId?.length || 0} locations without Place ID:\n`);

  for (const loc of noPlaceId || []) {
    console.log(`❌ ${loc.name}`);
    console.log(`   Category: ${loc.category} | City: ${loc.city}`);
    console.log(`   ID: ${loc.id}`);
    console.log();
  }

  // Also check for locations with place_id that might be invalid
  // (We can't verify without making API calls, but we can check format)
  const { data: withPlaceId } = await supabase
    .from("locations")
    .select("id, name, place_id")
    .not("place_id", "is", null)
    .neq("place_id", "");

  // Valid Google Place IDs start with "ChIJ" or similar patterns
  const invalidFormat = (withPlaceId || []).filter(loc => {
    const pid = loc.place_id;
    // Valid Place IDs are typically 27+ characters and start with specific patterns
    return !pid || pid.length < 20 || (!pid.startsWith("ChIJ") && !pid.startsWith("Eh"));
  });

  if (invalidFormat.length > 0) {
    console.log(`\n⚠️  ${invalidFormat.length} locations with potentially invalid Place ID format:\n`);
    for (const loc of invalidFormat.slice(0, 10)) {
      console.log(`  ${loc.name.substring(0, 50)}`);
      console.log(`    Place ID: ${loc.place_id?.substring(0, 40)}...`);
    }
    if (invalidFormat.length > 10) {
      console.log(`  ... and ${invalidFormat.length - 10} more`);
    }
  }

  const totalToRemove = (noPlaceId?.length || 0);

  console.log(`\n=== Summary ===`);
  console.log(`Locations without Place ID: ${noPlaceId?.length || 0}`);
  console.log(`Locations with invalid format: ${invalidFormat.length}`);
  console.log(`Total to remove: ${totalToRemove}`);

  if (process.argv.includes("--delete") && totalToRemove > 0) {
    console.log(`\n🗑️  Deleting ${totalToRemove} locations...`);

    const idsToDelete = (noPlaceId || []).map(l => l.id);

    let deleted = 0;
    for (const id of idsToDelete) {
      const { error: delError } = await supabase
        .from("locations")
        .delete()
        .eq("id", id);

      if (!delError) deleted++;
    }

    console.log(`✅ Deleted ${deleted} locations`);

    // Get final count
    const { count } = await supabase
      .from("locations")
      .select("*", { count: "exact", head: true });

    console.log(`Remaining locations: ${count}`);
  } else if (totalToRemove > 0) {
    console.log(`\nRun with --delete flag to remove locations without Place IDs:`);
    console.log(`  npx tsx scripts/remove-no-placeid.ts --delete`);
  }
}

cleanup()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
