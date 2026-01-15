#!/usr/bin/env tsx
/**
 * Seed script to populate the locations table in Supabase with mock or scraped data.
 *
 * Usage:
 *   npm run seed:locations                    # Seeds mock data
 *   npm run seed:scraped                      # Seeds scraped data
 *   tsx scripts/seed-locations.ts             # Seeds mock data
 *   tsx scripts/seed-locations.ts --scraped   # Seeds scraped data
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
import { readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

// Import serviceRole dynamically to ensure env vars are loaded first
let getServiceRoleClient: typeof import("@/lib/supabase/serviceRole").getServiceRoleClient;

// Check if --scraped flag is provided
const useScrapedData = process.argv.includes("--scraped");

interface EnrichedLocation {
  name: string;
  category: string;
  region: string;
  prefecture?: string;
  city?: string;
  source: string;
  sourceUrl: string;
  description?: string;
  scrapedAt: string;
  note: string;
  placeId?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  enrichmentStatus: "success" | "partial" | "failed";
  enrichmentError?: string;
  googleDisplayName?: string;
  googleAddress?: string;
}

function generateLocationId(name: string, region: string): string {
  // Generate a unique ID based on name and region
  const normalized = `${name}-${region}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const hash = createHash("md5").update(`${name}-${region}`).digest("hex").substring(0, 8);
  return `${normalized}-${hash}`;
}

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

function transformScrapedLocationForDb(location: EnrichedLocation) {
  const id = generateLocationId(location.name, location.region);

  return {
    id,
    name: location.name,
    region: location.region,
    city: location.city || location.prefecture || location.region,
    category: location.category,
    image: "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800", // Placeholder
    prefecture: location.prefecture || null,
    description: location.description || location.googleAddress || null,
    seed_source: location.source,
    seed_source_url: location.sourceUrl,
    scraped_at: location.scrapedAt,
    enrichment_confidence: location.enrichmentStatus === "success" ? 0.95 :
                          location.enrichmentStatus === "partial" ? 0.60 : 0.10,
    note: location.note,
    min_budget: null,
    estimated_duration: null,
    operating_hours: null,
    recommended_visit: null,
    preferred_transit_modes: null,
    coordinates: location.coordinates ? {
      lat: location.coordinates.lat,
      lng: location.coordinates.lng,
    } : null,
    timezone: "Asia/Tokyo",
    short_description: location.description ?
      location.description.substring(0, 200) : null,
    rating: null,
    review_count: null,
    place_id: location.placeId || null,
  };
}

async function seedLocations() {
  try {
    logger.info("Starting locations seed...");
    if (useScrapedData) {
      logger.info("📋 Using scraped data from enriched-locations.json");
    } else {
      logger.info("📋 Using mock data from mockLocations.ts");
    }
    logger.info("");

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

    // Load data based on flag
    let locationsToInsert: any[];
    let sourceCount: number;

    if (useScrapedData) {
      // Load scraped and enriched data
      const enrichedPath = join(process.cwd(), "tmp", "enriched-locations.json");
      logger.info(`Reading enriched data from: ${enrichedPath}`);

      try {
        const fileContent = readFileSync(enrichedPath, "utf-8");
        const enrichedData = JSON.parse(fileContent);
        const scrapedLocations: EnrichedLocation[] = enrichedData.locations;

        logger.info(`Found ${scrapedLocations.length} scraped locations`);
        logger.info(`Enrichment success rate: ${enrichedData.metadata.successRate}`);
        logger.info("");

        // Transform scraped locations for database
        const transformedLocations = scrapedLocations.map(transformScrapedLocationForDb);

        // Deduplicate by ID (keep first occurrence)
        const seenIds = new Set<string>();
        locationsToInsert = transformedLocations.filter(loc => {
          if (seenIds.has(loc.id)) {
            return false;
          }
          seenIds.add(loc.id);
          return true;
        });

        const duplicatesRemoved = transformedLocations.length - locationsToInsert.length;
        if (duplicatesRemoved > 0) {
          logger.info(`Removed ${duplicatesRemoved} duplicate locations`);
        }

        sourceCount = locationsToInsert.length;
      } catch (error) {
        logger.error("❌ Failed to read enriched data file");
        logger.error("Make sure you've run the enrichment script first:");
        logger.error("  npm run enrich:scraped");
        throw error;
      }
    } else {
      // Use mock locations
      locationsToInsert = MOCK_LOCATIONS.map(transformLocationForDb);
      sourceCount = MOCK_LOCATIONS.length;
    }

    // Check if locations already exist
    const { count } = await supabase
      .from("locations")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      logger.warn(`Found ${count} existing locations. Skipping seed.`);
      logger.info("To re-seed, delete existing locations first or use --force flag.");
      return;
    }

    logger.info(`Inserting ${sourceCount} locations...`);
    logger.info("");

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
        logger.error(`Error message: ${error.message}`);
        logger.error(`Error code: ${error.code}`);
        logger.error(`Error details: ${JSON.stringify(error.details, null, 2)}`);
        logger.error(`Error hint: ${error.hint}`);
        throw error;
      }

      inserted += batch.length;
      logger.info(`Inserted ${inserted}/${sourceCount} locations...`);
    }

    logger.info("");
    logger.info(`✅ Successfully seeded ${inserted} locations!`);

    if (useScrapedData) {
      logger.info("");
      logger.info("⚠️  REMINDER: This is TEST DATA ONLY");
      logger.info("   Delete all test data before production launch");
      logger.info("   Run: npm run clean:test-data");
    }
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

