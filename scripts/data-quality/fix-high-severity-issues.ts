#!/usr/bin/env tsx
/**
 * Fix High Severity Data Quality Issues
 *
 * 1. ADDRESS_AS_DESC - Fetch proper descriptions from Google Places
 * 2. DUPLICATE_SAME_CITY - Merge/delete duplicates
 * 3. NAME_ID_MISMATCH - Verify data integrity
 *
 * Usage:
 *   npx tsx scripts/data-quality/fix-high-severity-issues.ts --dry-run
 *   npx tsx scripts/data-quality/fix-high-severity-issues.ts --fix
 */

import { config } from "dotenv";
config({ path: ".env.local", debug: false });

import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const doFix = args.includes("--fix");

if (!isDryRun && !doFix) {
  console.log("Usage:");
  console.log("  npx tsx scripts/data-quality/fix-high-severity-issues.ts --dry-run");
  console.log("  npx tsx scripts/data-quality/fix-high-severity-issues.ts --fix");
  process.exit(0);
}

// ============================================================
// ADDRESS_AS_DESC Issues
// ============================================================
const ADDRESS_AS_DESC_IDS = [
  "awa-washi-awa-traditional-handmade-japanese-paper-shikoku-8cdae3b0",
  "french-restaurant-soin-kansai-b029cf10",
  "wakayama-meditation-lunch-in-a-1-200-year-old-temple-kansai-4253104a",
  "forest-adventure-iya-shikoku-87067ffb",
  "apricot-picking-apricot-processing-experience-jam-and-chubu-f1b8c796",
  "maiko-dancing-girl-and-geisha-dress-up-experience-chubu-d41c89b5",
  "hakuba-ex-adventure-chubu-7cfa0ce4",
  "hanamomo-no-sato-peach-blossom-village-kuma-kogen-town-shikoku-7af20222",
  "paradise-in-the-sky-a-night-tour-of-the-best-starry-sk-chubu-da80b428",
  "higashikagawa-glove-gallery-shikoku-1748e9b1",
];

// Note: 138 Tower Park's description starts with "138" which triggered false positive - it's actually fine

// ============================================================
// DUPLICATE_SAME_CITY Issues - Keep the better entry, delete the other
// ============================================================
interface DuplicateFix {
  keep: string;
  delete: string;
  reason: string;
}

const DUPLICATE_FIXES: DuplicateFix[] = [
  {
    keep: "aguni-island-okinawa-a5df46d3",
    delete: "aguni-island-coastal-scenery-okinawa-9246f863",
    reason: "Keep primary entry, delete scenery-specific duplicate"
  },
  {
    keep: "arashiyama-kansai-7ef73f02",
    delete: "arashiyama-kanto-f1d3cdee",
    reason: "Keep Kansai entry (correct region), delete Kanto misclassification"
  },
  {
    keep: "dotonbori-kansai-31988d77",
    delete: "dotonbori-kanto-0a43c2f9",
    reason: "Keep Kansai entry (correct region), delete Kanto misclassification"
  },
  {
    keep: "hamahiga-island-okinawa-fb37a318",
    delete: "hamahiga-island-scenery-okinawa-84c08d2d",
    reason: "Keep primary entry, delete scenery-specific duplicate"
  },
  {
    keep: "himeji-castle-kansai-cefd6543",
    delete: "himeji-castle-outing-qr-1day-ticket-kansai-1c3684a5",
    reason: "Keep primary castle entry, delete ticket-specific entry"
  },
  {
    keep: "hirome-market-shikoku-f318fca6",
    delete: "tonkurimabushi-pork-and-chestnut-dish-shikoku-0f0070c1",
    reason: "Keep market entry, delete food-specific entry with wrong name"
  },
];

// ============================================================
// Helper Functions
// ============================================================

async function fetchGooglePlaceDetails(placeId: string): Promise<{ description: string } | null> {
  if (!GOOGLE_API_KEY) {
    console.log("  [SKIP] No GOOGLE_PLACES_API_KEY configured");
    return null;
  }

  try {
    const url = `https://places.googleapis.com/v1/places/${placeId}?fields=editorialSummary,generativeSummary&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": "editorialSummary,generativeSummary"
      }
    });

    if (!response.ok) {
      console.log(`  [ERROR] Google API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    const description = data.editorialSummary?.text || data.generativeSummary?.overview?.text || null;

    return description ? { description } : null;
  } catch (error) {
    console.log(`  [ERROR] Failed to fetch from Google: ${error}`);
    return null;
  }
}

async function generateDescription(name: string, city: string, category: string): Promise<string> {
  // Generate a basic description based on available info
  const categoryDescriptions: Record<string, string> = {
    museum: `A museum in ${city} showcasing local culture and history.`,
    restaurant: `A dining establishment in ${city} offering local cuisine.`,
    shrine: `A sacred Shinto shrine in ${city} with spiritual significance.`,
    landmark: `A notable landmark in ${city} worth visiting.`,
    entertainment: `An entertainment venue in ${city} offering activities and experiences.`,
    viewpoint: `A scenic viewpoint in ${city} with panoramic views.`,
    attraction: `A popular attraction in ${city} for visitors.`,
  };

  return categoryDescriptions[category] || `A notable location in ${city}.`;
}

// ============================================================
// Fix Functions
// ============================================================

async function fixAddressAsDesc() {
  console.log("\n" + "=".repeat(60));
  console.log("FIXING: ADDRESS_AS_DESC Issues");
  console.log("=".repeat(60));

  for (const id of ADDRESS_AS_DESC_IDS) {
    const { data: loc, error } = await supabase
      .from("locations")
      .select("id, name, description, city, category, place_id, editorial_summary")
      .eq("id", id)
      .single();

    if (error || !loc) {
      console.log(`\n[SKIP] ${id} - Not found`);
      continue;
    }

    console.log(`\n[${isDryRun ? "DRY-RUN" : "FIXING"}] ${loc.name} (${loc.city})`);
    console.log(`  Current desc: "${(loc.description || "").slice(0, 60)}..."`);

    let newDescription: string | null = null;

    // Try to get description from Google Places
    if (loc.place_id) {
      console.log(`  Fetching from Google Places (${loc.place_id})...`);
      const googleData = await fetchGooglePlaceDetails(loc.place_id);
      if (googleData?.description) {
        newDescription = googleData.description;
        console.log(`  Found: "${newDescription.slice(0, 60)}..."`);
      }
    }

    // Use editorial_summary if available
    if (!newDescription && loc.editorial_summary) {
      newDescription = loc.editorial_summary;
      console.log(`  Using editorial_summary: "${newDescription.slice(0, 60)}..."`);
    }

    // Generate a basic description
    if (!newDescription) {
      newDescription = await generateDescription(loc.name, loc.city, loc.category);
      console.log(`  Generated: "${newDescription}"`);
    }

    if (doFix && newDescription) {
      const { error: updateError } = await supabase
        .from("locations")
        .update({ description: newDescription })
        .eq("id", id);

      if (updateError) {
        console.log(`  [ERROR] Failed to update: ${updateError.message}`);
      } else {
        console.log(`  [SUCCESS] Updated description`);
      }
    }
  }
}

async function fixDuplicates() {
  console.log("\n" + "=".repeat(60));
  console.log("FIXING: DUPLICATE_SAME_CITY Issues");
  console.log("=".repeat(60));

  for (const fix of DUPLICATE_FIXES) {
    // Fetch both entries
    const { data: keepLoc } = await supabase
      .from("locations")
      .select("id, name, description, city, category")
      .eq("id", fix.keep)
      .single();

    const { data: deleteLoc } = await supabase
      .from("locations")
      .select("id, name, description, city, category")
      .eq("id", fix.delete)
      .single();

    if (!keepLoc) {
      console.log(`\n[SKIP] Keep entry not found: ${fix.keep}`);
      continue;
    }

    console.log(`\n[${isDryRun ? "DRY-RUN" : "FIXING"}] ${keepLoc.name} (${keepLoc.city})`);
    console.log(`  Keep: ${fix.keep}`);
    console.log(`  Delete: ${fix.delete}`);
    console.log(`  Reason: ${fix.reason}`);

    if (!deleteLoc) {
      console.log(`  [SKIP] Delete entry already removed`);
      continue;
    }

    // Check if delete entry has better data we should preserve
    if (deleteLoc.description && !keepLoc.description) {
      console.log(`  [INFO] Copying description from duplicate before deleting`);
      if (doFix) {
        await supabase
          .from("locations")
          .update({ description: deleteLoc.description })
          .eq("id", fix.keep);
      }
    }

    if (doFix) {
      const { error: deleteError } = await supabase
        .from("locations")
        .delete()
        .eq("id", fix.delete);

      if (deleteError) {
        console.log(`  [ERROR] Failed to delete: ${deleteError.message}`);
      } else {
        console.log(`  [SUCCESS] Deleted duplicate`);
      }
    }
  }
}

async function verifyNameIdMismatches() {
  console.log("\n" + "=".repeat(60));
  console.log("VERIFYING: NAME_ID_MISMATCH Issues");
  console.log("=".repeat(60));

  // These locations have correct names but IDs that don't match
  // The IDs cannot be changed (used as foreign keys), but we verify the data is good

  const { data: mismatches } = await supabase
    .from("locations")
    .select("id, name, description, city, category, place_id")
    .order("name");

  if (!mismatches) {
    console.log("[ERROR] Failed to fetch locations");
    return;
  }

  const issues: { id: string; name: string; city: string; problem: string }[] = [];

  for (const loc of mismatches) {
    const id = loc.id;
    const nameSlug = loc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20);
    const idBase = id.split("-").slice(0, -2).join("-");

    // Check if name is completely different from ID
    if (!idBase.includes(nameSlug.slice(0, 8)) && !nameSlug.includes(idBase.slice(0, 8))) {
      // Verify the location has good data
      if (!loc.description || loc.description.length < 20) {
        issues.push({
          id: loc.id,
          name: loc.name,
          city: loc.city,
          problem: "Missing or short description"
        });
      }
    }
  }

  console.log(`\nFound ${issues.length} NAME_ID_MISMATCH entries needing attention:\n`);

  for (const issue of issues.slice(0, 20)) {
    console.log(`  ${issue.name} (${issue.city})`);
    console.log(`    Problem: ${issue.problem}`);
    console.log(`    ID: ${issue.id}`);
  }

  if (issues.length > 20) {
    console.log(`\n  ... and ${issues.length - 20} more`);
  }

  // For mismatched entries with missing descriptions, try to fetch from Google Places
  if (doFix) {
    console.log("\nAttempting to fix descriptions for mismatched entries...");

    for (const issue of issues) {
      if (issue.problem.includes("description")) {
        const { data: loc } = await supabase
          .from("locations")
          .select("place_id, editorial_summary, category")
          .eq("id", issue.id)
          .single();

        if (loc?.place_id) {
          console.log(`\n  Fixing: ${issue.name}`);
          const googleData = await fetchGooglePlaceDetails(loc.place_id);

          let newDesc = googleData?.description || loc.editorial_summary;
          if (!newDesc) {
            newDesc = await generateDescription(issue.name, issue.city, loc.category);
          }

          if (newDesc) {
            const { error } = await supabase
              .from("locations")
              .update({ description: newDesc })
              .eq("id", issue.id);

            if (!error) {
              console.log(`    [SUCCESS] Updated description`);
            }
          }
        }
      }
    }
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log(isDryRun ? "DRY RUN - No changes will be made" : "APPLYING FIXES");
  console.log("=".repeat(60));

  await fixAddressAsDesc();
  await fixDuplicates();
  await verifyNameIdMismatches();

  console.log("\n" + "=".repeat(60));
  console.log("COMPLETE");
  console.log("=".repeat(60));

  if (isDryRun) {
    console.log("\nRun with --fix to apply changes");
  }
}

main().catch(console.error);
