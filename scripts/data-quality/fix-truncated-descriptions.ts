#!/usr/bin/env tsx
/**
 * Fix truncated/incomplete descriptions
 */

import { config } from "dotenv";
config({ path: ".env.local", debug: false });

import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: Missing env vars");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const isDryRun = process.argv.includes("--dry-run");
const doFix = process.argv.includes("--fix");

interface TruncatedLocation {
  id: string;
  name: string;
  city: string;
  category: string;
  description: string;
  place_id: string | null;
  editorial_summary: string | null;
}

async function fetchGooglePlaceDetails(placeId: string): Promise<string | null> {
  if (!GOOGLE_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?fields=editorialSummary,generativeSummary`,
      {
        headers: {
          "X-Goog-Api-Key": GOOGLE_API_KEY,
          "X-Goog-FieldMask": "editorialSummary,generativeSummary"
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.editorialSummary?.text || data.generativeSummary?.overview?.text || null;
  } catch {
    return null;
  }
}

async function findTruncatedDescriptions(): Promise<TruncatedLocation[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, description, city, category, place_id, editorial_summary")
    .order("name");

  if (error || !data) {
    console.error("Failed to fetch locations:", error?.message);
    return [];
  }

  const truncated: TruncatedLocation[] = [];

  for (const loc of data) {
    const desc = loc.description || "";
    // Check if description starts with lowercase (truncated/fragment)
    if (desc && /^[a-z]/.test(desc.trim())) {
      truncated.push({
        id: loc.id,
        name: loc.name,
        city: loc.city,
        category: loc.category,
        description: desc,
        place_id: loc.place_id,
        editorial_summary: loc.editorial_summary
      });
    }
  }

  return truncated;
}

// Manually crafted descriptions for known truncated entries
const MANUAL_DESCRIPTIONS: Record<string, string> = {
  "cycling-chugoku-fdb64358": "Cycle Hiroshima offers cycling tours along the Tobishima Kaido, a scenic cycling route connecting seven islands in the Seto Inland Sea. The route features stunning coastal views, historic villages, and peaceful island-hopping experiences.",
  "epson-teamlab-kanto-ee41d680": "teamLab Borderless at Azabudai Hills is an immersive digital art museum where visitors can wander through boundary-less artworks that flow from room to room. The interactive installations respond to visitors' presence, creating unique experiences each time.",
  "bingaki-wall-made-of-sulfuric-acid-bottles-chugoku-5f419fa0": "Gallery Yamaguchi kunst-bau is a contemporary art gallery in Yamaguchi showcasing innovative works including pieces made from recycled industrial materials. The gallery features rotating exhibitions and supports local and international artists.",
  "kimono-week-chugoku-bd9754a8": "Hagi Castle Town is a beautifully preserved samurai district where the traditional atmosphere of the Edo period has been maintained. Visitors can walk along white-walled streets lined with historic residences and workshops producing Hagi-yaki pottery.",
  "waterfront-caf-s-along-chugoku-73360f54": "Hiroshima Breakfast offers a selection of waterfront cafes along the Kyobashi River, where visitors can enjoy morning meals with scenic views of the riverbank. These cafes serve both traditional Japanese breakfast options and Western-style fare."
};

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log(isDryRun ? "DRY RUN - Finding truncated descriptions" : "FIXING truncated descriptions");
  console.log("=".repeat(60));

  const truncated = await findTruncatedDescriptions();

  console.log(`\nFound ${truncated.length} locations with truncated descriptions:\n`);

  for (const loc of truncated) {
    console.log(`[${isDryRun ? "DRY-RUN" : "FIXING"}] ${loc.name} (${loc.city})`);
    console.log(`  Current: "${loc.description.slice(0, 80)}..."`);
    console.log(`  ID: ${loc.id}`);

    let newDescription: string | null = null;

    // 1. Check for manual description
    if (MANUAL_DESCRIPTIONS[loc.id]) {
      newDescription = MANUAL_DESCRIPTIONS[loc.id];
      console.log(`  Source: Manual description`);
    }
    // 2. Try Google Places
    else if (loc.place_id) {
      const googleDesc = await fetchGooglePlaceDetails(loc.place_id);
      if (googleDesc) {
        newDescription = googleDesc;
        console.log(`  Source: Google Places`);
      }
    }
    // 3. Use editorial_summary if available
    if (!newDescription && loc.editorial_summary) {
      newDescription = loc.editorial_summary;
      console.log(`  Source: Editorial summary`);
    }

    if (newDescription) {
      console.log(`  New: "${newDescription.slice(0, 80)}..."`);

      if (doFix) {
        const { error } = await supabase
          .from("locations")
          .update({ description: newDescription })
          .eq("id", loc.id);

        if (error) {
          console.log(`  [ERROR] ${error.message}`);
        } else {
          console.log(`  [SUCCESS] Updated`);
        }
      }
    } else {
      console.log(`  [SKIP] No replacement found`);
    }

    console.log("");
  }

  console.log("=".repeat(60));
  console.log("COMPLETE");
  console.log("=".repeat(60));

  if (isDryRun) {
    console.log("\nRun with --fix to apply changes");
  }
}

main().catch(console.error);
