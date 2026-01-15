#!/usr/bin/env tsx
/**
 * Script to identify locations that cannot resolve their Google Place ID.
 * These locations will cause errors when users try to view their details.
 * 
 * Usage:
 *   npm run tsx scripts/check-invalid-place-ids.ts
 *   npm run tsx scripts/check-invalid-place-ids.ts -- --delete
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import type { Location } from "@/types/location";
import { canResolvePlaceId } from "@/lib/googlePlaces";

async function main() {
  const supabase = getServiceRoleClient();
  const shouldDelete = process.argv.includes("--delete");

  console.log("🔍 Checking locations for invalid Place IDs...\n");

  // Fetch all locations
  const { data: locations, error } = await supabase
    .from("locations")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("❌ Error fetching locations:", error);
    process.exit(1);
  }

  if (!locations || locations.length === 0) {
    console.log("✅ No locations found.");
    return;
  }

  console.log(`📊 Checking ${locations.length} locations...\n`);

  const invalidLocations: Array<{ id: string; name: string; city: string; region: string }> = [];
  let checked = 0;

  for (const row of locations) {
    const location: Location = {
      id: row.id,
      name: row.name,
      region: row.region,
      city: row.city,
      category: row.category,
      image: row.image,
      minBudget: row.min_budget ?? undefined,
      estimatedDuration: row.estimated_duration ?? undefined,
      operatingHours: row.operating_hours ?? undefined,
      recommendedVisit: row.recommended_visit ?? undefined,
      preferredTransitModes: row.preferred_transit_modes ?? undefined,
      coordinates: row.coordinates ?? undefined,
      timezone: row.timezone ?? undefined,
      shortDescription: row.short_description ?? undefined,
      rating: row.rating ?? undefined,
      reviewCount: row.review_count ?? undefined,
      placeId: row.place_id ?? undefined,
    };

    checked++;
    process.stdout.write(`\r⏳ Checking ${checked}/${locations.length}... ${location.name}`);

    const isValid = await canResolvePlaceId(location);
    if (!isValid) {
      invalidLocations.push({
        id: location.id,
        name: location.name,
        city: location.city,
        region: location.region,
      });
    }

    // Add a small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("\n");

  if (invalidLocations.length === 0) {
    console.log("✅ All locations have valid Place IDs!");
    return;
  }

  console.log(`\n❌ Found ${invalidLocations.length} locations without valid Place IDs:\n`);
  invalidLocations.forEach((loc) => {
    console.log(`  - ${loc.name} (${loc.city}, ${loc.region}) [ID: ${loc.id}]`);
  });

  if (shouldDelete) {
    console.log("\n🗑️  Deleting invalid locations...");
    const idsToDelete = invalidLocations.map((loc) => loc.id);

    // Delete in batches to avoid query size limits
    const batchSize = 100;
    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      const { error: deleteError } = await supabase
        .from("locations")
        .delete()
        .in("id", batch);

      if (deleteError) {
        console.error(`❌ Error deleting batch ${i / batchSize + 1}:`, deleteError);
      }
    }

    console.log(`✅ Deleted ${invalidLocations.length} invalid locations.`);
  } else {
    console.log("\n💡 To delete these locations, run:");
    console.log("   npm run tsx scripts/check-invalid-place-ids.ts -- --delete");
  }
}

main().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
