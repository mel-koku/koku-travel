#!/usr/bin/env tsx
/**
 * Identifies and optionally removes non-tourist locations from the database.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

// Patterns that indicate non-tourist locations
const NON_TOURIST_PATTERNS = [
  // Educational facilities (not historic)
  /playpourri/i,
  /kindergarten/i,
  /nursery(?!\s+garden)/i, // nursery but not nursery garden
  /preschool/i,
  /daycare/i,

  // Product listings (common from e-commerce scraping)
  /^\[.*\]\s+/,  // Starts with [PRODUCT TYPE]
  /\|\s*\w+\s+WARE$/i,  // Ends with "| XXXX WARE"

  // Generic businesses
  /\bltd\.?\b/i,
  /\binc\.?\b/i,
  /\bcorporation\b/i,
  /\bco\.,?\s*ltd/i,
];

// Keywords to check in names (more flexible matching)
const SUSPECT_KEYWORDS = [
  'playpourri',
  'kindergarten',
  'preschool',
  'daycare',
  'elementary school',
  'middle school',
  'high school',
];

async function findNonTourist() {
  const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
  const supabase = getServiceRoleClient();

  // Get all locations
  const { data: locations, error } = await supabase
    .from("locations")
    .select("id, name, category, city, region");

  if (error || !locations) {
    console.error("Failed to fetch locations:", error?.message);
    return;
  }

  console.log(`Total locations: ${locations.length}\n`);

  const nonTourist: typeof locations = [];

  for (const loc of locations) {
    let isNonTourist = false;
    let reason = "";

    // Check patterns
    for (const pattern of NON_TOURIST_PATTERNS) {
      if (pattern.test(loc.name)) {
        isNonTourist = true;
        reason = `Matches pattern: ${pattern}`;
        break;
      }
    }

    // Check keywords
    if (!isNonTourist) {
      const nameLower = loc.name.toLowerCase();
      for (const keyword of SUSPECT_KEYWORDS) {
        if (nameLower.includes(keyword)) {
          isNonTourist = true;
          reason = `Contains keyword: "${keyword}"`;
          break;
        }
      }
    }

    if (isNonTourist) {
      nonTourist.push(loc);
      console.log(`Found: ${loc.name}`);
      console.log(`  Category: ${loc.category} | City: ${loc.city}`);
      console.log(`  Reason: ${reason}`);
      console.log(`  ID: ${loc.id}`);
      console.log();
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total non-tourist locations found: ${nonTourist.length}`);

  if (nonTourist.length > 0) {
    console.log(`\nTo delete these locations, run with --delete flag`);
  }

  // Check for --delete flag
  if (process.argv.includes("--delete") && nonTourist.length > 0) {
    console.log(`\nDeleting ${nonTourist.length} locations...`);

    for (const loc of nonTourist) {
      const { error: delError } = await supabase
        .from("locations")
        .delete()
        .eq("id", loc.id);

      if (delError) {
        console.error(`Failed to delete ${loc.id}: ${delError.message}`);
      } else {
        console.log(`Deleted: ${loc.name}`);
      }
    }

    console.log("\nDeletion complete!");
  }
}

findNonTourist()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
