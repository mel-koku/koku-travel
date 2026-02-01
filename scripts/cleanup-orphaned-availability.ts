#!/usr/bin/env tsx
/**
 * Cleanup orphaned location_availability entries
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

async function main() {
  // Get all location_availability entries
  const { data: availability, error: avError } = await supabase
    .from("location_availability")
    .select("id, location_id, description");

  if (avError) {
    console.error("Error fetching location_availability:", avError);
    return;
  }

  // Get all location ids
  const { data: locations, error: locError } = await supabase
    .from("locations")
    .select("id");

  if (locError) {
    console.error("Error fetching locations:", locError);
    return;
  }

  const locationIds = new Set(locations.map((l) => l.id));
  const orphaned = availability.filter((a) => !locationIds.has(a.location_id));

  console.log("Found", orphaned.length, "orphaned location_availability entries:");
  for (const o of orphaned) {
    console.log("  -", o.location_id, ":", o.description || "(no description)");
  }

  if (orphaned.length === 0) {
    console.log("Nothing to delete");
    return;
  }

  const orphanedIds = orphaned.map((o) => o.id);
  const { error: deleteError } = await supabase
    .from("location_availability")
    .delete()
    .in("id", orphanedIds);

  if (deleteError) {
    console.error("Error deleting:", deleteError);
    return;
  }

  console.log("Successfully deleted", orphanedIds.length, "orphaned entries");
}

main().catch(console.error);
