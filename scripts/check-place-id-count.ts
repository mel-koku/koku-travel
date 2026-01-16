#!/usr/bin/env tsx
/**
 * Script to check how many location records have place_id set vs without place_id.
 * This helps understand the difference between what the explore page shows vs what the trip builder can use.
 * 
 * Usage:
 *   npm run tsx scripts/check-place-id-count.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function checkPlaceIdCount() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured in .env.local");
    console.error("Current values:");
    console.error(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'set' : 'missing'}`);
    console.error(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'set' : 'missing'}`);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log("Checking location records with and without place_id...\n");

  // Get total count
  const { count: totalCount, error: totalError } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true });

  if (totalError) {
    console.error("Error fetching total count:", totalError);
    process.exit(1);
  }

  // Get count with place_id (not null and not empty)
  const { count: withPlaceIdCount, error: withPlaceIdError } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .not("place_id", "is", null)
    .neq("place_id", "");

  if (withPlaceIdError) {
    console.error("Error fetching count with place_id:", withPlaceIdError);
    process.exit(1);
  }

  // Get count without place_id (null or empty)
  // Try different query approaches
  let withoutPlaceIdCount = 0;
  const { count: nullCount, error: nullError } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .is("place_id", null);

  if (nullError) {
    console.warn("Warning: Could not count null place_id records:", nullError.message);
  } else {
    withoutPlaceIdCount += nullCount || 0;
  }

  const { count: emptyCount, error: emptyError } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .eq("place_id", "");

  if (emptyError) {
    console.warn("Warning: Could not count empty place_id records:", emptyError.message);
  } else {
    withoutPlaceIdCount += emptyCount || 0;
  }

  // Calculate the difference
  const calculatedWithout = (totalCount || 0) - (withPlaceIdCount || 0);

  console.log("=== Location Records Summary ===");
  console.log(`Total records: ${totalCount?.toLocaleString() || 0}`);
  console.log(`With place_id: ${withPlaceIdCount?.toLocaleString() || 0} (${totalCount ? ((withPlaceIdCount || 0) / totalCount * 100).toFixed(1) : 0}%)`);
  console.log(`Without place_id: ${calculatedWithout.toLocaleString()} (${totalCount ? (calculatedWithout / totalCount * 100).toFixed(1) : 0}%)`);
  
  console.log("\n=== Impact ===");
  console.log(`Explore page will show: ${withPlaceIdCount?.toLocaleString() || 0} locations`);
  console.log(`Trip builder can use: ${totalCount?.toLocaleString() || 0} locations`);
  console.log(`Difference: ${calculatedWithout.toLocaleString()} locations hidden from explore page`);

  // Show sample locations without place_id
  if (calculatedWithout > 0) {
    const { data: sampleWithoutPlaceId, error: sampleError } = await supabase
      .from("locations")
      .select("id, name, city, region, place_id")
      .or("place_id.is.null,place_id.eq.")
      .limit(5);

    if (!sampleError && sampleWithoutPlaceId && sampleWithoutPlaceId.length > 0) {
      console.log("\n=== Sample locations WITHOUT place_id ===");
      sampleWithoutPlaceId.forEach(loc => {
        console.log(`- ${loc.name} (${loc.city}, ${loc.region}) - place_id: ${loc.place_id || 'NULL'}`);
      });
    }
  }
}

checkPlaceIdCount().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
