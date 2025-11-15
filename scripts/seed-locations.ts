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
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable
 *   - NEXT_PUBLIC_SUPABASE_URL environment variable
 */

import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { MOCK_LOCATIONS } from "@/data/mockLocations";
import { logger } from "@/lib/logger";
import type { Location } from "@/types/location";

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
        logger.error(`Failed to insert batch starting at index ${i}`, { error });
        throw error;
      }
      
      inserted += batch.length;
      logger.info(`Inserted ${inserted}/${MOCK_LOCATIONS.length} locations...`);
    }
    
    logger.info(`✅ Successfully seeded ${inserted} locations!`);
  } catch (error) {
    logger.error("Failed to seed locations", { error });
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

