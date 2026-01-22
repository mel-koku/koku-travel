#!/usr/bin/env tsx
/**
 * Script to check if migration is needed and provide instructions
 */

// CRITICAL: Load .env.local BEFORE any other imports
import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const result = config({ path: envPath });

if (result.error) {
  console.error("Failed to load .env.local:", result.error);
  process.exit(1);
}

// Verify environment variables are loaded
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: SUPABASE_SERVICE_ROLE_KEY not found in .env.local");
  process.exit(1);
}

// Now safe to import other modules
import { createClient } from "@supabase/supabase-js";

async function checkMigration() {
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

  console.log("Checking if primary_photo_url column exists...\n");

  // Try to select the column
  const { data, error } = await supabase
    .from('locations')
    .select('id, primary_photo_url')
    .limit(1);

  if (error && (error.message.includes('primary_photo_url') && error.message.includes('does not exist'))) {
    console.log("❌ Column does not exist. Migration needed!\n");
    console.log("=" .repeat(70));
    console.log("STEP-BY-STEP INSTRUCTIONS:");
    console.log("=" .repeat(70));
    console.log("\n1. Go to: https://supabase.com/dashboard/project/mbjcxrfuuczlauavashs");
    console.log("2. Click 'SQL Editor' in the left sidebar");
    console.log("3. Click 'New Query'");
    console.log("4. Copy and paste this SQL:\n");
    console.log("=" .repeat(70));
    console.log(`ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS primary_photo_url TEXT;

COMMENT ON COLUMN locations.primary_photo_url IS
  'Primary photo URL from Google Places API. Used to eliminate N+1 query problem on explore page.';`);
    console.log("=" .repeat(70));
    console.log("\n5. Click 'Run' or press Cmd+Enter");
    console.log("6. You should see: 'Success. No rows returned'");
    console.log("\n7. Run this script again to verify:");
    console.log("   npx tsx scripts/apply-photo-migration.ts");
    process.exit(1);
  }

  if (error) {
    console.error("❌ Error checking migration:", error.message);
    process.exit(1);
  }

  console.log("✅ Column exists! Migration already applied.");
  console.log(`\nChecked locations table: ${data ? '1 row found' : 'table accessible'}`);
  console.log("\n" + "=".repeat(70));
  console.log("✅ READY TO ENRICH PHOTOS!");
  console.log("=".repeat(70));
  console.log("\nNext steps:");
  console.log("  1. Test with dry-run (safe, no changes):");
  console.log("     npx tsx scripts/enrich-location-photos.ts --dry-run --test");
  console.log("\n  2. If that looks good, run full enrichment:");
  console.log("     npx tsx scripts/enrich-location-photos.ts");
  console.log("\n  3. Or process in batches:");
  console.log("     npx tsx scripts/enrich-location-photos.ts --limit 100");
  console.log("");
}

checkMigration().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
