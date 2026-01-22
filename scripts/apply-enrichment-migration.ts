#!/usr/bin/env tsx
/**
 * Script to check and apply Google Places enrichment migration
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

const MIGRATION_SQL = `-- Add Google Places enrichment columns to locations table
-- These columns store additional data from Google Places API for better filtering and categorization

-- Primary type from Google Places (e.g., "buddhist_temple", "castle", "restaurant")
ALTER TABLE locations ADD COLUMN IF NOT EXISTS google_primary_type text;

-- Array of all types from Google Places
ALTER TABLE locations ADD COLUMN IF NOT EXISTS google_types text[];

-- Business status: OPERATIONAL, TEMPORARILY_CLOSED, PERMANENTLY_CLOSED
ALTER TABLE locations ADD COLUMN IF NOT EXISTS business_status text;

-- Price level from Google Places (1-4)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS price_level smallint;

-- Accessibility options from Google Places
ALTER TABLE locations ADD COLUMN IF NOT EXISTS accessibility_options jsonb;

-- Dietary options from Google Places
ALTER TABLE locations ADD COLUMN IF NOT EXISTS dietary_options jsonb;

-- Service options from Google Places
ALTER TABLE locations ADD COLUMN IF NOT EXISTS service_options jsonb;

-- Meal options from Google Places
ALTER TABLE locations ADD COLUMN IF NOT EXISTS meal_options jsonb;

-- Create indexes for commonly filtered columns
CREATE INDEX IF NOT EXISTS idx_locations_google_primary_type ON locations (google_primary_type);
CREATE INDEX IF NOT EXISTS idx_locations_business_status ON locations (business_status);
CREATE INDEX IF NOT EXISTS idx_locations_price_level ON locations (price_level);

-- Partial index for wheelchair accessible locations
CREATE INDEX IF NOT EXISTS idx_locations_wheelchair_accessible
ON locations ((accessibility_options->>'wheelchairAccessibleEntrance'))
WHERE accessibility_options->>'wheelchairAccessibleEntrance' = 'true';

-- Partial index for vegetarian-friendly locations
CREATE INDEX IF NOT EXISTS idx_locations_vegetarian
ON locations ((dietary_options->>'servesVegetarianFood'))
WHERE dietary_options->>'servesVegetarianFood' = 'true';`;

async function checkAndApplyMigration() {
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

  console.log("Checking if Google Places enrichment columns exist...\n");

  // Try to select the new columns
  const { data, error } = await supabase
    .from("locations")
    .select("id, google_primary_type, business_status, price_level")
    .limit(1);

  if (error && error.message.includes("does not exist")) {
    console.log("❌ Columns do not exist. Migration needed!\n");
    console.log("=".repeat(70));
    console.log("STEP-BY-STEP INSTRUCTIONS:");
    console.log("=".repeat(70));
    console.log("\n1. Go to your Supabase dashboard SQL Editor");
    console.log("2. Click 'New Query'");
    console.log("3. Copy and paste this SQL:\n");
    console.log("=".repeat(70));
    console.log(MIGRATION_SQL);
    console.log("=".repeat(70));
    console.log("\n4. Click 'Run' or press Cmd+Enter");
    console.log("5. You should see: 'Success. No rows returned'");
    console.log("\n6. Run this script again to verify:");
    console.log("   npx tsx scripts/apply-enrichment-migration.ts");
    process.exit(1);
  }

  if (error) {
    console.error("❌ Error checking migration:", error.message);
    process.exit(1);
  }

  console.log("✅ All enrichment columns exist! Migration already applied.");

  // Check current enrichment status
  const { data: stats, error: statsError } = await supabase
    .from("locations")
    .select("id, google_primary_type, business_status, price_level")
    .not("google_primary_type", "is", null)
    .limit(1);

  if (!statsError) {
    const { count: enrichedCount } = await supabase
      .from("locations")
      .select("*", { count: "exact", head: true })
      .not("google_primary_type", "is", null);

    const { count: totalCount } = await supabase
      .from("locations")
      .select("*", { count: "exact", head: true });

    console.log(`\nEnrichment status: ${enrichedCount || 0} / ${totalCount || 0} locations enriched`);

    if ((enrichedCount || 0) < (totalCount || 0)) {
      console.log("\nTo enrich locations, run:");
      console.log("  npx tsx scripts/enrich-google-places-full.ts --dry-run  # Preview");
      console.log("  npx tsx scripts/enrich-google-places-full.ts            # Apply");
    }
  }
}

checkAndApplyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
