/**
 * Geographic inconsistency cleanup script for location entries.
 *
 * Phase 1: Find and delete duplicate place_id entries with different regions
 *   - Same place appearing multiple times with conflicting geographic data
 *   - Keep entry with correct geographic data based on canonical prefecture→region mapping
 *
 * Phase 2: Fix prefecture-region mismatches
 *   - Update region to match canonical mapping when prefecture is set
 *
 * Phase 3: Google Places API verification and enrichment
 *   - 3A: Fix locations with NULL prefecture
 *   - 3B: Fix locations where city = region name (e.g., "Kanto" instead of actual city)
 *   - 3C: Verify and fix region based on prefecture from API
 *
 * Usage:
 *   npx tsx scripts/cleanup-geography-inconsistencies.ts --dry-run           # Preview all changes
 *   npx tsx scripts/cleanup-geography-inconsistencies.ts --phase=1           # Duplicates only
 *   npx tsx scripts/cleanup-geography-inconsistencies.ts --phase=2           # Mismatches only
 *   npx tsx scripts/cleanup-geography-inconsistencies.ts --verify-with-api   # Include API verification
 *   npx tsx scripts/cleanup-geography-inconsistencies.ts --verify-with-api --limit=50  # Limit API calls
 *   npx tsx scripts/cleanup-geography-inconsistencies.ts --phase=3 --verify-with-api   # API phase only
 *   npx tsx scripts/cleanup-geography-inconsistencies.ts               # Full cleanup (phases 1-2)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Canonical mapping of Japan's 47 prefectures to their regions
const PREFECTURE_TO_REGION: Record<string, string> = {
  // Hokkaido (1 prefecture)
  "Hokkaido": "Hokkaido",

  // Tohoku (6 prefectures)
  "Aomori": "Tohoku",
  "Iwate": "Tohoku",
  "Miyagi": "Tohoku",
  "Akita": "Tohoku",
  "Yamagata": "Tohoku",
  "Fukushima": "Tohoku",

  // Kanto (7 prefectures)
  "Tokyo": "Kanto",
  "Kanagawa": "Kanto",
  "Chiba": "Kanto",
  "Saitama": "Kanto",
  "Ibaraki": "Kanto",
  "Tochigi": "Kanto",
  "Gunma": "Kanto",

  // Chubu (9 prefectures)
  "Niigata": "Chubu",
  "Nagano": "Chubu",
  "Yamanashi": "Chubu",
  "Shizuoka": "Chubu",
  "Aichi": "Chubu",
  "Gifu": "Chubu",
  "Toyama": "Chubu",
  "Ishikawa": "Chubu",
  "Fukui": "Chubu",

  // Kansai (7 prefectures)
  "Osaka": "Kansai",
  "Kyoto": "Kansai",
  "Hyogo": "Kansai",
  "Nara": "Kansai",
  "Wakayama": "Kansai",
  "Shiga": "Kansai",
  "Mie": "Kansai",

  // Chugoku (5 prefectures)
  "Hiroshima": "Chugoku",
  "Okayama": "Chugoku",
  "Yamaguchi": "Chugoku",
  "Shimane": "Chugoku",
  "Tottori": "Chugoku",

  // Shikoku (4 prefectures)
  "Tokushima": "Shikoku",
  "Kagawa": "Shikoku",
  "Ehime": "Shikoku",
  "Kochi": "Shikoku",

  // Kyushu (7 prefectures)
  "Fukuoka": "Kyushu",
  "Saga": "Kyushu",
  "Nagasaki": "Kyushu",
  "Kumamoto": "Kyushu",
  "Oita": "Kyushu",
  "Miyazaki": "Kyushu",
  "Kagoshima": "Kyushu",

  // Okinawa (1 prefecture)
  "Okinawa": "Okinawa",
};

// All valid region names
const VALID_REGIONS = [
  "Hokkaido",
  "Tohoku",
  "Kanto",
  "Chubu",
  "Kansai",
  "Chugoku",
  "Shikoku",
  "Kyushu",
  "Okinawa",
];

interface LocationRecord {
  id: string;
  name: string;
  place_id: string | null;
  city: string | null;
  prefecture: string | null;
  region: string | null;
  primary_photo_url: string | null;
  rating: number | null;
  review_count: number | null;
}

interface DeletionLogEntry {
  id: string;
  name: string;
  place_id: string | null;
  oldRegion: string | null;
  oldPrefecture: string | null;
  reason: string;
}

interface UpdateLogEntry {
  id: string;
  name: string;
  place_id: string | null;
  oldRegion: string | null;
  newRegion: string;
  prefecture: string;
  reason: string;
}

interface GeographyLog {
  timestamp: string;
  phase: number;
  action: "delete" | "update";
  entries: (DeletionLogEntry | UpdateLogEntry)[];
}

async function getLocationCount(): Promise<number> {
  const { count } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true });
  return count || 0;
}

function getLogFilePath(): string {
  return `scripts/geography-cleanup-log-${new Date().toISOString().split("T")[0]}.json`;
}

async function logChanges(
  phase: number,
  action: "delete" | "update",
  entries: (DeletionLogEntry | UpdateLogEntry)[]
): Promise<void> {
  const logEntry: GeographyLog = {
    timestamp: new Date().toISOString(),
    phase,
    action,
    entries,
  };

  const logFile = getLogFilePath();
  let existingLogs: GeographyLog[] = [];

  if (fs.existsSync(logFile)) {
    existingLogs = JSON.parse(fs.readFileSync(logFile, "utf-8"));
  }

  existingLogs.push(logEntry);
  fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));
  console.log(`  Logged ${entries.length} ${action}s to ${logFile}`);
}

/**
 * Calculate quality score for a location entry.
 * Used to determine which entry to keep when duplicates exist.
 */
function calculateQualityScore(loc: LocationRecord): number {
  let score = 0;

  // Geographic consistency (prefecture matches expected region): +100 points
  if (loc.prefecture && loc.region) {
    const expectedRegion = PREFECTURE_TO_REGION[loc.prefecture];
    if (expectedRegion === loc.region) {
      score += 100;
    }
  }

  // Has primary_photo_url: +20 points
  if (loc.primary_photo_url) {
    score += 20;
  }

  // Has prefecture: +15 points
  if (loc.prefecture) {
    score += 15;
  }

  // Has city: +10 points
  if (loc.city) {
    score += 10;
  }

  // Has rating: +5 points
  if (loc.rating != null) {
    score += 5;
  }

  // Has review_count: +5 points
  if (loc.review_count != null && loc.review_count > 0) {
    score += 5;
  }

  return score;
}

/**
 * Phase 1: Find and delete duplicate place_id entries with different regions
 */
async function phase1DuplicatePlaceIds(isDryRun: boolean): Promise<{ deleted: number }> {
  console.log("\n=== Phase 1: Duplicate place_id with Different Regions ===\n");

  // Get all locations with place_id
  const { data: allLocations, error: fetchError } = await supabase
    .from("locations")
    .select("id, name, place_id, city, prefecture, region, primary_photo_url, rating, review_count")
    .not("place_id", "is", null)
    .order("name");

  if (fetchError) {
    console.error("Error fetching locations:", fetchError);
    return { deleted: 0 };
  }

  if (!allLocations || allLocations.length === 0) {
    console.log("  No locations with place_id found");
    return { deleted: 0 };
  }

  console.log(`  Analyzing ${allLocations.length} locations with place_id...\n`);

  // Group by place_id
  const placeIdGroups = new Map<string, LocationRecord[]>();
  for (const loc of allLocations) {
    if (!loc.place_id) continue;
    const existing = placeIdGroups.get(loc.place_id) || [];
    existing.push(loc);
    placeIdGroups.set(loc.place_id, existing);
  }

  // Find groups with different regions
  const inconsistentGroups: { placeId: string; entries: LocationRecord[] }[] = [];
  for (const [placeId, entries] of placeIdGroups.entries()) {
    const uniqueRegions = new Set(entries.map((e) => e.region).filter(Boolean));
    if (uniqueRegions.size > 1) {
      inconsistentGroups.push({ placeId, entries });
    }
  }

  console.log(`  Found ${inconsistentGroups.length} place_id groups with region inconsistencies\n`);

  if (inconsistentGroups.length === 0) {
    console.log("  ✓ No duplicate place_id with different regions found");
    return { deleted: 0 };
  }

  const toDelete: DeletionLogEntry[] = [];
  const toKeep: LocationRecord[] = [];

  for (const group of inconsistentGroups) {
    console.log(`  "${group.entries[0].name}" (place_id: ${group.placeId.slice(0, 30)}...):`);

    // Score each entry
    const scoredEntries = group.entries.map((entry) => ({
      entry,
      score: calculateQualityScore(entry),
    }));

    // Sort by score descending
    scoredEntries.sort((a, b) => b.score - a.score);

    const best = scoredEntries[0];
    const rest = scoredEntries.slice(1);

    console.log(`    KEEP: region="${best.entry.region}", prefecture="${best.entry.prefecture}", score=${best.score}`);
    toKeep.push(best.entry);

    for (const item of rest) {
      console.log(`    DELETE: region="${item.entry.region}", prefecture="${item.entry.prefecture}", score=${item.score}`);
      toDelete.push({
        id: item.entry.id,
        name: item.entry.name,
        place_id: item.entry.place_id,
        oldRegion: item.entry.region,
        oldPrefecture: item.entry.prefecture,
        reason: `Duplicate place_id with inconsistent region (kept entry with score ${best.score}, this had score ${item.score})`,
      });
    }
    console.log("");
  }

  console.log(`  Summary: ${toDelete.length} entries to delete, ${toKeep.length} entries to keep`);

  if (isDryRun || toDelete.length === 0) {
    return { deleted: toDelete.length };
  }

  // Log before deletion
  await logChanges(1, "delete", toDelete);

  // Execute deletion in batches
  const batchSize = 100;
  let deleted = 0;

  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    const idsToDelete = batch.map((entry) => entry.id);

    const { error: deleteError } = await supabase
      .from("locations")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      console.error(`  Error deleting batch ${i / batchSize + 1}:`, deleteError);
      continue;
    }

    deleted += batch.length;
    console.log(`  ✓ Deleted batch ${Math.floor(i / batchSize) + 1} (${deleted}/${toDelete.length})`);
  }

  console.log(`\n  ✓ Deleted ${deleted} duplicate entries with region inconsistencies`);
  return { deleted };
}

/**
 * Phase 2: Fix prefecture-region mismatches
 */
async function phase2PrefectureRegionMismatches(isDryRun: boolean): Promise<{ updated: number }> {
  console.log("\n=== Phase 2: Prefecture-Region Mismatch Fixes ===\n");

  // Get all locations with prefecture set
  const { data: allLocations, error: fetchError } = await supabase
    .from("locations")
    .select("id, name, place_id, city, prefecture, region, primary_photo_url, rating, review_count")
    .not("prefecture", "is", null)
    .order("prefecture");

  if (fetchError) {
    console.error("Error fetching locations:", fetchError);
    return { updated: 0 };
  }

  if (!allLocations || allLocations.length === 0) {
    console.log("  No locations with prefecture found");
    return { updated: 0 };
  }

  console.log(`  Checking ${allLocations.length} locations with prefecture set...\n`);

  // Find mismatches
  const toUpdate: UpdateLogEntry[] = [];
  const updates: { id: string; newRegion: string }[] = [];

  for (const loc of allLocations) {
    if (!loc.prefecture) continue;

    const expectedRegion = PREFECTURE_TO_REGION[loc.prefecture];
    if (!expectedRegion) {
      // Unknown prefecture - could be normalized differently
      console.log(`  ⚠️  Unknown prefecture: "${loc.prefecture}" for "${loc.name}"`);
      continue;
    }

    if (loc.region !== expectedRegion) {
      toUpdate.push({
        id: loc.id,
        name: loc.name,
        place_id: loc.place_id,
        oldRegion: loc.region,
        newRegion: expectedRegion,
        prefecture: loc.prefecture,
        reason: `Prefecture "${loc.prefecture}" should be in region "${expectedRegion}", not "${loc.region}"`,
      });
      updates.push({ id: loc.id, newRegion: expectedRegion });
    }
  }

  console.log(`  Found ${toUpdate.length} prefecture-region mismatches\n`);

  if (toUpdate.length === 0) {
    console.log("  ✓ No prefecture-region mismatches found");
    return { updated: 0 };
  }

  // Group by prefecture for cleaner output
  const byPrefecture = new Map<string, UpdateLogEntry[]>();
  for (const entry of toUpdate) {
    const existing = byPrefecture.get(entry.prefecture) || [];
    existing.push(entry);
    byPrefecture.set(entry.prefecture, existing);
  }

  for (const [prefecture, entries] of byPrefecture.entries()) {
    const expectedRegion = PREFECTURE_TO_REGION[prefecture];
    console.log(`  ${prefecture} (→ ${expectedRegion}): ${entries.length} entries to fix`);

    // Show first 3 examples
    for (const entry of entries.slice(0, 3)) {
      console.log(`    - "${entry.name}" (was: ${entry.oldRegion})`);
    }
    if (entries.length > 3) {
      console.log(`    ... and ${entries.length - 3} more`);
    }
  }

  if (isDryRun) {
    return { updated: toUpdate.length };
  }

  // Log before update
  await logChanges(2, "update", toUpdate);

  // Execute updates in batches
  const batchSize = 100;
  let updated = 0;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);

    // Group by new region for efficient updates
    const byNewRegion = new Map<string, string[]>();
    for (const item of batch) {
      const existing = byNewRegion.get(item.newRegion) || [];
      existing.push(item.id);
      byNewRegion.set(item.newRegion, existing);
    }

    for (const [newRegion, ids] of byNewRegion.entries()) {
      const { error: updateError } = await supabase
        .from("locations")
        .update({ region: newRegion })
        .in("id", ids);

      if (updateError) {
        console.error(`  Error updating to region "${newRegion}":`, updateError);
        continue;
      }

      updated += ids.length;
    }

    console.log(`  ✓ Updated batch ${Math.floor(i / batchSize) + 1} (${updated}/${updates.length})`);
  }

  console.log(`\n  ✓ Fixed ${updated} prefecture-region mismatches`);
  return { updated };
}

// Region names that might incorrectly appear as city values
const REGION_NAMES = [
  "Hokkaido",
  "Tohoku",
  "Kanto",
  "Chubu",
  "Kansai",
  "Chugoku",
  "Shikoku",
  "Kyushu",
  "Okinawa",
];

interface ApiVerificationResult {
  verified: number;
  updated: number;
  prefectureFixed: number;
  cityFixed: number;
  regionFixed: number;
}

/**
 * Normalize prefecture name from Google Places API
 * "Tokyo Prefecture" → "Tokyo", "Osaka-fu" → "Osaka", etc.
 */
function normalizePrefecture(name: string): string {
  return name
    .replace(/ Prefecture$/, "")
    .replace(/-ken$/, "")
    .replace(/-fu$/, "")
    .replace(/-to$/, "")
    .replace(/-dō$/, "")
    .replace(/県$/, "")
    .replace(/府$/, "")
    .replace(/都$/, "")
    .replace(/道$/, "");
}

/**
 * Call Google Places API to get address components for a place
 */
async function fetchPlaceDetails(placeId: string): Promise<{
  prefecture: string | null;
  city: string | null;
  error?: string;
}> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_components&key=${googlePlacesApiKey}`
    );

    if (!response.ok) {
      return { prefecture: null, city: null, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.status === "INVALID_REQUEST" || data.status === "NOT_FOUND") {
      return { prefecture: null, city: null, error: data.status };
    }

    if (data.status !== "OK" || !data.result?.address_components) {
      return { prefecture: null, city: null, error: data.status || "No address data" };
    }

    let prefecture: string | null = null;
    let city: string | null = null;

    for (const component of data.result.address_components) {
      // Prefecture (administrative_area_level_1)
      if (component.types.includes("administrative_area_level_1")) {
        prefecture = normalizePrefecture(component.long_name);
      }
      // City: prefer locality, fallback to administrative_area_level_2
      if (component.types.includes("locality")) {
        city = component.long_name;
      } else if (!city && component.types.includes("administrative_area_level_2")) {
        city = component.long_name;
      }
      // Some places use sublocality_level_1 for city-like areas
      if (!city && component.types.includes("sublocality_level_1")) {
        city = component.long_name;
      }
    }

    return { prefecture, city };
  } catch (error) {
    return { prefecture: null, city: null, error: String(error) };
  }
}

/**
 * Phase 3: Google Places API verification and enrichment
 *
 * Handles three categories of issues:
 * 3A: Locations with NULL prefecture - need API lookup
 * 3B: Locations with city = region name (e.g., "Kanto") - need correct city from API
 * 3C: Locations with prefecture but wrong region - verify and fix
 */
async function phase3ApiVerification(isDryRun: boolean, apiLimit: number = 100): Promise<ApiVerificationResult> {
  console.log("\n=== Phase 3: Google Places API Verification ===\n");

  if (!googlePlacesApiKey) {
    console.log("  ⚠️  GOOGLE_PLACES_API_KEY not set - skipping API verification");
    console.log("  Set GOOGLE_PLACES_API_KEY in .env.local to enable this phase");
    return { verified: 0, updated: 0, prefectureFixed: 0, cityFixed: 0, regionFixed: 0 };
  }

  // 3A: Find locations with NULL prefecture
  const { data: nullPrefecture, error: error1 } = await supabase
    .from("locations")
    .select("id, name, place_id, city, prefecture, region")
    .not("place_id", "is", null)
    .is("prefecture", null);

  // 3B: Find locations where city is a region name
  const { data: cityIsRegion, error: error2 } = await supabase
    .from("locations")
    .select("id, name, place_id, city, prefecture, region")
    .not("place_id", "is", null)
    .in("city", REGION_NAMES);

  if (error1 || error2) {
    console.error("Error fetching candidates:", error1 || error2);
    return { verified: 0, updated: 0, prefectureFixed: 0, cityFixed: 0, regionFixed: 0 };
  }

  // Combine and deduplicate candidates
  const candidateMap = new Map<string, LocationRecord>();

  for (const loc of (nullPrefecture || [])) {
    if (loc.place_id) candidateMap.set(loc.id, loc as LocationRecord);
  }
  for (const loc of (cityIsRegion || [])) {
    if (loc.place_id) candidateMap.set(loc.id, loc as LocationRecord);
  }

  const candidates = Array.from(candidateMap.values());

  console.log(`  Found candidates for API verification:`);
  console.log(`    - NULL prefecture: ${nullPrefecture?.length || 0}`);
  console.log(`    - City = region name: ${cityIsRegion?.length || 0}`);
  console.log(`    - Total unique: ${candidates.length}`);
  console.log(`    - API limit: ${apiLimit}\n`);

  if (candidates.length === 0) {
    console.log("  ✓ No locations need API verification");
    return { verified: 0, updated: 0, prefectureFixed: 0, cityFixed: 0, regionFixed: 0 };
  }

  // Limit candidates to API limit
  const toProcess = candidates.slice(0, apiLimit);

  if (isDryRun) {
    console.log(`  [DRY RUN] Would verify ${toProcess.length} locations via Google Places API:\n`);

    const nullPrefList = toProcess.filter(l => !l.prefecture);
    const cityRegionList = toProcess.filter(l => l.city && REGION_NAMES.includes(l.city));

    if (nullPrefList.length > 0) {
      console.log(`  Locations with NULL prefecture (${nullPrefList.length}):`);
      for (const loc of nullPrefList.slice(0, 5)) {
        console.log(`    - "${loc.name}" (city: ${loc.city}, region: ${loc.region})`);
      }
      if (nullPrefList.length > 5) console.log(`    ... and ${nullPrefList.length - 5} more`);
    }

    if (cityRegionList.length > 0) {
      console.log(`\n  Locations with city = region (${cityRegionList.length}):`);
      for (const loc of cityRegionList.slice(0, 5)) {
        console.log(`    - "${loc.name}" (city: ${loc.city} ← wrong)`);
      }
      if (cityRegionList.length > 5) console.log(`    ... and ${cityRegionList.length - 5} more`);
    }

    return {
      verified: toProcess.length,
      updated: 0,
      prefectureFixed: nullPrefList.length,
      cityFixed: cityRegionList.length,
      regionFixed: 0
    };
  }

  // Process candidates with API calls
  let verified = 0;
  let updated = 0;
  let prefectureFixed = 0;
  let cityFixed = 0;
  let regionFixed = 0;
  const updates: UpdateLogEntry[] = [];
  const errors: { name: string; error: string }[] = [];

  console.log(`  Processing ${toProcess.length} locations...\n`);

  for (let i = 0; i < toProcess.length; i++) {
    const loc = toProcess[i];
    if (!loc.place_id) continue;

    // Progress indicator every 10 items
    if (i > 0 && i % 10 === 0) {
      console.log(`  Progress: ${i}/${toProcess.length} (${updated} updated)`);
    }

    // Rate limit: 5 requests per second
    await new Promise((resolve) => setTimeout(resolve, 200));

    const { prefecture, city, error } = await fetchPlaceDetails(loc.place_id);

    if (error) {
      errors.push({ name: loc.name, error });
      continue;
    }

    verified++;

    // Determine what needs to be updated
    const updateFields: { prefecture?: string; city?: string; region?: string } = {};
    const changes: string[] = [];

    // Fix prefecture if NULL or different
    if (prefecture && !loc.prefecture) {
      updateFields.prefecture = prefecture;
      changes.push(`prefecture: NULL → "${prefecture}"`);
      prefectureFixed++;
    }

    // Fix city if it's a region name
    if (city && loc.city && REGION_NAMES.includes(loc.city)) {
      updateFields.city = city;
      changes.push(`city: "${loc.city}" → "${city}"`);
      cityFixed++;
    }

    // Fix region based on prefecture
    if (prefecture) {
      const expectedRegion = PREFECTURE_TO_REGION[prefecture];
      if (expectedRegion && expectedRegion !== loc.region) {
        updateFields.region = expectedRegion;
        changes.push(`region: "${loc.region}" → "${expectedRegion}"`);
        regionFixed++;
      }
    }

    // Apply updates if any
    if (Object.keys(updateFields).length > 0) {
      const { error: updateError } = await supabase
        .from("locations")
        .update(updateFields)
        .eq("id", loc.id);

      if (updateError) {
        console.error(`  ✗ Error updating "${loc.name}":`, updateError.message);
        continue;
      }

      updated++;
      console.log(`  ✓ "${loc.name}": ${changes.join(", ")}`);

      updates.push({
        id: loc.id,
        name: loc.name,
        place_id: loc.place_id,
        oldRegion: loc.region,
        newRegion: updateFields.region || loc.region || "",
        prefecture: updateFields.prefecture || loc.prefecture || "",
        reason: `API verification: ${changes.join("; ")}`,
      });
    }
  }

  // Log updates
  if (updates.length > 0) {
    await logChanges(3, "update", updates);
  }

  // Report errors
  if (errors.length > 0) {
    console.log(`\n  ⚠️  ${errors.length} API errors:`);
    for (const err of errors.slice(0, 5)) {
      console.log(`    - "${err.name}": ${err.error}`);
    }
    if (errors.length > 5) {
      console.log(`    ... and ${errors.length - 5} more`);
    }
  }

  console.log(`\n  ✓ Verified ${verified} locations, updated ${updated}`);
  console.log(`    - Prefecture fixed: ${prefectureFixed}`);
  console.log(`    - City fixed: ${cityFixed}`);
  console.log(`    - Region fixed: ${regionFixed}`);

  return { verified, updated, prefectureFixed, cityFixed, regionFixed };
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const verifyWithApi = args.includes("--verify-with-api");
  const phaseArg = args.find((a) => a.startsWith("--phase="));
  const specificPhase = phaseArg ? parseInt(phaseArg.split("=")[1]) : null;
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const apiLimit = limitArg ? parseInt(limitArg.split("=")[1]) : 100;

  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║      Koku Travel - Geographic Inconsistency Cleanup Script     ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  if (isDryRun) {
    console.log("\n🔍 DRY RUN MODE - No changes will be made\n");
  }

  const beforeCount = await getLocationCount();
  console.log(`Current total locations: ${beforeCount}`);

  let totalDeleted = 0;
  let totalUpdated = 0;

  // Run phases based on arguments
  if (!specificPhase || specificPhase === 1) {
    const result = await phase1DuplicatePlaceIds(isDryRun);
    totalDeleted += result.deleted;
  }

  if (!specificPhase || specificPhase === 2) {
    const result = await phase2PrefectureRegionMismatches(isDryRun);
    totalUpdated += result.updated;
  }

  if (verifyWithApi && (!specificPhase || specificPhase === 3)) {
    const result = await phase3ApiVerification(isDryRun, apiLimit);
    totalUpdated += result.updated;
  }

  // Final summary
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║                           SUMMARY                              ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  if (isDryRun) {
    console.log(`\n📊 Would delete: ${totalDeleted} entries`);
    console.log(`📊 Would update: ${totalUpdated} entries`);
    console.log(`📊 Before: ${beforeCount} → After: ~${beforeCount - totalDeleted}`);
    console.log("\n[DRY RUN] No changes made. Remove --dry-run to execute.");
  } else {
    const afterCount = await getLocationCount();
    console.log(`\n📊 Before: ${beforeCount} locations`);
    console.log(`📊 After:  ${afterCount} locations`);
    console.log(`📊 Deleted: ${beforeCount - afterCount} entries`);
    console.log(`📊 Updated: ${totalUpdated} entries`);

    if (beforeCount - afterCount !== totalDeleted) {
      console.log(`\n⚠️  Note: Expected to delete ${totalDeleted}, actually deleted ${beforeCount - afterCount}`);
      console.log("   (Some entries may have been deleted by other operations)");
    }
  }

  console.log("\n✅ Done!");
}

main().catch(console.error);
