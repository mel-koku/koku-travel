#!/usr/bin/env tsx
/**
 * Script to enrich all locations without place_id
 *
 * This script:
 * 1. Fetches all locations without place_id from the database
 * 2. Uses Google Places API to search for each location
 * 3. Updates the database with place_id and coordinates
 *
 * Usage:
 *   npx tsx scripts/enrich-all-locations.ts
 *   npx tsx scripts/enrich-all-locations.ts --dry-run  # Test without updating DB
 *   npx tsx scripts/enrich-all-locations.ts --test     # Process only first 10
 */

// Load environment variables FIRST before any other imports
import { config } from "dotenv";
const result = config({ path: ".env.local" });

if (result.error) {
  console.error("Failed to load .env.local:", result.error);
  process.exit(1);
}

// Verify API key is loaded before importing modules that use it
if (!process.env.GOOGLE_PLACES_API_KEY) {
  console.error("Error: GOOGLE_PLACES_API_KEY must be configured in .env.local");
  console.error("Get your API key from: https://console.cloud.google.com/apis/credentials");
  process.exit(1);
}

// Call Google Places API directly
const PLACES_API_BASE_URL = "https://places.googleapis.com/v1";

async function searchPlace(query: string): Promise<{ placeId: string; location?: { latitude: number; longitude: number } } | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Google Places API key");
  }

  try {
    const response = await fetch(`${PLACES_API_BASE_URL}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "en",
        regionCode: "JP",
        pageSize: 1,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json() as {
      places?: Array<{
        id?: string;
        location?: {
          latitude?: number;
          longitude?: number;
        };
      }>;
    };

    const place = data.places?.[0];
    if (place?.id) {
      return {
        placeId: place.id,
        location: place.location?.latitude !== undefined && place.location?.longitude !== undefined
          ? { latitude: place.location.latitude, longitude: place.location.longitude }
          : undefined,
      };
    }

    return null;
  } catch (error) {
    throw error;
  }
}

const RATE_LIMIT_MS = 200; // 200ms between requests (300/minute)

interface LocationRow {
  id: string;
  name: string;
  city: string;
  region: string;
  category: string;
  place_id: string | null;
  coordinates: { lat: number; lng: number } | null;
}

interface EnrichmentResult {
  id: string;
  name: string;
  success: boolean;
  placeId?: string;
  coordinates?: { lat: number; lng: number };
  error?: string;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enrichLocation(location: LocationRow): Promise<EnrichmentResult> {
  try {
    // Build search query: "name, city, region, Japan"
    const queryParts = [
      location.name,
      location.city,
      location.region,
      "Japan",
    ].filter(Boolean);

    const query = queryParts.join(", ");

    // Call Google Places API
    const result = await searchPlace(query);

    if (!result || !result.placeId) {
      return {
        id: location.id,
        name: location.name,
        success: false,
        error: "No results from Google Places API",
      };
    }

    // Check if we got coordinates
    if (result.location) {
      return {
        id: location.id,
        name: location.name,
        success: true,
        placeId: result.placeId,
        coordinates: {
          lat: result.location.latitude,
          lng: result.location.longitude,
        },
      };
    } else {
      // We got a place ID but no coordinates - still success
      return {
        id: location.id,
        name: location.name,
        success: true,
        placeId: result.placeId,
        error: "Place ID found but no coordinates",
      };
    }
  } catch (error) {
    return {
      id: location.id,
      name: location.name,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function enrichAllLocations() {
  const isDryRun = process.argv.includes("--dry-run");
  const isTest = process.argv.includes("--test");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL must be configured");
    process.exit(1);
  }

  // Use service role client for updates (has write permissions)
  const serviceRoleModule = await import("@/lib/supabase/serviceRole");
  const supabase = serviceRoleModule.getServiceRoleClient();

  console.log("=".repeat(80));
  console.log("LOCATION ENRICHMENT - ALL REGIONS");
  console.log("=".repeat(80));
  console.log("");

  if (isDryRun) {
    console.log("⚠️  DRY RUN MODE - No database updates will be made\n");
  }

  // Fetch all locations without place_id
  console.log("Fetching locations without place_id...");

  let allLocations: LocationRow[] = [];
  let page = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, city, region, category, place_id, coordinates")
      .is("place_id", null)
      .range(page * limit, (page + 1) * limit - 1);

    if (error) {
      console.error("Error fetching locations:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allLocations = [...allLocations, ...data];
    hasMore = data.length === limit;
    page++;
  }

  console.log(`Found ${allLocations.length} locations without place_id\n`);

  if (allLocations.length === 0) {
    console.log("✅ All locations already have place_id!");
    return;
  }

  // Show breakdown by region
  const regionCounts: Record<string, number> = {};
  allLocations.forEach(loc => {
    regionCounts[loc.region] = (regionCounts[loc.region] || 0) + 1;
  });
  console.log("Locations by region:");
  Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([region, count]) => {
      console.log(`  ${region}: ${count}`);
    });
  console.log("");

  // Limit to first 10 for testing if --test flag is provided
  if (isTest) {
    console.log("⚠️  TEST MODE - Processing only first 10 locations\n");
    allLocations = allLocations.slice(0, 10);
  }

  // Initialize stats
  const stats = {
    total: allLocations.length,
    success: 0,
    failed: 0,
    startTime: Date.now(),
  };

  const results: EnrichmentResult[] = [];

  console.log("Starting enrichment...");
  console.log(`Rate limit: ${RATE_LIMIT_MS}ms between requests`);
  console.log(`Estimated time: ${Math.ceil((allLocations.length * RATE_LIMIT_MS) / 1000 / 60)} minutes`);
  console.log("");

  // Process each location
  for (let i = 0; i < allLocations.length; i++) {
    const location = allLocations[i];
    if (!location) continue;

    const progress = ((i + 1) / allLocations.length * 100).toFixed(1);

    // Log progress every 10 locations
    if ((i + 1) % 10 === 0 || i === 0) {
      console.log(`[${progress}%] Processing ${i + 1}/${allLocations.length}: ${location.name} (${location.region})`);
    }

    // Enrich location
    const result = await enrichLocation(location);
    results.push(result);

    // Update stats
    if (result.success) {
      stats.success++;
    } else {
      stats.failed++;
    }

    // Update database (unless dry run)
    if (!isDryRun && result.success && result.placeId) {
      const updateData: { place_id: string; coordinates?: { lat: number; lng: number } } = {
        place_id: result.placeId,
      };

      if (result.coordinates) {
        updateData.coordinates = result.coordinates;
      }

      const { error: updateError } = await supabase
        .from("locations")
        .update(updateData)
        .eq("id", location.id);

      if (updateError) {
        console.error(`  ⚠️  Failed to update ${location.name}: ${updateError.message}`);
      }
    }

    // Rate limiting
    if (i < allLocations.length - 1) {
      await delay(RATE_LIMIT_MS);
    }
  }

  // Finalize stats
  const duration = Date.now() - stats.startTime;

  // Print summary
  console.log("");
  console.log("=".repeat(80));
  console.log("ENRICHMENT COMPLETE!");
  console.log("=".repeat(80));
  console.log("");
  console.log(`Total Locations:     ${stats.total}`);
  console.log(`✅ Success:          ${stats.success} (${((stats.success / stats.total) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed:           ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);
  console.log("");
  console.log(`Duration:            ${(duration / 1000 / 60).toFixed(2)} minutes`);

  if (isDryRun) {
    console.log("");
    console.log("⚠️  This was a dry run. No database updates were made.");
    console.log("   Run without --dry-run to update the database.");
  }

  // Show failed locations
  const failedResults = results.filter(r => !r.success);
  if (failedResults.length > 0 && failedResults.length <= 20) {
    console.log("");
    console.log("Failed locations:");
    failedResults.forEach((result) => {
      console.log(`  • ${result.name}: ${result.error || "Unknown error"}`);
    });
  } else if (failedResults.length > 20) {
    console.log("");
    console.log(`${failedResults.length} locations failed. First 20:`);
    failedResults.slice(0, 20).forEach((result) => {
      console.log(`  • ${result.name}: ${result.error || "Unknown error"}`);
    });
  }

  console.log("");
  console.log("=".repeat(80));
}

enrichAllLocations()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
