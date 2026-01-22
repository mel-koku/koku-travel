#!/usr/bin/env tsx
/**
 * Script to enrich locations with primary photo URLs from Google Places API
 *
 * This script:
 * 1. Fetches all locations with place_id but without primary_photo_url
 * 2. Calls Google Places API to get photo details for each location
 * 3. Updates the database with the primary photo URL
 *
 * Usage:
 *   npx tsx scripts/enrich-location-photos.ts
 *   npx tsx scripts/enrich-location-photos.ts --dry-run  # Test without updating DB
 *   npx tsx scripts/enrich-location-photos.ts --test     # Process only first 10
 *   npx tsx scripts/enrich-location-photos.ts --limit 50 # Process only 50 locations
 */

// Load environment variables FIRST before any other imports
import { config } from "dotenv";
const result = config({ path: ".env.local" });

if (result.error) {
  console.error("Failed to load .env.local:", result.error);
  process.exit(1);
}

// Verify required environment variables
if (!process.env.GOOGLE_PLACES_API_KEY) {
  console.error("Error: GOOGLE_PLACES_API_KEY must be configured in .env.local");
  console.error("Get your API key from: https://console.cloud.google.com/apis/credentials");
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL must be configured in .env.local");
  process.exit(1);
}

// Google Places API configuration
const PLACES_API_BASE_URL = "https://places.googleapis.com/v1";
const RATE_LIMIT_MS = 200; // 200ms between requests (300/minute to stay under 500/minute limit)

interface LocationRow {
  id: string;
  name: string;
  city: string;
  region: string;
  place_id: string;
  primary_photo_url: string | null;
}

interface PhotoEnrichmentResult {
  id: string;
  name: string;
  success: boolean;
  photoUrl?: string;
  error?: string;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch place details including photos from Google Places API
 */
async function fetchPlacePhotos(placeId: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Google Places API key");
  }

  try {
    const response = await fetch(
      `${PLACES_API_BASE_URL}/places/${placeId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "photos.name,photos.widthPx,photos.heightPx",
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json() as {
      photos?: Array<{
        name?: string;
        widthPx?: number;
        heightPx?: number;
      }>;
    };

    // Get the first photo (primary photo)
    const primaryPhoto = data.photos?.[0];
    if (!primaryPhoto?.name) {
      return null;
    }

    // Build the proxy URL (same format as used in LocationCard)
    const photoUrl = `/api/places/photo?photoName=${encodeURIComponent(primaryPhoto.name)}&maxWidthPx=1600`;
    return photoUrl;
  } catch (error) {
    throw error;
  }
}

/**
 * Enrich a single location with primary photo URL
 */
async function enrichLocationPhoto(location: LocationRow): Promise<PhotoEnrichmentResult> {
  try {
    const photoUrl = await fetchPlacePhotos(location.place_id);

    if (!photoUrl) {
      return {
        id: location.id,
        name: location.name,
        success: false,
        error: "No photos found for this location",
      };
    }

    return {
      id: location.id,
      name: location.name,
      success: true,
      photoUrl,
    };
  } catch (error) {
    return {
      id: location.id,
      name: location.name,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main enrichment function
 */
async function enrichAllLocationPhotos() {
  const isDryRun = process.argv.includes("--dry-run");
  const isTest = process.argv.includes("--test");

  // Parse --limit flag
  const limitIndex = process.argv.indexOf("--limit");
  const limitArg = limitIndex !== -1 ? parseInt(process.argv[limitIndex + 1], 10) : null;
  const limit = isTest ? 10 : limitArg;

  // Use service role client for updates (has write permissions)
  const serviceRoleModule = await import("@/lib/supabase/serviceRole");
  const supabase = serviceRoleModule.getServiceRoleClient();

  console.log("=".repeat(80));
  console.log("LOCATION PHOTO ENRICHMENT");
  console.log("=".repeat(80));
  console.log("");

  if (isDryRun) {
    console.log("⚠️  DRY RUN MODE - No database updates will be made\n");
  }

  if (isTest) {
    console.log("🧪 TEST MODE - Processing only first 10 locations\n");
  }

  if (limit && !isTest) {
    console.log(`📊 LIMIT MODE - Processing only ${limit} locations\n`);
  }

  // Fetch all locations with place_id but without primary_photo_url
  console.log("Fetching locations that need photo enrichment...");

  let allLocations: LocationRow[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, city, region, place_id, primary_photo_url")
      .not("place_id", "is", null)
      .neq("place_id", "")
      .is("primary_photo_url", null)
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching locations:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allLocations = [...allLocations, ...(data as LocationRow[])];
    page++;

    if (data.length < pageSize) {
      hasMore = false;
    }
  }

  console.log(`Found ${allLocations.length} locations without primary photo URLs\n`);

  if (allLocations.length === 0) {
    console.log("✅ All locations already have primary photo URLs!");
    return;
  }

  // Apply limit if specified
  const locationsToProcess = limit ? allLocations.slice(0, limit) : allLocations;

  console.log(`Processing ${locationsToProcess.length} locations...\n`);
  console.log("Progress:");

  const results: PhotoEnrichmentResult[] = [];
  let successCount = 0;
  let failureCount = 0;
  let noPhotoCount = 0;

  for (let i = 0; i < locationsToProcess.length; i++) {
    const location = locationsToProcess[i];
    const progress = `[${i + 1}/${locationsToProcess.length}]`;

    try {
      // Fetch photo from Google Places
      const result = await enrichLocationPhoto(location);
      results.push(result);

      if (result.success && result.photoUrl) {
        successCount++;

        // Update database with photo URL (unless dry-run)
        if (!isDryRun) {
          const { error: updateError } = await supabase
            .from("locations")
            .update({ primary_photo_url: result.photoUrl })
            .eq("id", result.id);

          if (updateError) {
            console.log(`${progress} ❌ ${location.name} - Database update failed: ${updateError.message}`);
            failureCount++;
            successCount--;
          } else {
            console.log(`${progress} ✅ ${location.name}`);
          }
        } else {
          console.log(`${progress} ✅ ${location.name} (dry-run)`);
        }
      } else {
        if (result.error?.includes("No photos found")) {
          noPhotoCount++;
          console.log(`${progress} 📷 ${location.name} - No photos available`);
        } else {
          failureCount++;
          console.log(`${progress} ❌ ${location.name} - ${result.error}`);
        }
      }

      // Rate limiting: wait between requests
      if (i < locationsToProcess.length - 1) {
        await delay(RATE_LIMIT_MS);
      }
    } catch (error) {
      failureCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`${progress} ❌ ${location.name} - ${errorMessage}`);

      // Rate limiting even on errors
      if (i < locationsToProcess.length - 1) {
        await delay(RATE_LIMIT_MS);
      }
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total processed: ${locationsToProcess.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`📷 No photos available: ${noPhotoCount}`);
  console.log(`❌ Failed: ${failureCount}`);

  if (isDryRun) {
    console.log("\n⚠️  This was a dry run - no database updates were made");
  }

  if (limit && allLocations.length > limit) {
    console.log(`\n📊 ${allLocations.length - limit} locations remaining (use --limit or remove flag to process all)`);
  }

  console.log("");
}

// Run the script
enrichAllLocationPhotos().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
