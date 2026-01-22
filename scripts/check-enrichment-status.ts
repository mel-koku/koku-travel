#!/usr/bin/env tsx
/**
 * Check how many locations still need photo enrichment
 */

import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

import { createClient } from "@supabase/supabase-js";

async function checkStatus() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Error: Missing Supabase credentials");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Count total locations
  const { count: totalCount } = await supabase
    .from('locations')
    .select('*', { count: 'exact', head: true });

  // Count locations with primary_photo_url
  const { count: enrichedCount } = await supabase
    .from('locations')
    .select('*', { count: 'exact', head: true })
    .not('primary_photo_url', 'is', null);

  // Count locations without primary_photo_url
  const { count: needsEnrichment } = await supabase
    .from('locations')
    .select('*', { count: 'exact', head: true })
    .is('primary_photo_url', null);

  console.log("\n" + "=".repeat(70));
  console.log("PHOTO ENRICHMENT STATUS");
  console.log("=".repeat(70));
  console.log(`\nTotal locations: ${totalCount}`);
  console.log(`✅ Enriched with photos: ${enrichedCount}`);
  console.log(`⏳ Still need enrichment: ${needsEnrichment}`);
  console.log(`\nCompletion: ${((enrichedCount! / totalCount!) * 100).toFixed(1)}%`);
  console.log("");
}

checkStatus().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
