#!/usr/bin/env tsx
/**
 * Script to enrich locations with correct city/prefecture from Google Places API
 *
 * This script fixes two data quality issues:
 * 1. Locations where city = region name (e.g., "Kanto" instead of "Tokyo")
 * 2. Locations where prefecture is NULL
 *
 * It also normalizes prefecture names (removes " Prefecture" suffix)
 *
 * Usage:
 *   npx tsx scripts/enrich-location-geography.ts
 *   npx tsx scripts/enrich-location-geography.ts --dry-run  # Test without updating DB
 *   npx tsx scripts/enrich-location-geography.ts --test     # Process only first 10
 *   npx tsx scripts/enrich-location-geography.ts --limit 50 # Process only 50 locations
 *   npx tsx scripts/enrich-location-geography.ts --normalize-only # Only normalize prefectures
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
  console.error(
    "Error: GOOGLE_PLACES_API_KEY must be configured in .env.local"
  );
  console.error(
    "Get your API key from: https://console.cloud.google.com/apis/credentials"
  );
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL must be configured in .env.local"
  );
  process.exit(1);
}

// Google Places API configuration
const PLACES_API_BASE_URL = "https://places.googleapis.com/v1";
const RATE_LIMIT_MS = 200; // 200ms between requests (300/minute to stay under 500/minute limit)

// Region names that should NOT be used as city names
const REGION_NAMES = [
  "Kanto",
  "Kansai",
  "Chubu",
  "Tohoku",
  "Chugoku",
  "Kyushu",
  "Shikoku",
  "Hokkaido",
  "Okinawa",
];

interface LocationRow {
  id: string;
  name: string;
  city: string | null;
  prefecture: string | null;
  region: string | null;
  place_id: string;
}

interface AddressComponent {
  longText: string;
  shortText: string;
  types: string[];
}

interface PlaceDetails {
  addressComponents?: AddressComponent[];
}

interface GeographyEnrichmentResult {
  id: string;
  name: string;
  success: boolean;
  oldCity?: string | null;
  newCity?: string;
  oldPrefecture?: string | null;
  newPrefecture?: string;
  error?: string;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalize prefecture name by removing " Prefecture" suffix
 */
function normalizePrefecture(prefecture: string | null): string | null {
  if (!prefecture) return null;
  return prefecture.replace(/ Prefecture$/i, "").trim();
}

/**
 * Fetch place details including address components from Google Places API
 */
async function fetchPlaceGeography(
  placeId: string
): Promise<{ city: string | null; prefecture: string | null }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Google Places API key");
  }

  try {
    const response = await fetch(`${PLACES_API_BASE_URL}/places/${placeId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "addressComponents",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error: ${response.status} - ${errorBody}`);
    }

    const data = (await response.json()) as PlaceDetails;

    if (!data.addressComponents || data.addressComponents.length === 0) {
      return { city: null, prefecture: null };
    }

    let city: string | null = null;
    let prefecture: string | null = null;

    // Extract city and prefecture from address components
    // Priority for city: locality > administrative_area_level_2 > sublocality_level_1
    // Prefecture: administrative_area_level_1
    for (const component of data.addressComponents) {
      const types = component.types || [];

      if (types.includes("administrative_area_level_1")) {
        // This is the prefecture
        prefecture = normalizePrefecture(component.longText);
      } else if (types.includes("locality") && !city) {
        // Primary city
        city = component.longText;
      } else if (types.includes("administrative_area_level_2") && !city) {
        // Secondary city (used when locality is not available)
        city = component.longText;
      } else if (types.includes("sublocality_level_1") && !city) {
        // Neighborhood/ward (fallback)
        city = component.longText;
      }
    }

    return { city, prefecture };
  } catch (error) {
    throw error;
  }
}

/**
 * Enrich a single location with correct city/prefecture
 */
async function enrichLocationGeography(
  location: LocationRow
): Promise<GeographyEnrichmentResult> {
  try {
    const { city, prefecture } = await fetchPlaceGeography(location.place_id);

    if (!city && !prefecture) {
      return {
        id: location.id,
        name: location.name,
        success: false,
        error: "No address components found for this location",
      };
    }

    return {
      id: location.id,
      name: location.name,
      success: true,
      oldCity: location.city,
      newCity: city || undefined,
      oldPrefecture: location.prefecture,
      newPrefecture: prefecture || undefined,
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
 * Normalize all prefectures by removing " Prefecture" suffix
 */
async function normalizeAllPrefectures() {
  const isDryRun = process.argv.includes("--dry-run");

  // Use service role client for updates (has write permissions)
  const serviceRoleModule = await import("@/lib/supabase/serviceRole");
  const supabase = serviceRoleModule.getServiceRoleClient();

  console.log("=".repeat(80));
  console.log("PREFECTURE NORMALIZATION");
  console.log("=".repeat(80));
  console.log("");

  if (isDryRun) {
    console.log("⚠️  DRY RUN MODE - No database updates will be made\n");
  }

  // Find all prefectures that need normalization
  console.log('Fetching locations with " Prefecture" suffix...');

  const { data: locations, error } = await supabase
    .from("locations")
    .select("id, name, prefecture")
    .like("prefecture", "% Prefecture");

  if (error) {
    console.error("Error fetching locations:", error);
    process.exit(1);
  }

  if (!locations || locations.length === 0) {
    console.log("✅ All prefectures are already normalized!");
    return;
  }

  console.log(
    `Found ${locations.length} locations with " Prefecture" suffix\n`
  );

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];
    const progress = `[${i + 1}/${locations.length}]`;
    const normalizedPrefecture = normalizePrefecture(location.prefecture);

    if (!isDryRun) {
      const { error: updateError } = await supabase
        .from("locations")
        .update({ prefecture: normalizedPrefecture })
        .eq("id", location.id);

      if (updateError) {
        console.log(
          `${progress} ❌ ${location.name} - Update failed: ${updateError.message}`
        );
        failureCount++;
      } else {
        successCount++;
        if (i < 5 || i === locations.length - 1) {
          console.log(
            `${progress} ✅ "${location.prefecture}" → "${normalizedPrefecture}"`
          );
        } else if (i === 5) {
          console.log(`... (processing ${locations.length - 6} more)`);
        }
      }
    } else {
      successCount++;
      if (i < 5) {
        console.log(
          `${progress} ✅ "${location.prefecture}" → "${normalizedPrefecture}" (dry-run)`
        );
      } else if (i === 5) {
        console.log(`... (${locations.length - 5} more would be normalized)`);
      }
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("NORMALIZATION SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total processed: ${locations.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);

  if (isDryRun) {
    console.log("\n⚠️  This was a dry run - no database updates were made");
  }

  console.log("");
}

/**
 * Main enrichment function
 */
async function enrichAllLocationGeography() {
  const isDryRun = process.argv.includes("--dry-run");
  const isTest = process.argv.includes("--test");
  const normalizeOnly = process.argv.includes("--normalize-only");

  // If normalize-only flag is set, just normalize prefectures
  if (normalizeOnly) {
    await normalizeAllPrefectures();
    return;
  }

  // Parse --limit flag
  const limitIndex = process.argv.indexOf("--limit");
  const limitArg =
    limitIndex !== -1 ? parseInt(process.argv[limitIndex + 1], 10) : null;
  const limit = isTest ? 10 : limitArg;

  // Use service role client for updates (has write permissions)
  const serviceRoleModule = await import("@/lib/supabase/serviceRole");
  const supabase = serviceRoleModule.getServiceRoleClient();

  console.log("=".repeat(80));
  console.log("LOCATION GEOGRAPHY ENRICHMENT");
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

  // Fetch locations that need enrichment:
  // 1. city is a region name (misclassified)
  // 2. OR prefecture is NULL
  console.log("Fetching locations that need geography enrichment...");
  console.log(`  - Locations where city is a region name: ${REGION_NAMES.join(", ")}`);
  console.log("  - Locations where prefecture is NULL\n");

  let allLocations: LocationRow[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    // Build the OR filter for region names in city field
    const regionFilter = REGION_NAMES.map((r) => `city.eq.${r}`).join(",");

    const { data, error } = await supabase
      .from("locations")
      .select("id, name, city, prefecture, region, place_id")
      .not("place_id", "is", null)
      .neq("place_id", "")
      .or(`${regionFilter},prefecture.is.null`)
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

  // Categorize the issues
  const misclassifiedCity = allLocations.filter(
    (l) => l.city && REGION_NAMES.includes(l.city)
  );
  const nullPrefecture = allLocations.filter((l) => !l.prefecture);

  console.log(`Found ${allLocations.length} locations needing enrichment:`);
  console.log(`  - ${misclassifiedCity.length} with city = region name`);
  console.log(`  - ${nullPrefecture.length} with NULL prefecture`);
  console.log("");

  if (allLocations.length === 0) {
    console.log("✅ All locations have correct city/prefecture data!");
    return;
  }

  // Apply limit if specified
  const locationsToProcess = limit
    ? allLocations.slice(0, limit)
    : allLocations;

  console.log(`Processing ${locationsToProcess.length} locations...\n`);
  console.log("Progress:");

  const results: GeographyEnrichmentResult[] = [];
  let successCount = 0;
  let failureCount = 0;
  let noDataCount = 0;

  for (let i = 0; i < locationsToProcess.length; i++) {
    const location = locationsToProcess[i];
    const progress = `[${i + 1}/${locationsToProcess.length}]`;

    try {
      // Fetch geography from Google Places
      const result = await enrichLocationGeography(location);
      results.push(result);

      if (result.success && (result.newCity || result.newPrefecture)) {
        successCount++;

        // Build update object - only update fields we got data for
        const updates: { city?: string; prefecture?: string } = {};

        // Only update city if current city is a region name AND we got a new city
        if (
          result.newCity &&
          location.city &&
          REGION_NAMES.includes(location.city)
        ) {
          updates.city = result.newCity;
        }

        // Only update prefecture if current is NULL AND we got a new prefecture
        if (result.newPrefecture && !location.prefecture) {
          updates.prefecture = result.newPrefecture;
        }

        // If no updates needed after filtering, skip
        if (Object.keys(updates).length === 0) {
          console.log(
            `${progress} ⏭️  ${location.name} - No updates needed (data already good)`
          );
          successCount--;
          continue;
        }

        // Update database (unless dry-run)
        if (!isDryRun) {
          const { error: updateError } = await supabase
            .from("locations")
            .update(updates)
            .eq("id", result.id);

          if (updateError) {
            console.log(
              `${progress} ❌ ${location.name} - Database update failed: ${updateError.message}`
            );
            failureCount++;
            successCount--;
          } else {
            const changes: string[] = [];
            if (updates.city) {
              changes.push(`city: "${location.city}" → "${updates.city}"`);
            }
            if (updates.prefecture) {
              changes.push(
                `prefecture: "${location.prefecture}" → "${updates.prefecture}"`
              );
            }
            console.log(`${progress} ✅ ${location.name} - ${changes.join(", ")}`);
          }
        } else {
          const changes: string[] = [];
          if (updates.city) {
            changes.push(`city: "${location.city}" → "${updates.city}"`);
          }
          if (updates.prefecture) {
            changes.push(
              `prefecture: "${location.prefecture}" → "${updates.prefecture}"`
            );
          }
          console.log(
            `${progress} ✅ ${location.name} - ${changes.join(", ")} (dry-run)`
          );
        }
      } else {
        if (result.error?.includes("No address components")) {
          noDataCount++;
          console.log(
            `${progress} 📍 ${location.name} - No address data available`
          );
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
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
  console.log(`📍 No address data: ${noDataCount}`);
  console.log(`❌ Failed: ${failureCount}`);

  if (isDryRun) {
    console.log("\n⚠️  This was a dry run - no database updates were made");
  }

  if (limit && allLocations.length > limit) {
    console.log(
      `\n📊 ${allLocations.length - limit} locations remaining (use --limit or remove flag to process all)`
    );
  }

  // Remind about prefecture normalization
  console.log("\n💡 TIP: After enrichment, run with --normalize-only to clean up prefecture names");
  console.log('   npx tsx scripts/enrich-location-geography.ts --normalize-only');

  console.log("");
}

// Run the script
enrichAllLocationGeography().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
