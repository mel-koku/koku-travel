#!/usr/bin/env tsx
/**
 * Removes orphaned entries from place_details cache
 * (entries for locations that no longer exist)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

async function cleanup() {
  const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
  const supabase = getServiceRoleClient();

  console.log("=== Cleaning Up Orphaned Cache Entries ===\n");

  // Get all location IDs
  const { data: locations } = await supabase
    .from("locations")
    .select("id");

  const validIds = new Set(locations?.map(l => l.id) || []);
  console.log(`Valid location IDs: ${validIds.size}`);

  // Get all place_details entries
  const { data: cacheEntries } = await supabase
    .from("place_details")
    .select("location_id");

  const cacheIds = cacheEntries?.map(e => e.location_id) || [];
  console.log(`Cache entries: ${cacheIds.length}`);

  // Find orphaned entries
  const orphaned = cacheIds.filter(id => !validIds.has(id));
  console.log(`Orphaned cache entries: ${orphaned.length}`);

  if (orphaned.length > 0) {
    console.log("\nDeleting orphaned entries...");

    for (const id of orphaned) {
      await supabase
        .from("place_details")
        .delete()
        .eq("location_id", id);
    }

    console.log(`✅ Deleted ${orphaned.length} orphaned cache entries`);
  } else {
    console.log("\n✅ No orphaned entries found");
  }
}

cleanup()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
