#!/usr/bin/env tsx
/**
 * Fetches Google Places editorialSummary for locations without descriptions.
 *
 * Usage:
 *   npx tsx scripts/fetch-google-descriptions.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "fs";
import { join } from "path";

interface LocationRow {
  id: string;
  name: string;
  region: string;
  city: string;
  category: string;
  place_id: string | null;
  short_description: string | null;
  coordinates: { lat: number; lng: number } | null;
}

function truncateDescription(desc: string, maxLength: number = 200): string {
  const trimmed = desc.trim();
  if (trimmed.length <= maxLength) return trimmed;

  const truncated = trimmed.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(".");
  const lastExclaim = truncated.lastIndexOf("!");
  const lastQuestion = truncated.lastIndexOf("?");

  const lastSentence = Math.max(lastPeriod, lastExclaim, lastQuestion);

  if (lastSentence > maxLength * 0.5) {
    return truncated.substring(0, lastSentence + 1);
  }

  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + "...";
  }

  return truncated + "...";
}

async function fetchGoogleDescriptions() {
  console.log("=== Fetching Google Places Descriptions ===\n");

  const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
  const { fetchLocationDetails } = await import("@/lib/googlePlaces");
  const supabase = getServiceRoleClient();

  // Get locations without descriptions that have place_id
  const { data: locations, error } = await supabase
    .from("locations")
    .select("id, name, region, city, category, place_id, short_description, coordinates")
    .or("short_description.is.null,short_description.eq.")
    .not("place_id", "is", null)
    .limit(1000);

  if (error || !locations) {
    console.error("Failed to fetch locations:", error?.message);
    return;
  }

  console.log(`Found ${locations.length} locations without descriptions\n`);

  let updated = 0;
  let noEditorial = 0;
  let failed = 0;
  const needAI: { id: string; name: string; category: string; city: string }[] = [];

  // Process in batches to avoid rate limits
  const BATCH_SIZE = 10;
  const DELAY_MS = 1000; // 1 second between batches

  for (let i = 0; i < locations.length; i += BATCH_SIZE) {
    const batch = locations.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (loc: LocationRow) => {
      try {
        const locationObj = {
          id: loc.id,
          name: loc.name,
          region: loc.region,
          city: loc.city,
          category: loc.category,
          image: "",
          placeId: loc.place_id || undefined,
          coordinates: loc.coordinates || undefined,
        };

        const details = await fetchLocationDetails(locationObj);

        if (details.editorialSummary && details.editorialSummary.trim()) {
          const desc = truncateDescription(details.editorialSummary);

          const { error: updateError } = await supabase
            .from("locations")
            .update({ short_description: desc })
            .eq("id", loc.id);

          if (!updateError) {
            updated++;
          } else {
            failed++;
          }
        } else {
          noEditorial++;
          needAI.push({
            id: loc.id,
            name: loc.name,
            category: loc.category,
            city: loc.city,
          });
        }
      } catch (err) {
        failed++;
        needAI.push({
          id: loc.id,
          name: loc.name,
          category: loc.category,
          city: loc.city,
        });
      }
    }));

    // Progress update
    const processed = Math.min(i + BATCH_SIZE, locations.length);
    console.log(`Processed ${processed}/${locations.length} (updated: ${updated}, no editorial: ${noEditorial}, failed: ${failed})`);

    // Rate limit delay
    if (i + BATCH_SIZE < locations.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log("\n=== Summary ===\n");
  console.log(`Total processed: ${locations.length}`);
  console.log(`Updated with editorialSummary: ${updated}`);
  console.log(`No editorialSummary available: ${noEditorial}`);
  console.log(`Failed: ${failed}`);
  console.log(`Still need AI generation: ${needAI.length}`);

  if (needAI.length > 0) {
    const outputPath = join(process.cwd(), "tmp", "locations-need-ai-descriptions.json");
    writeFileSync(outputPath, JSON.stringify(needAI, null, 2));
    console.log(`\n📝 Saved ${needAI.length} locations needing AI descriptions to:`);
    console.log(`   ${outputPath}`);
  }
}

fetchGoogleDescriptions()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
