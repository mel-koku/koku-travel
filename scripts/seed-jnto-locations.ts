#!/usr/bin/env tsx
/**
 * Seed JNTO scraped locations into Supabase with duplicate checking
 *
 * Usage:
 *   npm run seed:jnto
 *   or
 *   tsx scripts/seed-jnto-locations.ts
 *
 * Requires:
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable (in .env.local)
 *   - NEXT_PUBLIC_SUPABASE_URL environment variable (in .env.local)
 *   - tmp/jnto-scraped.json file (from running npm run scrape:jnto)
 */

// Load environment variables from .env.local FIRST
import { config } from "dotenv";
const result = config({ path: ".env.local" });

if (result.error) {
  console.error("Failed to load .env.local:", result.error);
  process.exit(1);
}

import { readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { logger } from "@/lib/logger";
import type { ScrapedLocation } from "./scrapers/base-scraper";

// Import serviceRole dynamically to ensure env vars are loaded first
let getServiceRoleClient: typeof import("@/lib/supabase/serviceRole").getServiceRoleClient;

interface ExistingLocationCache {
  placeIds: Set<string>;
  sourceUrls: Set<string>;
  nameRegionPairs: Map<string, Set<string>>;
}

function generateLocationId(name: string, region: string): string {
  const normalized = `${name}-${region}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const hash = createHash("md5").update(`${name}-${region}`).digest("hex").substring(0, 8);
  return `${normalized}-${hash}`;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[^\w\s-]/g, "");
}

async function loadExistingLocations(): Promise<ExistingLocationCache> {
  const cache: ExistingLocationCache = {
    placeIds: new Set(),
    sourceUrls: new Set(),
    nameRegionPairs: new Map(),
  };

  try {
    const serviceRoleModule = await import("@/lib/supabase/serviceRole");
    getServiceRoleClient = serviceRoleModule.getServiceRoleClient;

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.warn("SUPABASE_SERVICE_ROLE_KEY not found. Duplicate checking will be limited.");
      return cache;
    }

    const supabase = getServiceRoleClient();
    const { data: locations, error } = await supabase
      .from("locations")
      .select("place_id, seed_source_url, name, region");

    if (error) {
      logger.error("Failed to load existing locations", error);
      return cache;
    }

    if (!locations || locations.length === 0) {
      logger.info("No existing locations found in database.");
      return cache;
    }

    for (const loc of locations) {
      if (loc.place_id) {
        cache.placeIds.add(loc.place_id);
      }
      if (loc.seed_source_url) {
        cache.sourceUrls.add(loc.seed_source_url);
      }
      if (loc.name && loc.region) {
        const normalizedName = normalizeName(loc.name);
        if (!cache.nameRegionPairs.has(normalizedName)) {
          cache.nameRegionPairs.set(normalizedName, new Set());
        }
        cache.nameRegionPairs.get(normalizedName)!.add(loc.region);
      }
    }

    logger.info(
      `Loaded ${locations.length} existing locations (${cache.placeIds.size} place_ids, ${cache.sourceUrls.size} URLs)`,
    );
  } catch (error) {
    logger.error("Error loading existing locations", error);
  }

  return cache;
}

function isDuplicate(
  location: ScrapedLocation,
  cache: ExistingLocationCache,
  placeId?: string,
): { isDuplicate: boolean; reason?: string } {
  // 1. Check place_id (most reliable)
  if (placeId && cache.placeIds.has(placeId)) {
    return { isDuplicate: true, reason: "place_id exists" };
  }

  // 2. Check seed_source_url (exact URL match)
  if (location.sourceUrl && cache.sourceUrls.has(location.sourceUrl)) {
    return { isDuplicate: true, reason: "source_url exists" };
  }

  // 3. Check normalized name + region combination
  const normalizedName = normalizeName(location.name);
  const existingRegions = cache.nameRegionPairs.get(normalizedName);
  if (existingRegions && existingRegions.has(location.region)) {
    return { isDuplicate: true, reason: "name+region exists" };
  }

  return { isDuplicate: false };
}

function transformScrapedLocationForDb(location: ScrapedLocation) {
  const id = generateLocationId(location.name, location.region);

  return {
    id,
    name: location.name,
    region: location.region,
    city: location.city || location.prefecture || location.region,
    category: location.category,
    image: "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800", // Placeholder
    prefecture: location.prefecture || null,
    description: location.description || null,
    seed_source: location.source,
    seed_source_url: location.sourceUrl,
    scraped_at: location.scrapedAt,
    enrichment_confidence: null,
    note: location.note,
    min_budget: null,
    estimated_duration: null,
    operating_hours: null,
    recommended_visit: null,
    preferred_transit_modes: null,
    coordinates: null,
    timezone: "Asia/Tokyo",
    short_description: location.description
      ? location.description.substring(0, 200)
      : null,
    rating: null,
    review_count: null,
    place_id: null,
  };
}

async function seedJNTOLocations() {
  try {
    logger.info("Starting JNTO locations seed...");
    logger.info("");

    // Load existing locations for duplicate checking
    const existingCache = await loadExistingLocations();

    // Load scraped data
    const scrapedPath = join(process.cwd(), "tmp", "jnto-scraped.json");
    logger.info(`Reading scraped data from: ${scrapedPath}`);

    let scrapedData: { locations: ScrapedLocation[] };
    try {
      const fileContent = readFileSync(scrapedPath, "utf-8");
      scrapedData = JSON.parse(fileContent);
    } catch (error) {
      logger.error("❌ Failed to read JNTO scraped data file");
      logger.error("Make sure you've run the scraper first:");
      logger.error("  npm run scrape:jnto");
      throw error;
    }

    const scrapedLocations = scrapedData.locations || [];
    logger.info(`Found ${scrapedLocations.length} scraped locations`);
    logger.info("");

    if (scrapedLocations.length === 0) {
      logger.warn("No locations found in scraped data. Nothing to insert.");
      return;
    }

    // Check for duplicates and filter
    const locationsToInsert: any[] = [];
    let duplicatesFound = 0;

    for (const location of scrapedLocations) {
      const duplicateCheck = isDuplicate(location, existingCache);
      if (duplicateCheck.isDuplicate) {
        duplicatesFound++;
        logger.debug(
          `Skipping duplicate: ${location.name} (${duplicateCheck.reason})`,
        );
        continue;
      }

      const transformed = transformScrapedLocationForDb(location);
      locationsToInsert.push(transformed);
    }

    logger.info(`Filtered ${duplicatesFound} duplicates`);
    logger.info(`Preparing to insert ${locationsToInsert.length} new locations`);
    logger.info("");

    if (locationsToInsert.length === 0) {
      logger.info("No new locations to insert. All locations are duplicates.");
      return;
    }

    // Check for required environment variables
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

    // Insert in batches of 100, handling duplicates gracefully
    const BATCH_SIZE = 100;
    let inserted = 0;
    let failed = 0;
    let skippedDuplicates = 0;

    // Check for duplicate IDs within the batch itself
    const seenIds = new Set<string>();
    const uniqueLocations = locationsToInsert.filter(loc => {
      if (seenIds.has(loc.id)) {
        skippedDuplicates++;
        return false;
      }
      seenIds.add(loc.id);
      return true;
    });

    if (skippedDuplicates > 0) {
      logger.info(`Removed ${skippedDuplicates} duplicate IDs within the data`);
    }

    for (let i = 0; i < uniqueLocations.length; i += BATCH_SIZE) {
      const batch = uniqueLocations.slice(i, i + BATCH_SIZE);

      // Try batch insert first
      const { error } = await supabase.from("locations").insert(batch);

      if (error) {
        // If batch fails due to duplicates, try inserting one by one
        if (error.code === "23505") {
          logger.warn(`Batch ${i} had conflicts, inserting individually...`);
          for (const location of batch) {
            const { error: singleError } = await supabase
              .from("locations")
              .insert(location);

            if (singleError) {
              if (singleError.code === "23505") {
                skippedDuplicates++;
              } else {
                failed++;
                logger.error(`Failed to insert ${location.name}: ${singleError.message}`);
              }
            } else {
              inserted++;
              // Log progress every 50 inserts
              if (inserted % 50 === 0) {
                logger.info(`Inserted ${inserted}/${uniqueLocations.length} locations...`);
              }
            }
          }
        } else {
          logger.error(`Failed to insert batch starting at index ${i}`);
          logger.error(`Error message: ${error.message}`);
          logger.error(`Error code: ${error.code}`);
          failed += batch.length;
        }
      } else {
        inserted += batch.length;
        logger.info(`Inserted ${inserted}/${uniqueLocations.length} locations...`);
      }
    }

    console.log("");
    console.log(`✅ Successfully inserted ${inserted} locations!`);
    if (failed > 0) {
      console.log(`⚠️  Failed to insert ${failed} locations`);
    }
    if (duplicatesFound > 0) {
      console.log(`ℹ️  Skipped ${duplicatesFound} duplicate locations (from initial check)`);
    }
    if (skippedDuplicates > 0) {
      console.log(`ℹ️  Skipped ${skippedDuplicates} duplicate locations (during insert)`);
    }
    console.log("");
    console.log(`📊 Summary: ${inserted} inserted, ${failed} failed, ${duplicatesFound + skippedDuplicates} duplicates skipped`);
    console.log("");
    console.log("⚠️  REMINDER: This is TEST DATA ONLY");
    console.log("   Delete all test data before production launch");
    console.log("   Run: npm run clean:test-data");
  } catch (error) {
    logger.error("Failed to seed JNTO locations");
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
  seedJNTOLocations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Unhandled error in seed script", { error });
      process.exit(1);
    });
}

export { seedJNTOLocations };
