#!/usr/bin/env tsx
/**
 * Script to apply primary_photo_url migration directly
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

async function applyMigration() {
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

  console.log("Applying migration to add primary_photo_url column...\n");

  // Execute the migration SQL using rpc with a custom function
  // First, let's try direct SQL execution via the REST API
  const migrationSQL = `
    ALTER TABLE locations
      ADD COLUMN IF NOT EXISTS primary_photo_url TEXT;

    COMMENT ON COLUMN locations.primary_photo_url IS
      'Primary photo URL from Google Places API. Used to eliminate N+1 query problem on explore page.';
  `;

  try {
    // Use the Supabase REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query: migrationSQL }),
    });

    // If exec RPC doesn't exist, try alternative approach
    if (response.status === 404) {
      console.log("Direct SQL execution not available via RPC.");
      console.log("Using alternative approach...\n");

      // Try to create a temporary SQL function to execute the migration
      const { error: fnError } = await supabase.rpc('exec_migration', {
        sql: migrationSQL
      });

      if (fnError?.message?.includes('could not find') || fnError?.message?.includes('does not exist')) {
        console.log("⚠️  Cannot execute SQL directly via Supabase client.\n");
        console.log("Please apply this migration manually:\n");
        console.log("1. Go to: https://supabase.com/dashboard/project/mbjcxrfuuczlauavashs");
        console.log("2. Click 'SQL Editor' in the left sidebar");
        console.log("3. Copy and paste:\n");
        console.log("======================================================================");
        console.log(migrationSQL.trim());
        console.log("======================================================================");
        console.log("\n4. Click 'Run' or press Cmd+Enter");
        process.exit(1);
      }

      if (fnError) {
        console.error("❌ Migration failed:", fnError.message);
        process.exit(1);
      }
    } else if (!response.ok) {
      const errorText = await response.text();
      console.log("⚠️  Cannot execute SQL via REST API.\n");
      console.log("Please apply this migration manually:\n");
      console.log("1. Go to: https://supabase.com/dashboard/project/mbjcxrfuuczlauavashs");
      console.log("2. Click 'SQL Editor' in the left sidebar");
      console.log("3. Copy and paste:\n");
      console.log("======================================================================");
      console.log(migrationSQL.trim());
      console.log("======================================================================");
      console.log("\n4. Click 'Run' or press Cmd+Enter");
      process.exit(1);
    }

    console.log("✅ Migration applied successfully!\n");

  } catch (error) {
    console.log("⚠️  Cannot execute SQL programmatically.\n");
    console.log("Please apply this migration manually:\n");
    console.log("1. Go to: https://supabase.com/dashboard/project/mbjcxrfuuczlauavashs");
    console.log("2. Click 'SQL Editor' in the left sidebar");
    console.log("3. Copy and paste:\n");
    console.log("======================================================================");
    console.log(migrationSQL.trim());
    console.log("======================================================================");
    console.log("\n4. Click 'Run' or press Cmd+Enter");
    process.exit(1);
  }

  // Verify the migration worked
  console.log("Verifying column was added...");
  const { data, error } = await supabase
    .from('locations')
    .select('id, primary_photo_url')
    .limit(1);

  if (error) {
    console.error("❌ Verification failed:", error.message);
    process.exit(1);
  }

  console.log("✅ Column verified! Migration complete.");
  console.log("\n" + "=".repeat(70));
  console.log("✅ READY TO ENRICH PHOTOS!");
  console.log("=".repeat(70));
  console.log("\nNext steps:");
  console.log("  1. Test with dry-run (safe, no changes):");
  console.log("     npx tsx scripts/enrich-location-photos.ts --dry-run --test");
  console.log("\n  2. If that looks good, run full enrichment:");
  console.log("     npx tsx scripts/enrich-location-photos.ts");
  console.log("");
}

applyMigration().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
