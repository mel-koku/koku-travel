#!/usr/bin/env tsx
/**
 * Script to analyze patterns in locations missing place_id
 * 
 * Usage:
 *   npm run tsx scripts/analyze-place-id-patterns.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function analyzePlaceIdPatterns() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured in .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log("Analyzing patterns in locations missing place_id...\n");

  // Get all locations (fetch in batches to avoid limits)
  let allLocations: any[] = [];
  let page = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, region, city, category, place_id, seed_source_url, coordinates")
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
    
    if (page > 10) {
      console.warn("Reached pagination safety limit");
      break;
    }
  }

  const allError = null;

  if (allError) {
    console.error("Error fetching locations:", allError);
    process.exit(1);
  }

  if (!allLocations || allLocations.length === 0) {
    console.log("No locations found.");
    return;
  }

  const withPlaceId = allLocations.filter(loc => loc.place_id && loc.place_id.trim() !== "");
  const withoutPlaceId = allLocations.filter(loc => !loc.place_id || loc.place_id.trim() === "");

  console.log(`Total locations: ${allLocations.length}`);
  console.log(`With place_id: ${withPlaceId.length}`);
  console.log(`Without place_id: ${withoutPlaceId.length}\n`);

  // Analyze by region
  console.log("=== Analysis by Region ===");
  const regionStats = new Map<string, { total: number; withPlaceId: number; withoutPlaceId: number }>();
  
  allLocations.forEach(loc => {
    const region = loc.region || "Unknown";
    if (!regionStats.has(region)) {
      regionStats.set(region, { total: 0, withPlaceId: 0, withoutPlaceId: 0 });
    }
    const stats = regionStats.get(region)!;
    stats.total++;
    if (loc.place_id && loc.place_id.trim() !== "") {
      stats.withPlaceId++;
    } else {
      stats.withoutPlaceId++;
    }
  });

  const sortedRegions = Array.from(regionStats.entries())
    .sort((a, b) => b[1].withoutPlaceId - a[1].withoutPlaceId);

  sortedRegions.forEach(([region, stats]) => {
    const pctWithout = ((stats.withoutPlaceId / stats.total) * 100).toFixed(1);
    console.log(`${region}:`);
    console.log(`  Total: ${stats.total}, With place_id: ${stats.withPlaceId}, Without: ${stats.withoutPlaceId} (${pctWithout}%)`);
  });

  // Analyze by category
  console.log("\n=== Analysis by Category ===");
  const categoryStats = new Map<string, { total: number; withPlaceId: number; withoutPlaceId: number }>();
  
  allLocations.forEach(loc => {
    const category = loc.category || "Unknown";
    if (!categoryStats.has(category)) {
      categoryStats.set(category, { total: 0, withPlaceId: 0, withoutPlaceId: 0 });
    }
    const stats = categoryStats.get(category)!;
    stats.total++;
    if (loc.place_id && loc.place_id.trim() !== "") {
      stats.withPlaceId++;
    } else {
      stats.withoutPlaceId++;
    }
  });

  const sortedCategories = Array.from(categoryStats.entries())
    .sort((a, b) => b[1].withoutPlaceId - a[1].withoutPlaceId);

  sortedCategories.forEach(([category, stats]) => {
    const pctWithout = ((stats.withoutPlaceId / stats.total) * 100).toFixed(1);
    console.log(`${category}:`);
    console.log(`  Total: ${stats.total}, With place_id: ${stats.withPlaceId}, Without: ${stats.withoutPlaceId} (${pctWithout}%)`);
  });

  // Analyze by source URL pattern
  console.log("\n=== Analysis by Source ===");
  const sourceStats = new Map<string, { total: number; withPlaceId: number; withoutPlaceId: number }>();
  
  allLocations.forEach(loc => {
    const sourceUrl = loc.seed_source_url || "";
    let source = "Unknown";
    
    if (sourceUrl.includes("jnto")) {
      source = "JNTO";
    } else if (sourceUrl.includes("hokkaido")) {
      source = "Hokkaido DMO";
    } else if (sourceUrl.includes("tohoku")) {
      source = "Tohoku Tourism";
    } else if (sourceUrl.includes("kansai")) {
      source = "Kansai Guide";
    } else if (sourceUrl.includes("chugoku")) {
      source = "Chugoku Tourism";
    } else if (sourceUrl.includes("shikoku")) {
      source = "Shikoku Tourism";
    } else if (sourceUrl.includes("kyushu")) {
      source = "Kyushu Tourism";
    } else if (sourceUrl.includes("okinawa")) {
      source = "Okinawa Tourism";
    } else if (sourceUrl.includes("central")) {
      source = "Central Japan DMO";
    } else if (sourceUrl) {
      source = "Other";
    }

    if (!sourceStats.has(source)) {
      sourceStats.set(source, { total: 0, withPlaceId: 0, withoutPlaceId: 0 });
    }
    const stats = sourceStats.get(source)!;
    stats.total++;
    if (loc.place_id && loc.place_id.trim() !== "") {
      stats.withPlaceId++;
    } else {
      stats.withoutPlaceId++;
    }
  });

  const sortedSources = Array.from(sourceStats.entries())
    .sort((a, b) => b[1].withoutPlaceId - a[1].withoutPlaceId);

  sortedSources.forEach(([source, stats]) => {
    const pctWithout = ((stats.withoutPlaceId / stats.total) * 100).toFixed(1);
    console.log(`${source}:`);
    console.log(`  Total: ${stats.total}, With place_id: ${stats.withPlaceId}, Without: ${stats.withoutPlaceId} (${pctWithout}%)`);
  });

  // Check if locations without place_id have coordinates
  console.log("\n=== Locations without place_id: Coordinate Analysis ===");
  const withCoords = withoutPlaceId.filter(loc => loc.coordinates && typeof loc.coordinates === 'object');
  const withoutCoords = withoutPlaceId.filter(loc => !loc.coordinates || typeof loc.coordinates !== 'object');
  
  console.log(`Locations without place_id:`);
  console.log(`  With coordinates: ${withCoords.length} (${((withCoords.length / withoutPlaceId.length) * 100).toFixed(1)}%)`);
  console.log(`  Without coordinates: ${withoutCoords.length} (${((withoutCoords.length / withoutPlaceId.length) * 100).toFixed(1)}%)`);
  
  if (withCoords.length > 0) {
    console.log(`\n  Sample locations WITH coordinates but NO place_id:`);
    withCoords.slice(0, 10).forEach(loc => {
      console.log(`    - ${loc.name} (${loc.city}, ${loc.region})`);
    });
  }
  
  if (withoutCoords.length > 0) {
    console.log(`\n  Sample locations WITHOUT coordinates and WITHOUT place_id:`);
    withoutCoords.slice(0, 10).forEach(loc => {
      console.log(`    - ${loc.name} (${loc.city}, ${loc.region})`);
    });
  }

  // Summary recommendations
  console.log("\n=== Summary & Recommendations ===");
  console.log(`1. ${withoutPlaceId.length} locations (${((withoutPlaceId.length / allLocations.length) * 100).toFixed(1)}%) are missing place_id`);
  console.log(`2. These locations are not visible on the explore page`);
  console.log(`3. Consider running enrichment scripts to add place_id:`);
  console.log(`   - scripts/enrich-scraped-data.ts (for scraped locations)`);
  console.log(`   - scripts/batch-geocode-locations.ts (for locations with coordinates)`);
  console.log(`4. Or remove the place_id filter from the explore page API`);
}

analyzePlaceIdPatterns().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
