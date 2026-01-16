#!/usr/bin/env tsx
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function verifyKantoPlaceIds() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Get total Kanto locations
  const { count: totalCount, error: totalError } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .eq("region", "Kanto");

  if (totalError) {
    console.error("Error:", totalError);
    process.exit(1);
  }

  // Get Kanto locations with place_id
  const { count: withPlaceIdCount, error: withError } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .eq("region", "Kanto")
    .not("place_id", "is", null)
    .neq("place_id", "");

  if (withError) {
    console.error("Error:", withError);
    process.exit(1);
  }

  // Get sample locations
  const { data: sampleLocations, error: sampleError } = await supabase
    .from("locations")
    .select("id, name, place_id, coordinates")
    .eq("region", "Kanto")
    .limit(10);

  console.log("=== Kanto Region Verification ===");
  console.log(`Total Kanto locations: ${totalCount}`);
  console.log(`With place_id: ${withPlaceIdCount}`);
  console.log(`Without place_id: ${(totalCount || 0) - (withPlaceIdCount || 0)}`);
  console.log(`\nSample locations:`);
  sampleLocations?.forEach(loc => {
    console.log(`  - ${loc.name}: place_id=${loc.place_id ? 'SET' : 'NULL'}, coords=${loc.coordinates ? 'SET' : 'NULL'}`);
  });
}

verifyKantoPlaceIds().catch(console.error);
