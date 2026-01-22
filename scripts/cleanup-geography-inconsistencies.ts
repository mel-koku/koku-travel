/**
 * Geographic inconsistency cleanup script for location entries.
 *
 * Phase 1: Find and delete duplicate place_id entries with different regions
 *   - Same place appearing multiple times with conflicting geographic data
 *   - Keep entry with correct geographic data based on canonical prefecture→region mapping
 *
 * Phase 1B: Find and delete ALL duplicate place_id entries
 *   - Catches all same-place_id duplicates regardless of region consistency
 *   - Useful for cleaning up entries imported from multiple sources with different names
 *   - Examples: "Aizu Bukeyashiki" + "Aizu Samurai", "Adachi Museum" + "Adachi Museum of Art"
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
 *   npx tsx scripts/cleanup-geography-inconsistencies.ts --phase=1           # Duplicates with different regions
 *   npx tsx scripts/cleanup-geography-inconsistencies.ts --phase=1b          # ALL duplicate place_ids
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

/**
 * Japanese kanji prefecture names to English mapping.
 * Used to normalize prefectures stored in Japanese (e.g., "京都府" → "Kyoto")
 */
const JAPANESE_TO_ENGLISH_PREFECTURE: Record<string, string> = {
  // Hokkaido
  "北海道": "Hokkaido",

  // Tohoku
  "青森県": "Aomori",
  "岩手県": "Iwate",
  "宮城県": "Miyagi",
  "秋田県": "Akita",
  "山形県": "Yamagata",
  "福島県": "Fukushima",

  // Kanto
  "東京都": "Tokyo",
  "神奈川県": "Kanagawa",
  "千葉県": "Chiba",
  "埼玉県": "Saitama",
  "茨城県": "Ibaraki",
  "栃木県": "Tochigi",
  "群馬県": "Gunma",

  // Chubu
  "新潟県": "Niigata",
  "長野県": "Nagano",
  "山梨県": "Yamanashi",
  "静岡県": "Shizuoka",
  "愛知県": "Aichi",
  "岐阜県": "Gifu",
  "富山県": "Toyama",
  "石川県": "Ishikawa",
  "福井県": "Fukui",

  // Kansai
  "大阪府": "Osaka",
  "京都府": "Kyoto",
  "兵庫県": "Hyogo",
  "奈良県": "Nara",
  "和歌山県": "Wakayama",
  "滋賀県": "Shiga",
  "三重県": "Mie",

  // Chugoku
  "広島県": "Hiroshima",
  "岡山県": "Okayama",
  "山口県": "Yamaguchi",
  "島根県": "Shimane",
  "鳥取県": "Tottori",

  // Shikoku
  "徳島県": "Tokushima",
  "香川県": "Kagawa",
  "愛媛県": "Ehime",
  "高知県": "Kochi",

  // Kyushu
  "福岡県": "Fukuoka",
  "佐賀県": "Saga",
  "長崎県": "Nagasaki",
  "熊本県": "Kumamoto",
  "大分県": "Oita",
  "宮崎県": "Miyazaki",
  "鹿児島県": "Kagoshima",

  // Okinawa
  "沖縄県": "Okinawa",
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
  oldPrefecture?: string;
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

  // Get all locations with place_id using pagination to avoid 1000-row limit
  let allLocations: LocationRecord[] = [];
  let from = 0;
  const pageSize = 1000;

  console.log("  Fetching all locations with place_id...");

  while (true) {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, place_id, city, prefecture, region, primary_photo_url, rating, review_count")
      .not("place_id", "is", null)
      .range(from, from + pageSize - 1)
      .order("name");

    if (error) {
      console.error("Error fetching locations:", error);
      return { deleted: 0 };
    }

    if (!data || data.length === 0) break;

    allLocations = allLocations.concat(data as LocationRecord[]);
    console.log(`    Fetched ${allLocations.length} locations...`);
    from += pageSize;

    if (data.length < pageSize) break;
  }

  if (allLocations.length === 0) {
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
 * Check if two names are similar enough to be considered variants of the same place.
 * Returns true if names share significant common words/substrings (case-insensitive).
 */
function areNamesSimilar(name1: string, name2: string): boolean {
  // Normalize names: lowercase, remove punctuation
  const norm1 = name1.toLowerCase().replace(/[^\w\s-]/g, "");
  const norm2 = name2.toLowerCase().replace(/[^\w\s-]/g, "");

  // Split into words
  const words1 = norm1.split(/[\s-]+/).filter(w => w.length > 2);
  const words2 = norm2.split(/[\s-]+/).filter(w => w.length > 2);

  // Method 1: Direct word match
  const commonWords = words1.filter(w => words2.includes(w));
  if (commonWords.length > 0) {
    return true;
  }

  // Method 2: Check if any word from one name contains/is contained in any word from the other
  // This handles "Amanoiwato" (combined) vs "Amano" or "Iwato" (separate)
  for (const w1 of words1) {
    for (const w2 of words2) {
      // Check if one word contains the other (at least 4 chars to be meaningful)
      if (w1.length >= 4 && w2.length >= 4) {
        if (w1.includes(w2) || w2.includes(w1)) {
          return true;
        }
      }
    }
  }

  // Method 3: Check if the concatenated words match
  // "Amano Iwato" → "amanoiwato" should match "Amanoiwato"
  const concat1 = words1.join("");
  const concat2 = words2.join("");
  if (concat1.length >= 6 && concat2.length >= 6) {
    if (concat1.includes(concat2) || concat2.includes(concat1)) {
      return true;
    }
  }

  return false;
}

/**
 * Phase 1B: Find and delete TRUE duplicate place_id entries
 *
 * Unlike Phase 1 which only catches duplicates with different regions,
 * this phase finds same-place_id duplicates where names are clearly variants
 * of each other (share common words).
 *
 * This is conservative to avoid deleting entries that share a place_id due to
 * data import errors (e.g., "Kuma River" and "Hitoyoshi" shouldn't be treated
 * as duplicates even if they share a place_id).
 *
 * Example valid duplicates:
 * - "Aizu Bukeyashiki" + "Aizu Samurai" (share "Aizu")
 * - "Adachi Museum" + "Adachi Museum of Art" (share "Adachi", "Museum")
 */
async function phase1bAllDuplicatePlaceIds(isDryRun: boolean): Promise<{ deleted: number }> {
  console.log("\n=== Phase 1B: True Duplicate place_id Entries ===\n");

  // Get all locations with place_id using pagination to avoid 1000-row limit
  let allLocations: LocationRecord[] = [];
  let from = 0;
  const pageSize = 1000;

  console.log("  Fetching all locations with place_id...");

  while (true) {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, place_id, city, prefecture, region, primary_photo_url, rating, review_count")
      .not("place_id", "is", null)
      .range(from, from + pageSize - 1)
      .order("name");

    if (error) {
      console.error("Error fetching locations:", error);
      return { deleted: 0 };
    }

    if (!data || data.length === 0) break;

    allLocations = allLocations.concat(data as LocationRecord[]);
    console.log(`    Fetched ${allLocations.length} locations...`);
    from += pageSize;

    if (data.length < pageSize) break;
  }

  if (allLocations.length === 0) {
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

  // Find ALL groups with more than 1 entry
  const allDuplicateGroups: { placeId: string; entries: LocationRecord[] }[] = [];
  for (const [placeId, entries] of placeIdGroups.entries()) {
    if (entries.length > 1) {
      allDuplicateGroups.push({ placeId, entries });
    }
  }

  console.log(`  Found ${allDuplicateGroups.length} place_id groups with multiple entries\n`);

  // Filter to only true duplicates (names must form a connected similarity graph)
  const trueDuplicates: typeof allDuplicateGroups = [];
  const skippedGroups: typeof allDuplicateGroups = [];

  for (const group of allDuplicateGroups) {
    // For groups > 2, check if entries form a connected component via similarity
    // (i.e., A~B and B~C means A,B,C are all related even if A≁C directly)
    const n = group.entries.length;

    if (n === 2) {
      // Simple case: just check if the two are similar
      if (areNamesSimilar(group.entries[0].name, group.entries[1].name)) {
        trueDuplicates.push(group);
      } else {
        skippedGroups.push(group);
      }
    } else {
      // Build adjacency for similarity
      const similar: boolean[][] = Array(n).fill(null).map(() => Array(n).fill(false));
      for (let i = 0; i < n; i++) {
        similar[i][i] = true;
        for (let j = i + 1; j < n; j++) {
          const isSim = areNamesSimilar(group.entries[i].name, group.entries[j].name);
          similar[i][j] = isSim;
          similar[j][i] = isSim;
        }
      }

      // Check if all entries are in one connected component using BFS
      const visited = new Set<number>();
      const queue = [0];
      visited.add(0);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        for (let next = 0; next < n; next++) {
          if (!visited.has(next) && similar[curr][next]) {
            visited.add(next);
            queue.push(next);
          }
        }
      }

      if (visited.size === n) {
        trueDuplicates.push(group);
      } else {
        skippedGroups.push(group);
      }
    }
  }

  console.log(`  Filtered to ${trueDuplicates.length} true duplicates (names share common words)`);
  console.log(`  Skipped ${skippedGroups.length} groups (names too different - possible data errors)\n`);

  if (skippedGroups.length > 0) {
    console.log("  Skipped groups (same place_id but very different names):");
    for (const group of skippedGroups.slice(0, 5)) {
      console.log(`    - ${group.entries.map(e => `"${e.name}"`).join(" vs ")}`);
    }
    if (skippedGroups.length > 5) {
      console.log(`    ... and ${skippedGroups.length - 5} more`);
    }
    console.log("");
  }

  if (trueDuplicates.length === 0) {
    console.log("  ✓ No true duplicate place_id entries found");
    return { deleted: 0 };
  }

  const toDelete: DeletionLogEntry[] = [];
  const toKeep: LocationRecord[] = [];

  for (const group of trueDuplicates) {
    const firstEntry = group.entries[0];
    console.log(`  "${firstEntry.name}" (place_id: ${group.placeId.slice(0, 30)}...):`);
    console.log(`    Names: ${group.entries.map(e => `"${e.name}"`).join(", ")}`);

    // Calculate quality score for each entry
    // Enhanced scoring: prefer more descriptive names
    const scoredEntries = group.entries.map((entry) => {
      let score = calculateQualityScore(entry);
      // Bonus for longer, more descriptive names (up to 10 points)
      score += Math.min(entry.name.length, 50) / 5;
      return { entry, score };
    });

    // Sort by score descending
    scoredEntries.sort((a, b) => b.score - a.score);

    const best = scoredEntries[0];
    const rest = scoredEntries.slice(1);

    console.log(`    KEEP: "${best.entry.name}" (score=${best.score.toFixed(1)})`);
    toKeep.push(best.entry);

    for (const item of rest) {
      console.log(`    DELETE: "${item.entry.name}" (score=${item.score.toFixed(1)})`);
      toDelete.push({
        id: item.entry.id,
        name: item.entry.name,
        place_id: item.entry.place_id,
        oldRegion: item.entry.region,
        oldPrefecture: item.entry.prefecture,
        reason: `Duplicate place_id (kept "${best.entry.name}" with score ${best.score.toFixed(1)}, this had score ${item.score.toFixed(1)})`,
      });
    }
    console.log("");
  }

  console.log(`  Summary: ${toDelete.length} entries to delete, ${toKeep.length} entries to keep`);

  if (isDryRun || toDelete.length === 0) {
    return { deleted: toDelete.length };
  }

  // Log before deletion
  await logChanges(1.5, "delete", toDelete);

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

  console.log(`\n  ✓ Deleted ${deleted} duplicate entries`);
  return { deleted };
}

/**
 * Phase 2: Fix prefecture-region mismatches
 */
async function phase2PrefectureRegionMismatches(isDryRun: boolean): Promise<{ updated: number }> {
  console.log("\n=== Phase 2: Prefecture-Region Mismatch Fixes ===\n");

  // Get all locations with prefecture set using pagination to avoid 1000-row limit
  let allLocations: LocationRecord[] = [];
  let from = 0;
  const pageSize = 1000;

  console.log("  Fetching all locations with prefecture...");

  while (true) {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, place_id, city, prefecture, region, primary_photo_url, rating, review_count")
      .not("prefecture", "is", null)
      .range(from, from + pageSize - 1)
      .order("prefecture");

    if (error) {
      console.error("Error fetching locations:", error);
      return { updated: 0 };
    }

    if (!data || data.length === 0) break;

    allLocations = allLocations.concat(data as LocationRecord[]);
    console.log(`    Fetched ${allLocations.length} locations...`);
    from += pageSize;

    if (data.length < pageSize) break;
  }

  if (allLocations.length === 0) {
    console.log("  No locations with prefecture found");
    return { updated: 0 };
  }

  console.log(`  Checking ${allLocations.length} locations with prefecture set...\n`);

  // Find mismatches (including malformed prefectures that need normalization)
  const toUpdate: UpdateLogEntry[] = [];
  const updates: { id: string; newRegion: string; newPrefecture?: string }[] = [];

  for (const loc of allLocations) {
    if (!loc.prefecture) continue;

    // Normalize prefecture name before lookup
    const normalizedPrefecture = normalizePrefecture(loc.prefecture);
    const expectedRegion = PREFECTURE_TO_REGION[normalizedPrefecture];

    if (!expectedRegion) {
      // Still unknown after normalization
      console.log(`  ⚠️  Unknown prefecture: "${loc.prefecture}" (normalized: "${normalizedPrefecture}") for "${loc.name}"`);
      continue;
    }

    // Check if region OR prefecture needs updating
    const needsRegionUpdate = loc.region !== expectedRegion;
    const needsPrefectureUpdate = loc.prefecture !== normalizedPrefecture;

    if (needsRegionUpdate || needsPrefectureUpdate) {
      const changes: string[] = [];
      if (needsPrefectureUpdate) {
        changes.push(`prefecture: "${loc.prefecture}" → "${normalizedPrefecture}"`);
      }
      if (needsRegionUpdate) {
        changes.push(`region: "${loc.region}" → "${expectedRegion}"`);
      }

      toUpdate.push({
        id: loc.id,
        name: loc.name,
        place_id: loc.place_id,
        oldRegion: loc.region,
        newRegion: expectedRegion,
        oldPrefecture: needsPrefectureUpdate ? loc.prefecture : undefined,
        prefecture: normalizedPrefecture,
        reason: changes.join(", "),
      });
      updates.push({
        id: loc.id,
        newRegion: expectedRegion,
        newPrefecture: needsPrefectureUpdate ? normalizedPrefecture : undefined,
      });
    }
  }

  console.log(`  Found ${toUpdate.length} entries needing updates (region and/or prefecture normalization)\n`);

  if (toUpdate.length === 0) {
    console.log("  ✓ No prefecture-region mismatches found");
    return { updated: 0 };
  }

  // Group by normalized prefecture for cleaner output
  const byPrefecture = new Map<string, UpdateLogEntry[]>();
  for (const entry of toUpdate) {
    const existing = byPrefecture.get(entry.prefecture) || [];
    existing.push(entry);
    byPrefecture.set(entry.prefecture, existing);
  }

  // Count entries needing prefecture normalization vs region-only fixes
  const prefectureNormCount = toUpdate.filter(e => e.oldPrefecture).length;
  const regionOnlyCount = toUpdate.filter(e => !e.oldPrefecture).length;

  console.log(`  Breakdown:`);
  console.log(`    - Prefecture normalization needed: ${prefectureNormCount}`);
  console.log(`    - Region-only fixes: ${regionOnlyCount}\n`);

  for (const [prefecture, entries] of byPrefecture.entries()) {
    const expectedRegion = PREFECTURE_TO_REGION[prefecture];
    const needsNormalization = entries.filter(e => e.oldPrefecture);

    let label = `${prefecture} (→ ${expectedRegion}): ${entries.length} entries`;
    if (needsNormalization.length > 0) {
      label += ` (${needsNormalization.length} need prefecture normalization)`;
    }
    console.log(`  ${label}`);

    // Show first 3 examples with details
    for (const entry of entries.slice(0, 3)) {
      const details = entry.oldPrefecture
        ? `"${entry.oldPrefecture}" → "${entry.prefecture}", region: ${entry.oldRegion}`
        : `region: ${entry.oldRegion} → ${expectedRegion}`;
      console.log(`    - "${entry.name}" (${details})`);
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
  // Since updates may have different combinations of region/prefecture changes,
  // we update each entry individually for correctness
  let updated = 0;
  let prefecturesNormalized = 0;
  let regionsCorrected = 0;

  for (let i = 0; i < updates.length; i++) {
    const item = updates[i];
    const updateFields: { region?: string; prefecture?: string } = {};

    updateFields.region = item.newRegion;
    if (item.newPrefecture) {
      updateFields.prefecture = item.newPrefecture;
      prefecturesNormalized++;
    }
    if (toUpdate[i]?.oldRegion !== item.newRegion) {
      regionsCorrected++;
    }

    const { error: updateError } = await supabase
      .from("locations")
      .update(updateFields)
      .eq("id", item.id);

    if (updateError) {
      console.error(`  Error updating "${toUpdate[i]?.name}":`, updateError);
      continue;
    }

    updated++;

    // Progress indicator every 50 items
    if (updated % 50 === 0 || updated === updates.length) {
      console.log(`  ✓ Updated ${updated}/${updates.length} entries`);
    }
  }

  console.log(`\n  ✓ Fixed ${updated} entries:`);
  console.log(`    - Prefectures normalized: ${prefecturesNormalized}`);
  console.log(`    - Regions corrected: ${regionsCorrected}`);
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
 * Normalize prefecture name to standard English format.
 * Handles multiple input formats:
 * - Japanese kanji: "京都府" → "Kyoto", "東京都" → "Tokyo"
 * - Comma-separated: "Kikuchi, Kumamoto" → "Kumamoto"
 * - English with suffix: "Tokyo Prefecture" → "Tokyo", "Osaka-fu" → "Osaka"
 */
function normalizePrefecture(name: string): string {
  // 1. Check Japanese-to-English mapping first (full match)
  if (JAPANESE_TO_ENGLISH_PREFECTURE[name]) {
    return JAPANESE_TO_ENGLISH_PREFECTURE[name];
  }

  // 2. Handle comma-separated "City, Prefecture" format
  if (name.includes(", ")) {
    const parts = name.split(", ");
    const lastPart = parts[parts.length - 1];
    // Recursively normalize the extracted prefecture
    return normalizePrefecture(lastPart);
  }

  // 3. Apply suffix stripping for English variants
  const stripped = name
    .replace(/ Prefecture$/, "")
    .replace(/-ken$/, "")
    .replace(/-fu$/, "")
    .replace(/-to$/, "")
    .replace(/-dō$/, "")
    .replace(/県$/, "")
    .replace(/府$/, "")
    .replace(/都$/, "")
    .replace(/道$/, "");

  // 4. Check if stripped version matches Japanese mapping (e.g., "京都" without 府)
  if (JAPANESE_TO_ENGLISH_PREFECTURE[stripped + "県"] ||
      JAPANESE_TO_ENGLISH_PREFECTURE[stripped + "府"] ||
      JAPANESE_TO_ENGLISH_PREFECTURE[stripped + "都"] ||
      JAPANESE_TO_ENGLISH_PREFECTURE[stripped + "道"]) {
    // Find the matching key
    for (const suffix of ["県", "府", "都", "道"]) {
      const key = stripped + suffix;
      if (JAPANESE_TO_ENGLISH_PREFECTURE[key]) {
        return JAPANESE_TO_ENGLISH_PREFECTURE[key];
      }
    }
  }

  return stripped;
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
  const specificPhaseStr = phaseArg ? phaseArg.split("=")[1] : null;
  const specificPhase = specificPhaseStr && specificPhaseStr !== "1b" ? parseInt(specificPhaseStr) : null;
  const isPhase1b = specificPhaseStr === "1b";
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
  if (!specificPhase && !isPhase1b || specificPhase === 1) {
    const result = await phase1DuplicatePlaceIds(isDryRun);
    totalDeleted += result.deleted;
  }

  // Phase 1B: ALL duplicate place_ids (not just those with different regions)
  if (isPhase1b) {
    const result = await phase1bAllDuplicatePlaceIds(isDryRun);
    totalDeleted += result.deleted;
  }

  if (!specificPhase && !isPhase1b || specificPhase === 2) {
    const result = await phase2PrefectureRegionMismatches(isDryRun);
    totalUpdated += result.updated;
  }

  if (verifyWithApi && (!specificPhase && !isPhase1b || specificPhase === 3)) {
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
