#!/usr/bin/env tsx
/**
 * Clean test data script
 *
 * Deletes all test locations from the database that were imported from scraped DMO data.
 * This script removes all locations marked with "TEST DATA - DELETE BEFORE LAUNCH" in the note field.
 *
 * Usage:
 *   npm run clean:test-data
 *   or
 *   tsx scripts/clean-test-data.ts
 *
 * Requires:
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable (in .env.local)
 *   - NEXT_PUBLIC_SUPABASE_URL environment variable (in .env.local)
 */

// Load environment variables from .env.local FIRST
import { config } from "dotenv";
const result = config({ path: ".env.local" });

if (result.error) {
  console.error("Failed to load .env.local:", result.error);
  process.exit(1);
}

// Verify the key is loaded
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is still missing after loading .env.local");
  process.exit(1);
}

import { logger } from "@/lib/logger";

// Import serviceRole dynamically
let getServiceRoleClient: typeof import("@/lib/supabase/serviceRole").getServiceRoleClient;

async function cleanTestData() {
  try {
    logger.info("=".repeat(80));
    logger.info("CLEAN TEST DATA");
    logger.info("=".repeat(80));
    logger.info("");

    // Dynamically import getServiceRoleClient after env vars are loaded
    const serviceRoleModule = await import("@/lib/supabase/serviceRole");
    getServiceRoleClient = serviceRoleModule.getServiceRoleClient;

    // Check for required environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error("❌ SUPABASE_SERVICE_ROLE_KEY is missing!");
      process.exit(1);
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.error("❌ NEXT_PUBLIC_SUPABASE_URL is missing!");
      process.exit(1);
    }

    const supabase = getServiceRoleClient();

    // Count test data locations
    const { count, error: countError } = await supabase
      .from("locations")
      .select("*", { count: "exact", head: true })
      .eq("note", "TEST DATA - DELETE BEFORE LAUNCH");

    if (countError) {
      logger.error("Failed to count test data locations");
      throw countError;
    }

    if (!count || count === 0) {
      logger.info("✅ No test data found. Database is clean.");
      return;
    }

    logger.warn(`Found ${count} test data locations to delete.`);
    logger.info("");
    logger.info("⚠️  This will permanently delete all test locations!");
    logger.info("   Press Ctrl+C to cancel, or wait 5 seconds to continue...");
    logger.info("");

    // Wait 5 seconds before proceeding
    await new Promise(resolve => setTimeout(resolve, 5000));

    logger.info("Deleting test data...");

    // Delete all test data
    const { error: deleteError } = await supabase
      .from("locations")
      .delete()
      .eq("note", "TEST DATA - DELETE BEFORE LAUNCH");

    if (deleteError) {
      logger.error("Failed to delete test data");
      throw deleteError;
    }

    logger.info("");
    logger.info("✅ Successfully deleted " + count + " test locations!");
    logger.info("");
    logger.info("=".repeat(80));
    logger.info("Database is now clean and ready for production");
    logger.info("=".repeat(80));
    logger.info("");
  } catch (error) {
    logger.error("Failed to clean test data");
    if (error instanceof Error) {
      logger.error(`Error: ${error.message}`);
      if (error.stack) {
        logger.error(`Stack: ${error.stack}`);
      }
    } else {
      logger.error("Unknown error:", error);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  cleanTestData()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Unhandled error in clean script", { error });
      process.exit(1);
    });
}

export { cleanTestData };
