#!/usr/bin/env tsx
/**
 * Script to enrich Kanto region locations with place_id and coordinates
 * 
 * This script:
 * 1. Fetches all Kanto locations without place_id from the database
 * 2. Uses Google Places API to search for each location
 * 3. Updates the database with place_id and coordinates
 * 
 * Usage:
 *   npm run tsx scripts/enrich-kanto-locations.ts
 *   npm run tsx scripts/enrich-kanto-locations.ts -- --dry-run  # Test without updating DB
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

import { createClient } from "@supabase/supabase-js";

// Import service role client for database updates
let getServiceRoleClient: typeof import("@/lib/supabase/serviceRole").getServiceRoleClient;

// Call Google Places API directly to avoid env module initialization issues
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
const BATCH_SIZE = 50; // Save progress every 50 locations

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

async function enrichKantoLocation(location: LocationRow): Promise<EnrichmentResult> {
  try {
    // Build search query: "name, city, Kanto, Japan"
    const queryParts = [
      location.name,
      location.city,
      "Kanto",
      "Japan",
    ].filter(Boolean);

    const query = queryParts.join(", ");

    // Call Google Places API directly
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

async function enrichKantoLocations() {
  const isDryRun = process.argv.includes("--dry-run");
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured");
    process.exit(1);
  }

  // API key is already verified at the top of the script

  // Use service role client for updates (has write permissions)
  const serviceRoleModule = await import("@/lib/supabase/serviceRole");
  getServiceRoleClient = serviceRoleModule.getServiceRoleClient;
  const supabase = getServiceRoleClient();

  console.log("=".repeat(80));
  console.log("KANTO REGION LOCATION ENRICHMENT");
  console.log("=".repeat(80));
  console.log("");

  if (isDryRun) {
    console.log("⚠️  DRY RUN MODE - No database updates will be made\n");
  }

  // Fetch all Kanto locations without place_id
  console.log("Fetching Kanto locations without place_id...");
  
  let allKantoLocations: LocationRow[] = [];
  let page = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, city, region, category, place_id, coordinates")
      .eq("region", "Kanto")
      .or("place_id.is.null,place_id.eq.")
      .range(page * limit, (page + 1) * limit - 1);

    if (error) {
      console.error("Error fetching locations:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allKantoLocations = [...allKantoLocations, ...data];
    hasMore = data.length === limit;
    page++;
  }

  console.log(`Found ${allKantoLocations.length} Kanto locations without place_id\n`);

  if (allKantoLocations.length === 0) {
    console.log("✅ All Kanto locations already have place_id!");
    return;
  }

  // Limit to first 10 for testing if --test flag is provided
  const isTest = process.argv.includes("--test");
  if (isTest) {
    console.log("⚠️  TEST MODE - Processing only first 10 locations\n");
    allKantoLocations = allKantoLocations.slice(0, 10);
  }

  // Initialize stats
  const stats = {
    total: allKantoLocations.length,
    success: 0,
    failed: 0,
    startTime: Date.now(),
  };

  const results: EnrichmentResult[] = [];

  console.log("Starting enrichment...");
  console.log(`Rate limit: ${RATE_LIMIT_MS}ms between requests`);
  console.log(`Estimated time: ${Math.ceil((allKantoLocations.length * RATE_LIMIT_MS) / 1000 / 60)} minutes`);
  console.log("");

  // Process each location
  for (let i = 0; i < allKantoLocations.length; i++) {
    const location = allKantoLocations[i];
    if (!location) continue;

    const progress = ((i + 1) / allKantoLocations.length * 100).toFixed(1);

    // Log progress every 10 locations
    if ((i + 1) % 10 === 0 || i === 0) {
      console.log(`[${progress}%] Processing ${i + 1}/${allKantoLocations.length}: ${location.name}`);
    }

    // Enrich location
    const result = await enrichKantoLocation(location);
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
      } else if ((i + 1) % 10 === 0) {
        console.log(`  ✓ Updated ${location.name}`);
      }
    }

    // Rate limiting
    if (i < allKantoLocations.length - 1) {
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

enrichKantoLocations()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
