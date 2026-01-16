#!/usr/bin/env tsx
/**
 * Script to update location descriptions using a hybrid approach:
 * 1. Use scraped descriptions from enriched data
 * 2. Fetch Google Places editorialSummary for the rest
 * 3. Report locations that still need AI-generated descriptions
 *
 * Usage:
 *   npx tsx scripts/update-descriptions.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

interface EnrichedLocation {
  name: string;
  region: string;
  description?: string;
  placeId?: string;
  googleDisplayName?: string;
}

function generateLocationId(name: string, region: string): string {
  const normalized = `${name}-${region}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const hash = createHash("md5").update(`${name}-${region}`).digest("hex").substring(0, 8);
  return `${normalized}-${hash}`;
}

/**
 * Truncate description to a reasonable length for short_description field
 */
function truncateDescription(desc: string, maxLength: number = 200): string {
  const trimmed = desc.trim();
  if (trimmed.length <= maxLength) return trimmed;

  // Try to cut at a sentence boundary
  const truncated = trimmed.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(".");
  const lastExclaim = truncated.lastIndexOf("!");
  const lastQuestion = truncated.lastIndexOf("?");

  const lastSentence = Math.max(lastPeriod, lastExclaim, lastQuestion);

  if (lastSentence > maxLength * 0.5) {
    return truncated.substring(0, lastSentence + 1);
  }

  // Cut at last space and add ellipsis
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + "...";
  }

  return truncated + "...";
}

async function updateDescriptions() {
  console.log("=== Location Description Update ===\n");

  const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
  const supabase = getServiceRoleClient();

  // Step 1: Load enriched data with scraped descriptions
  console.log("Step 1: Loading scraped descriptions from enriched data...\n");

  const enrichedPath = join(process.cwd(), "tmp", "enriched-locations.json");
  const fileContent = readFileSync(enrichedPath, "utf-8");
  const enrichedData = JSON.parse(fileContent);
  const enrichedLocations: EnrichedLocation[] = enrichedData.locations;

  // Build map of ID -> description
  const descriptionMap = new Map<string, string>();
  for (const loc of enrichedLocations) {
    if (loc.description && loc.description.trim()) {
      const id = generateLocationId(loc.name, loc.region);
      descriptionMap.set(id, truncateDescription(loc.description));
    }
  }

  console.log(`Found ${descriptionMap.size} scraped descriptions\n`);

  // Get all locations from database
  const { data: dbLocations, error: fetchError } = await supabase
    .from("locations")
    .select("id, name, short_description, place_id");

  if (fetchError || !dbLocations) {
    console.error("Failed to fetch locations:", fetchError?.message);
    return;
  }

  console.log(`Database has ${dbLocations.length} locations\n`);

  // Categorize locations
  const alreadyHasDesc = dbLocations.filter(l => l.short_description && l.short_description.trim());
  const needsDesc = dbLocations.filter(l => !l.short_description || !l.short_description.trim());

  console.log(`Already have descriptions: ${alreadyHasDesc.length}`);
  console.log(`Need descriptions: ${needsDesc.length}\n`);

  // Step 1a: Update with scraped descriptions
  console.log("Step 1a: Updating locations with scraped descriptions...\n");

  let updatedFromScraped = 0;
  const stillNeedDesc: typeof dbLocations = [];

  for (const loc of needsDesc) {
    const scrapedDesc = descriptionMap.get(loc.id);
    if (scrapedDesc) {
      const { error } = await supabase
        .from("locations")
        .update({ short_description: scrapedDesc })
        .eq("id", loc.id);

      if (!error) {
        updatedFromScraped++;
        if (updatedFromScraped % 50 === 0) {
          console.log(`  Updated ${updatedFromScraped} from scraped data...`);
        }
      }
    } else {
      stillNeedDesc.push(loc);
    }
  }

  console.log(`\n✅ Updated ${updatedFromScraped} locations with scraped descriptions\n`);

  // Step 2: Fetch Google editorialSummary for remaining locations
  console.log(`Step 2: Fetching Google editorialSummary for ${stillNeedDesc.length} locations...\n`);

  const locationsWithPlaceId = stillNeedDesc.filter(l => l.place_id);
  const locationsWithoutPlaceId = stillNeedDesc.filter(l => !l.place_id);

  console.log(`  With place_id (can fetch from Google): ${locationsWithPlaceId.length}`);
  console.log(`  Without place_id (need AI generation): ${locationsWithoutPlaceId.length}\n`);

  // Check place_details cache for editorialSummary
  let updatedFromGoogle = 0;
  const needAIGeneration: { id: string; name: string; placeId?: string }[] = [];

  for (const loc of locationsWithPlaceId) {
    // Check if we have cached place details with editorialSummary
    const { data: placeDetails } = await supabase
      .from("place_details")
      .select("payload")
      .eq("location_id", loc.id)
      .maybeSingle();

    const editorial = placeDetails?.payload?.editorialSummary;

    if (editorial && editorial.trim()) {
      const { error } = await supabase
        .from("locations")
        .update({ short_description: truncateDescription(editorial) })
        .eq("id", loc.id);

      if (!error) {
        updatedFromGoogle++;
        if (updatedFromGoogle % 20 === 0) {
          console.log(`  Updated ${updatedFromGoogle} from Google cache...`);
        }
      }
    } else {
      needAIGeneration.push({ id: loc.id, name: loc.name, placeId: loc.place_id });
    }
  }

  // Add locations without place_id to AI generation list
  for (const loc of locationsWithoutPlaceId) {
    needAIGeneration.push({ id: loc.id, name: loc.name });
  }

  console.log(`\n✅ Updated ${updatedFromGoogle} locations with Google editorialSummary\n`);

  // Step 3: Report what needs AI generation
  console.log("=== Summary ===\n");
  console.log(`Total locations: ${dbLocations.length}`);
  console.log(`Already had descriptions: ${alreadyHasDesc.length}`);
  console.log(`Updated from scraped data: ${updatedFromScraped}`);
  console.log(`Updated from Google: ${updatedFromGoogle}`);
  console.log(`Still need AI generation: ${needAIGeneration.length}\n`);

  if (needAIGeneration.length > 0) {
    // Save list of locations needing AI generation
    const outputPath = join(process.cwd(), "tmp", "locations-need-descriptions.json");
    writeFileSync(outputPath, JSON.stringify(needAIGeneration, null, 2));
    console.log(`📝 Saved list of ${needAIGeneration.length} locations needing AI descriptions to:`);
    console.log(`   ${outputPath}\n`);

    console.log("Sample locations needing AI generation:");
    for (const loc of needAIGeneration.slice(0, 10)) {
      console.log(`  - ${loc.name}`);
    }
    if (needAIGeneration.length > 10) {
      console.log(`  ... and ${needAIGeneration.length - 10} more`);
    }
  }
}

updateDescriptions()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
