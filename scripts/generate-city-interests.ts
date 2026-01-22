#!/usr/bin/env tsx
/**
 * Generate city-interests mapping for the trip builder.
 *
 * This script queries all locations from the database, groups them by city and category,
 * then maps categories to interests using the existing CATEGORY_TO_INTERESTS mapping.
 *
 * Output: src/data/cityInterests.json
 *
 * Usage: npx tsx scripts/generate-city-interests.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync } from "fs";

const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

import { createClient } from "@supabase/supabase-js";

// Interest IDs from src/data/interests.ts
type InterestId = "culture" | "food" | "nature" | "shopping" | "photography" | "nightlife" | "wellness" | "history";

// Category to interest mapping from src/lib/scoring/locationScoring.ts
const CATEGORY_TO_INTERESTS: Record<string, InterestId[]> = {
  // Specific categories (preferred)
  shrine: ["culture", "history"],
  temple: ["culture", "history"],
  landmark: ["culture", "photography"],
  historic: ["culture", "history"],
  restaurant: ["food"],
  market: ["food", "shopping"],
  park: ["nature", "wellness", "photography"],
  garden: ["nature", "wellness", "photography"],
  bar: ["nightlife"],
  entertainment: ["nightlife"],
  shopping: ["shopping"],
  museum: ["culture", "history"],
  viewpoint: ["photography", "nature"],
  nature: ["nature", "photography", "wellness"],
  // Additional sub-types from categoryHierarchy.ts
  cafe: ["food"],
  performing_arts: ["culture"],
  beach: ["nature", "photography"],
  mountain: ["nature", "photography", "wellness"],
  onsen: ["wellness", "nature"],
  mall: ["shopping"],
  street: ["shopping", "photography"],
  specialty: ["shopping"],
  tower: ["photography"],
  // Generic fallback categories
  culture: ["culture", "history"],
  food: ["food"],
  view: ["photography", "nature"],
};

// All interest IDs for completeness check
const ALL_INTERESTS: InterestId[] = ["culture", "food", "nature", "shopping", "photography", "nightlife", "wellness", "history"];

interface CityInterestData {
  [city: string]: {
    [interest in InterestId]?: number;
  };
}

interface CityMetadata {
  locationCount: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
  region?: string;
}

interface OutputData {
  generatedAt: string;
  totalLocations: number;
  totalCities: number;
  cities: CityInterestData;
  metadata: {
    [city: string]: CityMetadata;
  };
}

async function generateCityInterests() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Error: Missing Supabase credentials");
    console.error("Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("\n" + "=".repeat(70));
  console.log("GENERATING CITY-INTERESTS MAPPING");
  console.log("=".repeat(70));

  // Fetch all locations with city and category (paginated to handle >1000 rows)
  console.log("\nFetching locations from database...");

  const PAGE_SIZE = 1000;
  let allLocations: Array<{
    id: string;
    city: string | null;
    category: string | null;
    region: string | null;
    coordinates: { lat: number; lng: number } | null;
  }> = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error } = await supabase
      .from("locations")
      .select("id, city, category, region, coordinates")
      .not("city", "is", null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching locations:", error);
      process.exit(1);
    }

    if (!batch || batch.length === 0) {
      hasMore = false;
    } else {
      allLocations = allLocations.concat(batch);
      offset += PAGE_SIZE;
      console.log(`  Fetched ${allLocations.length} locations...`);
      hasMore = batch.length === PAGE_SIZE;
    }
  }

  const locations = allLocations;

  if (locations.length === 0) {
    console.error("No locations found in database");
    process.exit(1);
  }

  console.log(`Found ${locations.length} total locations with city data`);

  // Group by city and category
  const cityCategories: Record<string, Record<string, number>> = {};
  const cityMetadata: Record<string, CityMetadata> = {};

  for (const location of locations) {
    const city = location.city?.trim();
    const category = location.category?.trim();

    if (!city) continue;

    // Initialize city data
    if (!cityCategories[city]) {
      cityCategories[city] = {};
      cityMetadata[city] = {
        locationCount: 0,
        region: location.region || undefined,
        coordinates: location.coordinates || undefined,
      };
    }

    cityMetadata[city].locationCount++;

    // Update coordinates if we don't have them yet (take first location's coords)
    if (!cityMetadata[city].coordinates && location.coordinates) {
      cityMetadata[city].coordinates = location.coordinates;
    }

    // Count by category
    if (category) {
      cityCategories[city][category] = (cityCategories[city][category] || 0) + 1;
    }
  }

  console.log(`Processed ${Object.keys(cityCategories).length} unique cities`);

  // Map categories to interests
  const cityInterests: CityInterestData = {};

  for (const [city, categories] of Object.entries(cityCategories)) {
    cityInterests[city] = {};

    for (const [category, count] of Object.entries(categories)) {
      const interests = CATEGORY_TO_INTERESTS[category.toLowerCase()];

      if (interests) {
        for (const interest of interests) {
          cityInterests[city][interest] = (cityInterests[city][interest] || 0) + count;
        }
      }
    }

    // Ensure all interests have at least a 0 value for consistency
    for (const interest of ALL_INTERESTS) {
      if (cityInterests[city][interest] === undefined) {
        cityInterests[city][interest] = 0;
      }
    }
  }

  // Sort cities by total location count
  const sortedCities = Object.keys(cityInterests).sort((a, b) =>
    cityMetadata[b].locationCount - cityMetadata[a].locationCount
  );

  const sortedCityInterests: CityInterestData = {};
  const sortedMetadata: Record<string, CityMetadata> = {};

  for (const city of sortedCities) {
    sortedCityInterests[city] = cityInterests[city];
    sortedMetadata[city] = cityMetadata[city];
  }

  // Create output data
  const outputData: OutputData = {
    generatedAt: new Date().toISOString(),
    totalLocations: locations.length,
    totalCities: sortedCities.length,
    cities: sortedCityInterests,
    metadata: sortedMetadata,
  };

  // Write to file
  const outputPath = resolve(process.cwd(), "src/data/cityInterests.json");
  writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

  console.log(`\n✅ Generated ${outputPath}`);
  console.log(`   - ${outputData.totalCities} cities`);
  console.log(`   - ${outputData.totalLocations} locations`);

  // Print top 10 cities
  console.log("\nTop 10 cities by location count:");
  for (let i = 0; i < Math.min(10, sortedCities.length); i++) {
    const city = sortedCities[i];
    const meta = cityMetadata[city];
    console.log(`   ${i + 1}. ${city}: ${meta.locationCount} locations`);
  }

  // Print sample output
  if (sortedCities.length > 0) {
    const sampleCity = sortedCities[0];
    console.log(`\nSample output for ${sampleCity}:`);
    console.log(JSON.stringify(sortedCityInterests[sampleCity], null, 2));
  }

  console.log("\n" + "=".repeat(70));
}

generateCityInterests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
