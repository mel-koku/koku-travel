#!/usr/bin/env tsx
/**
 * Comprehensive Google Places Enrichment Script
 *
 * This script enriches locations with additional data from Google Places API:
 * - Primary type and all types (for accurate categorization)
 * - Business status (OPERATIONAL, TEMPORARILY_CLOSED, PERMANENTLY_CLOSED)
 * - Price level (1-4)
 * - Accessibility options (wheelchair access)
 * - Dietary options (vegetarian)
 * - Service options (dine-in, takeout, delivery)
 * - Meal options (breakfast, brunch, lunch, dinner)
 *
 * It also updates the location's category based on Google's primaryType.
 *
 * Usage:
 *   npx tsx scripts/enrich-google-places-full.ts --dry-run        # Preview changes
 *   npx tsx scripts/enrich-google-places-full.ts --test           # Process only 10 locations
 *   npx tsx scripts/enrich-google-places-full.ts --limit 100      # Process 100 locations
 *   npx tsx scripts/enrich-google-places-full.ts --skip-enriched  # Skip already enriched locations
 *   npx tsx scripts/enrich-google-places-full.ts                  # Full enrichment
 *
 * Cost: ~$25-30 for 2,586 locations (one-time)
 * Time: ~10 minutes with rate limiting
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

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Google Places API configuration
const PLACES_API_BASE_URL = "https://places.googleapis.com/v1";
const RATE_LIMIT_MS = 200; // 200ms between requests (5 req/sec)

// Field mask for enrichment - all the fields we want to fetch
const ENRICHMENT_FIELD_MASK = [
  "id",
  "primaryType",
  "types",
  "businessStatus",
  "priceLevel",
  "accessibilityOptions",
  "servesVegetarianFood",
  "servesBeer",
  "servesWine",
  "dineIn",
  "takeout",
  "delivery",
  "servesBreakfast",
  "servesBrunch",
  "servesLunch",
  "servesDinner",
].join(",");

// Mapping from Google Places primaryType to our category system
const GOOGLE_TYPE_TO_CATEGORY: Record<string, string> = {
  // Religious / Temples / Shrines
  buddhist_temple: "temple",
  hindu_temple: "shrine",
  shinto_shrine: "shrine",
  place_of_worship: "shrine",
  church: "shrine",
  mosque: "shrine",
  synagogue: "shrine",

  // Cultural / Landmarks
  museum: "museum",
  art_gallery: "museum",
  castle: "landmark",
  cultural_landmark: "landmark",
  tourist_attraction: "landmark",
  historical_landmark: "landmark",
  monument: "landmark",
  landmark: "landmark",
  cultural_center: "culture",

  // Food & Drink
  restaurant: "restaurant",
  cafe: "restaurant",
  coffee_shop: "restaurant",
  bar: "bar",
  pub: "bar",
  wine_bar: "bar",
  cocktail_bar: "bar",
  bakery: "restaurant",
  ramen_restaurant: "restaurant",
  sushi_restaurant: "restaurant",
  japanese_restaurant: "restaurant",
  fast_food_restaurant: "restaurant",
  meal_takeaway: "restaurant",
  meal_delivery: "restaurant",
  ice_cream_shop: "restaurant",
  food: "food",
  food_court: "food",

  // Nature
  park: "park",
  national_park: "nature",
  state_park: "nature",
  zoo: "nature",
  aquarium: "nature",
  botanical_garden: "nature",
  garden: "park",
  beach: "nature",
  campground: "nature",
  natural_feature: "nature",
  hiking_area: "nature",

  // Shopping
  shopping_mall: "shopping",
  market: "market",
  grocery_store: "market",
  supermarket: "market",
  convenience_store: "shopping",
  store: "shopping",
  clothing_store: "shopping",
  department_store: "shopping",
  electronics_store: "shopping",
  bookstore: "shopping",
  gift_shop: "shopping",
  souvenir_store: "shopping",

  // Entertainment
  movie_theater: "entertainment",
  performing_arts_theater: "entertainment",
  amusement_park: "entertainment",
  theme_park: "entertainment",
  bowling_alley: "entertainment",
  night_club: "bar",

  // Sports
  stadium: "landmark",
  sports_complex: "entertainment",
  gym: "entertainment",
  spa: "wellness",

  // Transportation
  train_station: "landmark",
  transit_station: "landmark",
  airport: "landmark",
  bus_station: "landmark",

  // Viewpoints
  observation_deck: "viewpoint",
  scenic_viewpoint: "viewpoint",
  lookout: "viewpoint",

  // Other
  hotel: "accommodation",
  lodging: "accommodation",
  hot_spring: "wellness",
  onsen: "wellness",
};

interface LocationRow {
  id: string;
  name: string;
  category: string;
  place_id: string | null;
  google_primary_type: string | null;
}

interface PlaceEnrichmentData {
  id?: string;
  primaryType?: string;
  types?: string[];
  businessStatus?: string;
  priceLevel?: string;
  accessibilityOptions?: {
    wheelchairAccessibleEntrance?: boolean;
    wheelchairAccessibleParking?: boolean;
    wheelchairAccessibleRestroom?: boolean;
    wheelchairAccessibleSeating?: boolean;
  };
  servesVegetarianFood?: boolean;
  servesBeer?: boolean;
  servesWine?: boolean;
  dineIn?: boolean;
  takeout?: boolean;
  delivery?: boolean;
  servesBreakfast?: boolean;
  servesBrunch?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
}

interface EnrichmentResult {
  id: string;
  name: string;
  success: boolean;
  oldCategory?: string;
  newCategory?: string;
  googlePrimaryType?: string;
  googleTypes?: string[];
  businessStatus?: string;
  priceLevel?: number;
  hasAccessibility?: boolean;
  hasVegetarian?: boolean;
  error?: string;
}

interface EnrichmentLog {
  timestamp: string;
  totalProcessed: number;
  successful: number;
  failed: number;
  categoryUpdates: number;
  results: EnrichmentResult[];
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert Google Places priceLevel string to numeric value
 */
function parsePriceLevel(priceLevel?: string): number | null {
  if (!priceLevel) return null;

  const mapping: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };

  return mapping[priceLevel] ?? null;
}

/**
 * Determine the best category based on Google's types
 */
function deriveCategory(data: PlaceEnrichmentData, currentCategory: string): string {
  // First, try primaryType
  if (data.primaryType) {
    const mapped = GOOGLE_TYPE_TO_CATEGORY[data.primaryType];
    if (mapped) return mapped;
  }

  // Then, try other types in order
  if (data.types) {
    for (const type of data.types) {
      const mapped = GOOGLE_TYPE_TO_CATEGORY[type];
      if (mapped) return mapped;
    }
  }

  // Keep existing category if no mapping found
  return currentCategory;
}

/**
 * Fetch enrichment data from Google Places API
 */
async function fetchEnrichmentData(
  placeId: string
): Promise<PlaceEnrichmentData | null> {
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
        "X-Goog-FieldMask": ENRICHMENT_FIELD_MASK,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error: ${response.status} - ${errorBody}`);
    }

    const data = (await response.json()) as PlaceEnrichmentData;
    return data;
  } catch (error) {
    console.error(`Failed to fetch enrichment data for ${placeId}:`, error);
    return null;
  }
}

/**
 * Main enrichment function
 */
async function enrichLocations(options: {
  dryRun: boolean;
  limit?: number;
  skipEnriched: boolean;
}): Promise<void> {
  const { dryRun, limit, skipEnriched } = options;

  console.log("\n=== Google Places Full Enrichment ===");
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(`Skip already enriched: ${skipEnriched}`);
  if (limit) console.log(`Limit: ${limit} locations`);
  console.log("");

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch locations that need enrichment
  let query = supabase
    .from("locations")
    .select("id, name, category, place_id, google_primary_type")
    .not("place_id", "is", null);

  if (skipEnriched) {
    query = query.is("google_primary_type", null);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data: locations, error } = await query;

  if (error) {
    console.error("Failed to fetch locations:", error);
    process.exit(1);
  }

  if (!locations || locations.length === 0) {
    console.log("No locations to enrich.");
    return;
  }

  console.log(`Found ${locations.length} locations to enrich`);
  console.log("");

  const results: EnrichmentResult[] = [];
  let successful = 0;
  let failed = 0;
  let categoryUpdates = 0;

  for (let i = 0; i < locations.length; i++) {
    const location = locations[i] as LocationRow;

    // Progress indicator
    if ((i + 1) % 50 === 0 || i === 0) {
      const percent = Math.round(((i + 1) / locations.length) * 100);
      console.log(`Progress: ${i + 1}/${locations.length} (${percent}%)`);
    }

    if (!location.place_id) {
      results.push({
        id: location.id,
        name: location.name,
        success: false,
        error: "No place_id",
      });
      failed++;
      continue;
    }

    // Rate limiting
    if (i > 0) {
      await delay(RATE_LIMIT_MS);
    }

    // Fetch enrichment data
    const enrichmentData = await fetchEnrichmentData(location.place_id);

    if (!enrichmentData) {
      results.push({
        id: location.id,
        name: location.name,
        success: false,
        error: "API call failed",
      });
      failed++;
      continue;
    }

    // Derive new category from Google types
    const newCategory = deriveCategory(enrichmentData, location.category);
    const categoryChanged = newCategory !== location.category;

    // Parse price level
    const priceLevel = parsePriceLevel(enrichmentData.priceLevel);

    // Build update object
    const updateData: Record<string, unknown> = {
      google_primary_type: enrichmentData.primaryType || null,
      google_types: enrichmentData.types || null,
      business_status: enrichmentData.businessStatus || null,
      price_level: priceLevel,
      accessibility_options:
        enrichmentData.accessibilityOptions &&
        Object.keys(enrichmentData.accessibilityOptions).length > 0
          ? enrichmentData.accessibilityOptions
          : null,
      dietary_options:
        enrichmentData.servesVegetarianFood !== undefined
          ? { servesVegetarianFood: enrichmentData.servesVegetarianFood }
          : null,
      service_options:
        enrichmentData.dineIn !== undefined ||
        enrichmentData.takeout !== undefined ||
        enrichmentData.delivery !== undefined
          ? {
              dineIn: enrichmentData.dineIn,
              takeout: enrichmentData.takeout,
              delivery: enrichmentData.delivery,
            }
          : null,
      meal_options:
        enrichmentData.servesBreakfast !== undefined ||
        enrichmentData.servesBrunch !== undefined ||
        enrichmentData.servesLunch !== undefined ||
        enrichmentData.servesDinner !== undefined
          ? {
              servesBreakfast: enrichmentData.servesBreakfast,
              servesBrunch: enrichmentData.servesBrunch,
              servesLunch: enrichmentData.servesLunch,
              servesDinner: enrichmentData.servesDinner,
            }
          : null,
    };

    // Update category if changed
    if (categoryChanged) {
      updateData.category = newCategory;
      categoryUpdates++;
    }

    // Apply update (unless dry run)
    if (!dryRun) {
      const { error: updateError } = await supabase
        .from("locations")
        .update(updateData)
        .eq("id", location.id);

      if (updateError) {
        results.push({
          id: location.id,
          name: location.name,
          success: false,
          error: updateError.message,
        });
        failed++;
        continue;
      }
    }

    // Log success
    const hasAccessibility =
      enrichmentData.accessibilityOptions &&
      Object.values(enrichmentData.accessibilityOptions).some(Boolean);

    results.push({
      id: location.id,
      name: location.name,
      success: true,
      oldCategory: categoryChanged ? location.category : undefined,
      newCategory: categoryChanged ? newCategory : undefined,
      googlePrimaryType: enrichmentData.primaryType,
      googleTypes: enrichmentData.types,
      businessStatus: enrichmentData.businessStatus,
      priceLevel: priceLevel ?? undefined,
      hasAccessibility: hasAccessibility ?? false,
      hasVegetarian: enrichmentData.servesVegetarianFood ?? false,
    });
    successful++;

    // Log category changes
    if (categoryChanged) {
      console.log(
        `  [CAT] ${location.name}: ${location.category} → ${newCategory} (primaryType: ${enrichmentData.primaryType})`
      );
    }
  }

  // Summary
  console.log("\n=== Enrichment Summary ===");
  console.log(`Total processed: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Category updates: ${categoryUpdates}`);

  // Count locations with specific data
  const withPriceLevel = results.filter((r) => r.priceLevel !== undefined).length;
  const withAccessibility = results.filter((r) => r.hasAccessibility).length;
  const withVegetarian = results.filter((r) => r.hasVegetarian).length;
  const closedCount = results.filter(
    (r) =>
      r.businessStatus === "CLOSED_TEMPORARILY" ||
      r.businessStatus === "CLOSED_PERMANENTLY"
  ).length;

  console.log(`\nData coverage:`);
  console.log(`  - With price level: ${withPriceLevel}`);
  console.log(`  - With accessibility: ${withAccessibility}`);
  console.log(`  - Vegetarian friendly: ${withVegetarian}`);
  console.log(`  - Closed locations: ${closedCount}`);

  // Write log file
  const logFile: EnrichmentLog = {
    timestamp: new Date().toISOString(),
    totalProcessed: results.length,
    successful,
    failed,
    categoryUpdates,
    results,
  };

  const logPath = path.join(
    process.cwd(),
    "scripts",
    `enrichment-log-${new Date().toISOString().split("T")[0]}.json`
  );
  fs.writeFileSync(logPath, JSON.stringify(logFile, null, 2));
  console.log(`\nLog written to: ${logPath}`);

  if (dryRun) {
    console.log(
      "\n⚠️  DRY RUN - No changes were made. Run without --dry-run to apply changes."
    );
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const testMode = args.includes("--test");
const skipEnriched = args.includes("--skip-enriched");

let limit: number | undefined;
if (testMode) {
  limit = 10;
} else {
  const limitArg = args.find((arg) => arg.startsWith("--limit"));
  if (limitArg) {
    const limitValue = args[args.indexOf(limitArg) + 1];
    limit = limitValue ? parseInt(limitValue, 10) : undefined;
  }
}

// Run enrichment
enrichLocations({ dryRun, limit, skipEnriched })
  .then(() => {
    console.log("\nEnrichment complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Enrichment failed:", error);
    process.exit(1);
  });
