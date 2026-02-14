#!/usr/bin/env tsx
/**
 * Seed hidden gem locations into Supabase
 *
 * Usage:
 *   npx tsx scripts/seed-hidden-gems.ts
 *   npx tsx scripts/seed-hidden-gems.ts --dry-run
 *
 * Requires:
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - NEXT_PUBLIC_SUPABASE_URL in .env.local
 *   - scripts/data/hidden-gems.json (compiled location data)
 */

import { config } from "dotenv";
const envResult = config({ path: ".env.local" });

if (envResult.error) {
  console.error("Failed to load .env.local:", envResult.error);
  process.exit(1);
}

import { readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 50;

// ----- Types -----

interface HiddenGemInput {
  name: string;
  nameJapanese: string | null;
  city: string;
  prefecture: string;
  region: string;
  category: string;
  description: string;
  shortDescription: string;
  lat: number | null;
  lng: number | null;
}

interface ExistingLocationCache {
  names: Map<string, Set<string>>; // normalized name -> set of regions
}

// ----- Helpers -----

function generateId(name: string, region: string): string {
  const slug = `${name}-${region}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const hash = createHash("md5")
    .update(`${name}-${region}`)
    .digest("hex")
    .substring(0, 8);
  return `${slug}-${hash}`;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[^\w\s-]/g, "");
}

// ----- Main -----

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== SEEDING HIDDEN GEMS ===");
  console.log("");

  // 1. Load hidden gems data
  const dataPath = join(process.cwd(), "scripts", "data", "hidden-gems.json");
  let gems: HiddenGemInput[];
  try {
    const raw = readFileSync(dataPath, "utf-8");
    gems = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read ${dataPath}`);
    console.error(
      "Make sure scripts/data/hidden-gems.json exists with the compiled data.",
    );
    process.exit(1);
  }

  console.log(`Loaded ${gems.length} hidden gem locations from JSON`);

  // 2. Validate categories
  const validCategories = new Set([
    "shrine",
    "temple",
    "museum",
    "landmark",
    "restaurant",
    "cafe",
    "bar",
    "market",
    "park",
    "garden",
    "beach",
    "mountain",
    "onsen",
    "wellness",
    "viewpoint",
    "entertainment",
    "nature",
  ]);

  const validRegions = new Set([
    "Hokkaido",
    "Tohoku",
    "Kanto",
    "Chubu",
    "Kansai",
    "Chugoku",
    "Shikoku",
    "Kyushu",
    "Okinawa",
  ]);

  const invalid = gems.filter(
    (g) => !validCategories.has(g.category) || !validRegions.has(g.region),
  );
  if (invalid.length > 0) {
    console.error("Invalid entries found:");
    for (const g of invalid) {
      if (!validCategories.has(g.category))
        console.error(`  "${g.name}": invalid category "${g.category}"`);
      if (!validRegions.has(g.region))
        console.error(`  "${g.name}": invalid region "${g.region}"`);
    }
    process.exit(1);
  }

  // 3. Connect to Supabase and load existing names for dedup
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is missing from .env.local");
    process.exit(1);
  }

  const { getServiceRoleClient } = await import(
    "@/lib/supabase/serviceRole"
  );
  const supabase = getServiceRoleClient();

  console.log("Fetching existing locations for dedup...");
  const cache: ExistingLocationCache = { names: new Map() };

  // Fetch all existing names+regions (paginated)
  let page = 0;
  let totalExisting = 0;
  while (true) {
    const { data, error } = await supabase
      .from("locations")
      .select("name, region")
      .order("name", { ascending: true })
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (error) {
      console.error("Failed to fetch existing locations:", error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    for (const loc of data) {
      const key = normalizeName(loc.name);
      if (!cache.names.has(key)) cache.names.set(key, new Set());
      cache.names.get(key)!.add(loc.region);
    }

    totalExisting += data.length;
    if (data.length < 1000) break;
    page++;
  }

  console.log(`Found ${totalExisting} existing locations`);

  // 4. Filter duplicates
  const toInsert: HiddenGemInput[] = [];
  let dupeCount = 0;

  for (const gem of gems) {
    const key = normalizeName(gem.name);
    const existingRegions = cache.names.get(key);
    if (existingRegions && existingRegions.has(gem.region)) {
      dupeCount++;
      continue;
    }
    toInsert.push(gem);
  }

  console.log(`Filtered ${dupeCount} duplicates`);
  console.log(`Will insert ${toInsert.length} new locations`);
  console.log("");

  if (toInsert.length === 0) {
    console.log("Nothing to insert. All locations already exist.");
    return;
  }

  // 5. Transform and insert
  const rows = toInsert.map((gem) => ({
    id: generateId(gem.name, gem.region),
    name: gem.name,
    name_japanese: gem.nameJapanese || null,
    region: gem.region,
    city: gem.city,
    prefecture: gem.prefecture,
    category: gem.category,
    image:
      "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800",
    description: gem.description,
    short_description: gem.shortDescription.substring(0, 200),
    coordinates:
      gem.lat && gem.lng ? { lat: gem.lat, lng: gem.lng } : null,
    timezone: "Asia/Tokyo",
    estimated_duration: null,
    min_budget: null,
    rating: null,
    review_count: null,
    place_id: null,
    business_status: "OPERATIONAL",
  }));

  if (DRY_RUN) {
    console.log("--- DRY RUN: Would insert these locations ---");
    const byRegion = new Map<string, number>();
    const byCat = new Map<string, number>();
    for (const r of rows) {
      byRegion.set(r.region, (byRegion.get(r.region) || 0) + 1);
      byCat.set(r.category, (byCat.get(r.category) || 0) + 1);
    }
    console.log("\nBy region:");
    for (const [region, count] of [...byRegion.entries()].sort())
      console.log(`  ${region}: ${count}`);
    console.log("\nBy category:");
    for (const [cat, count] of [...byCat.entries()].sort())
      console.log(`  ${cat}: ${count}`);
    console.log(`\nTotal: ${rows.length} locations`);
    console.log("\nFirst 5:");
    for (const r of rows.slice(0, 5))
      console.log(`  ${r.name} (${r.city}, ${r.region}) [${r.category}]`);
    return;
  }

  // Batch insert
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("locations").upsert(batch, {
      onConflict: "id",
      ignoreDuplicates: true,
    });

    if (error) {
      console.error(
        `Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`,
        error.message,
      );
      errors += batch.length;
    } else {
      inserted += batch.length;
      console.log(
        `Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rows.length / BATCH_SIZE)} (${inserted}/${rows.length})`,
      );
    }
  }

  console.log("");
  console.log("=== DONE ===");
  console.log(`Inserted: ${inserted}`);
  if (errors > 0) console.log(`Errors: ${errors}`);

  // Verify final count
  const { count } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true });
  console.log(`Total locations in DB: ${count}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
