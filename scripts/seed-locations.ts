#!/usr/bin/env tsx
/**
 * Seed script to populate the locations table in Supabase with mock data.
 * 
 * Usage:
 *   npm run seed:locations
 *   or
 *   tsx scripts/seed-locations.ts
 * 
 * Requires:
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable (in .env.local)
 *   - NEXT_PUBLIC_SUPABASE_URL environment variable (in .env.local)
 */

// Load environment variables from .env.local FIRST, before any other imports
import { config } from "dotenv";
const result = config({ path: ".env.local" });

if (result.error) {
  console.error("Failed to load .env.local:", result.error);
  process.exit(1);
}

// Verify the key is loaded
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is still missing after loading .env.local");
  console.log("Available SUPABASE vars:", Object.keys(process.env).filter(k => k.includes("SUPABASE")));
  process.exit(1);
}

// Now import modules that depend on environment variables (after dotenv has loaded)
import { MOCK_LOCATIONS } from "@/data/mockLocations";
import { logger } from "@/lib/logger";
import type { Location } from "@/types/location";

// Import serviceRole dynamically to ensure env vars are loaded first
let getServiceRoleClient: typeof import("@/lib/supabase/serviceRole").getServiceRoleClient;

function transformLocationForDb(location: Location) {
  return {
    id: location.id,
    name: location.name,
    region: location.region,
    city: location.city,
    category: location.category,
    image: location.image,
    min_budget: location.minBudget ?? null,
    estimated_duration: location.estimatedDuration ?? null,
    operating_hours: location.operatingHours ?? null,
    recommended_visit: location.recommendedVisit ?? null,
    preferred_transit_modes: location.preferredTransitModes ?? null,
    coordinates: location.coordinates ?? null,
    timezone: location.timezone ?? null,
    short_description: location.shortDescription ?? null,
    rating: location.rating ?? null,
    review_count: location.reviewCount ?? null,
    place_id: location.placeId ?? null,
  };
}

async function seedLocations() {
  try {
    logger.info("Starting locations seed...");
    
    // Dynamically import getServiceRoleClient after env vars are loaded
    const serviceRoleModule = await import("@/lib/supabase/serviceRole");
    getServiceRoleClient = serviceRoleModule.getServiceRoleClient;
    
    // Check for required environment variables before proceeding
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error("❌ SUPABASE_SERVICE_ROLE_KEY is missing!");
      logger.info("");
      logger.info("To fix this:");
      logger.info("1. Get your service role key from: Supabase Dashboard → Project Settings → API → service_role secret key");
      logger.info("2. Add it to your .env.local file:");
      logger.info("   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here");
      logger.info("3. Run this script again");
      process.exit(1);
    }
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.error("❌ NEXT_PUBLIC_SUPABASE_URL is missing!");
      logger.info("Add it to your .env.local file");
      process.exit(1);
    }
    
    const supabase = getServiceRoleClient();
    
    // Check if locations already exist
    const { count } = await supabase
      .from("locations")
      .select("*", { count: "exact", head: true });
    
    if (count && count > 0) {
      logger.warn(`Found ${count} existing locations. Skipping seed.`);
      logger.info("To re-seed, delete existing locations first or use --force flag.");
      return;
    }
    
    logger.info(`Inserting ${MOCK_LOCATIONS.length} locations...`);
    
    // Transform locations for database
    const locationsToInsert = MOCK_LOCATIONS.map(transformLocationForDb);
    
    // Insert in batches of 100 to avoid overwhelming the database
    const BATCH_SIZE = 100;
    let inserted = 0;
    
    for (let i = 0; i < locationsToInsert.length; i += BATCH_SIZE) {
      const batch = locationsToInsert.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from("locations")
        .insert(batch);
      
      if (error) {
        logger.error(`Failed to insert batch starting at index ${i}`);
        logger.error("Error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }
      
      inserted += batch.length;
      logger.info(`Inserted ${inserted}/${MOCK_LOCATIONS.length} locations...`);
    }
    
    logger.info(`✅ Successfully seeded ${inserted} locations!`);
  } catch (error) {
    logger.error("Failed to seed locations");
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
  seedLocations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Unhandled error in seed script", { error });
      process.exit(1);
    });
}

export { seedLocations };

