#!/usr/bin/env tsx
/**
 * Fix low severity data quality issues
 *
 * 1. ALL_CAPS_NAME - Convert to proper title case
 * 2. EVENT_WRONG_CATEGORY - Fix category misclassification
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

const isDryRun = process.argv.includes("--dry-run");
const doFix = process.argv.includes("--fix");

if (!isDryRun && !doFix) {
  console.log("Usage:");
  console.log("  npx tsx scripts/data-quality/fix-low-severity-issues.ts --dry-run");
  console.log("  npx tsx scripts/data-quality/fix-low-severity-issues.ts --fix");
  process.exit(0);
}

// Manual name corrections for ALL_CAPS entries
// Some may be intentional (brand names, acronyms) so we handle case-by-case
const ALL_CAPS_FIXES: Record<string, string> = {
  "biwako-hall-kansai-fc1784f4": "Biwako Hall",
  "sendai-fishing-rod-tohoku-66864a48": "Carp Road", // Shopping street name
  "ceatec-ceatec-kanto-5da05c4d": "CEATEC", // Keep as acronym (tech conference)
  "cova-kakuda-kansai-e563594e": "Cova Kakuda",
  "eshikoto-where-fukui-s-great-things-happen-chubu-d3f099a4": "Eshikoto",
};

// Category fixes
const CATEGORY_FIXES: Record<string, string> = {
  // Atami Fireworks should be culture, not park
  // First need to find the ID
};

async function fixAllCapsNames() {
  console.log("\n" + "=".repeat(60));
  console.log("FIXING: ALL_CAPS_NAME Issues");
  console.log("=".repeat(60));

  for (const [id, newName] of Object.entries(ALL_CAPS_FIXES)) {
    const { data: loc } = await supabase
      .from("locations")
      .select("id, name, city")
      .eq("id", id)
      .single();

    if (!loc) {
      console.log(`\n[SKIP] ${id} - Not found`);
      continue;
    }

    console.log(`\n[${isDryRun ? "DRY-RUN" : "FIXING"}] ${loc.name} (${loc.city})`);
    console.log(`  Current: "${loc.name}"`);
    console.log(`  New: "${newName}"`);

    if (loc.name === newName) {
      console.log(`  [SKIP] Already correct`);
      continue;
    }

    if (doFix) {
      const { error } = await supabase
        .from("locations")
        .update({ name: newName })
        .eq("id", id);

      if (error) {
        console.log(`  [ERROR] ${error.message}`);
      } else {
        console.log(`  [SUCCESS] Updated`);
      }
    }
  }
}

async function fixWrongCategories() {
  console.log("\n" + "=".repeat(60));
  console.log("FIXING: EVENT_WRONG_CATEGORY Issues");
  console.log("=".repeat(60));

  // Find Atami Fireworks
  const { data: events } = await supabase
    .from("locations")
    .select("id, name, city, category")
    .ilike("name", "%fireworks%");

  for (const loc of events || []) {
    if (loc.category !== "culture" && loc.category !== "nature") {
      console.log(`\n[${isDryRun ? "DRY-RUN" : "FIXING"}] ${loc.name} (${loc.city})`);
      console.log(`  Current category: "${loc.category}"`);
      console.log(`  New category: "culture"`);

      if (doFix) {
        const { error } = await supabase
          .from("locations")
          .update({ category: "culture" })
          .eq("id", loc.id);

        if (error) {
          console.log(`  [ERROR] ${error.message}`);
        } else {
          console.log(`  [SUCCESS] Updated`);
        }
      }
    }
  }

  // Also check for other event-named locations in wrong categories
  const eventPatterns = ["Festival", "Matsuri", "Illumination", "Fireworks", "Parade"];

  for (const pattern of eventPatterns) {
    const { data: locs } = await supabase
      .from("locations")
      .select("id, name, city, category")
      .ilike("name", `%${pattern}%`)
      .not("category", "in", "(culture,nature)");

    for (const loc of locs || []) {
      console.log(`\n[${isDryRun ? "DRY-RUN" : "FIXING"}] ${loc.name} (${loc.city})`);
      console.log(`  Current category: "${loc.category}"`);
      console.log(`  New category: "culture"`);

      if (doFix) {
        const { error } = await supabase
          .from("locations")
          .update({ category: "culture" })
          .eq("id", loc.id);

        if (error) {
          console.log(`  [ERROR] ${error.message}`);
        } else {
          console.log(`  [SUCCESS] Updated`);
        }
      }
    }
  }
}

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log(isDryRun ? "DRY RUN - No changes will be made" : "APPLYING FIXES");
  console.log("=".repeat(60));

  await fixAllCapsNames();
  await fixWrongCategories();

  console.log("\n" + "=".repeat(60));
  console.log("COMPLETE");
  console.log("=".repeat(60));

  if (isDryRun) {
    console.log("\nRun with --fix to apply changes");
  }

  console.log("\n" + "=".repeat(60));
  console.log("NOTE: NAME_ID_MISMATCH issues cannot be fixed");
  console.log("=".repeat(60));
  console.log("These 59 locations have correct names but IDs that reflect");
  console.log("old names. IDs cannot be changed because they are used as:");
  console.log("  - Foreign keys in other tables");
  console.log("  - URL slugs for direct links");
  console.log("  - References in saved itineraries");
  console.log("\nThe data is correct - this is purely cosmetic.");
}

main().catch(console.error);
