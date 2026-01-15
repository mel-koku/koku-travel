#!/usr/bin/env tsx
/**
 * Enrichment script for scraped location data
 *
 * This script:
 * 1. Reads scraped locations from tmp/all-scraped-locations.json
 * 2. Uses Google Places API to get coordinates and place IDs
 * 3. Saves enriched data to tmp/enriched-locations.json
 *
 * Rate limiting: 200ms between API calls (300 calls/minute)
 * Expected duration: ~5-10 minutes for 1,500 locations
 *
 * Usage:
 *   npm run enrich:scraped
 *   or
 *   npx tsx scripts/enrich-scraped-data.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { autocompletePlaces } from "@/lib/googlePlaces";

interface ScrapedLocation {
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
}

interface EnrichedLocation extends ScrapedLocation {
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

interface EnrichmentStats {
  totalLocations: number;
  enriched: number;
  partial: number;
  failed: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  errors: Array<{
    location: string;
    error: string;
  }>;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enrichLocation(location: ScrapedLocation): Promise<EnrichedLocation> {
  try {
    // Build search query: "name, city, prefecture, region, Japan"
    const queryParts = [
      location.name,
      location.city,
      location.prefecture,
      location.region,
      "Japan",
    ].filter(Boolean);

    const query = queryParts.join(", ");

    // Call Google Places API
    const results = await autocompletePlaces({
      input: query,
      languageCode: "en",
      regionCode: "JP",
    });

    if (results.length === 0) {
      return {
        ...location,
        enrichmentStatus: "failed",
        enrichmentError: "No results from Google Places API",
      };
    }

    // Use the first result (most relevant)
    const topResult = results[0];

    if (!topResult) {
      return {
        ...location,
        enrichmentStatus: "failed",
        enrichmentError: "No valid result from Google Places API",
      };
    }

    // Check if we got coordinates
    if (topResult.location) {
      return {
        ...location,
        placeId: topResult.placeId,
        coordinates: {
          lat: topResult.location.latitude,
          lng: topResult.location.longitude,
        },
        googleDisplayName: topResult.displayName,
        googleAddress: topResult.formattedAddress,
        enrichmentStatus: "success",
      };
    } else {
      // We got a place ID but no coordinates - partial success
      return {
        ...location,
        placeId: topResult.placeId,
        googleDisplayName: topResult.displayName,
        googleAddress: topResult.formattedAddress,
        enrichmentStatus: "partial",
        enrichmentError: "Place ID found but no coordinates",
      };
    }
  } catch (error) {
    return {
      ...location,
      enrichmentStatus: "failed",
      enrichmentError: error instanceof Error ? error.message : String(error),
    };
  }
}

async function enrichScrapedData(): Promise<void> {
  const startTime = Date.now();
  console.log("=".repeat(80));
  console.log("KOKU TRAVEL - LOCATION ENRICHMENT WITH GOOGLE PLACES API");
  console.log("=".repeat(80));
  console.log("");

  // Read scraped data
  const inputPath = join(process.cwd(), "tmp", "all-scraped-locations.json");
  console.log(`Reading scraped data from: ${inputPath}`);

  let scrapedData: { locations: ScrapedLocation[] };
  try {
    const fileContent = readFileSync(inputPath, "utf-8");
    scrapedData = JSON.parse(fileContent);
  } catch (error) {
    console.error("❌ Failed to read scraped data file");
    console.error("Make sure you've run the scrapers first:");
    console.error("  npm run scrape:all");
    throw error;
  }

  const locations = scrapedData.locations;
  console.log(`Found ${locations.length} locations to enrich`);
  console.log("");

  // Initialize stats
  const stats: EnrichmentStats = {
    totalLocations: locations.length,
    enriched: 0,
    partial: 0,
    failed: 0,
    startTime: new Date().toISOString(),
    errors: [],
  };

  // Enrich each location
  const enrichedLocations: EnrichedLocation[] = [];
  const RATE_LIMIT_MS = 200; // 200ms between requests (300/minute)
  const BATCH_SIZE = 50; // Save progress every 50 locations

  console.log("Starting enrichment...");
  console.log(`Rate limit: ${RATE_LIMIT_MS}ms between requests`);
  console.log(`Estimated time: ${Math.ceil((locations.length * RATE_LIMIT_MS) / 1000 / 60)} minutes`);
  console.log("");

  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];

    if (!location) {
      continue;
    }

    const progress = ((i + 1) / locations.length * 100).toFixed(1);

    // Log progress every 10 locations
    if ((i + 1) % 10 === 0 || i === 0) {
      console.log(`[${progress}%] Processing ${i + 1}/${locations.length}: ${location.name}`);
    }

    // Enrich location
    const enriched = await enrichLocation(location);
    enrichedLocations.push(enriched);

    // Update stats
    if (enriched.enrichmentStatus === "success") {
      stats.enriched++;
    } else if (enriched.enrichmentStatus === "partial") {
      stats.partial++;
    } else {
      stats.failed++;
      stats.errors.push({
        location: location.name,
        error: enriched.enrichmentError || "Unknown error",
      });
    }

    // Save progress every BATCH_SIZE locations
    if ((i + 1) % BATCH_SIZE === 0) {
      const tempPath = join(process.cwd(), "tmp", "enriched-locations-temp.json");
      writeFileSync(
        tempPath,
        JSON.stringify(
          {
            metadata: {
              ...stats,
              lastProcessed: i + 1,
              lastSaved: new Date().toISOString(),
            },
            locations: enrichedLocations,
          },
          null,
          2
        ),
        "utf-8"
      );
      console.log(`  💾 Progress saved (${i + 1} locations)`);
    }

    // Rate limiting
    if (i < locations.length - 1) {
      await delay(RATE_LIMIT_MS);
    }
  }

  // Finalize stats
  stats.endTime = new Date().toISOString();
  stats.duration = Date.now() - startTime;

  // Save final enriched data
  const outputPath = join(process.cwd(), "tmp", "enriched-locations.json");
  const outputData = {
    metadata: {
      originalSource: inputPath,
      enrichedAt: new Date().toISOString(),
      totalLocations: stats.totalLocations,
      successCount: stats.enriched,
      partialCount: stats.partial,
      failedCount: stats.failed,
      successRate: ((stats.enriched / stats.totalLocations) * 100).toFixed(2) + "%",
      duration: stats.duration,
      durationMinutes: (stats.duration / 1000 / 60).toFixed(2),
    },
    stats,
    locations: enrichedLocations,
  };

  writeFileSync(outputPath, JSON.stringify(outputData, null, 2), "utf-8");

  // Print summary
  console.log("");
  console.log("=".repeat(80));
  console.log("ENRICHMENT COMPLETE!");
  console.log("=".repeat(80));
  console.log("");
  console.log(`Total Locations:     ${stats.totalLocations}`);
  console.log(`✅ Success:          ${stats.enriched} (${((stats.enriched / stats.totalLocations) * 100).toFixed(1)}%)`);
  console.log(`⚠️  Partial:          ${stats.partial} (${((stats.partial / stats.totalLocations) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed:           ${stats.failed} (${((stats.failed / stats.totalLocations) * 100).toFixed(1)}%)`);
  console.log("");
  console.log(`Duration:            ${(stats.duration! / 1000 / 60).toFixed(2)} minutes`);
  console.log(`Output file:         ${outputPath}`);
  console.log("");

  if (stats.errors.length > 0 && stats.errors.length <= 10) {
    console.log("Errors:");
    stats.errors.forEach((err) => {
      console.log(`  • ${err.location}: ${err.error}`);
    });
    console.log("");
  } else if (stats.errors.length > 10) {
    console.log(`${stats.errors.length} errors occurred. Check the output file for details.`);
    console.log("");
  }

  console.log("=".repeat(80));
  console.log("Next step: Seed the database");
  console.log("  npm run seed:scraped");
  console.log("=".repeat(80));
  console.log("");

  // Clean up temp file
  const tempPath = join(process.cwd(), "tmp", "enriched-locations-temp.json");
  try {
    const fs = await import("fs/promises");
    await fs.unlink(tempPath);
  } catch {
    // Ignore if temp file doesn't exist
  }
}

// Run if executed directly
if (require.main === module) {
  enrichScrapedData()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Fatal error in enrichment script:", error);
      process.exit(1);
    });
}

export { enrichScrapedData };
