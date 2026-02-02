/**
 * Normalization script to fix duplicate prefecture names in the database.
 *
 * The database has inconsistent prefecture naming from different data sources:
 * - "Aichi" vs "Aichi-ken"
 * - "Kyoto" vs "Kyoto-fu"
 * - "Osaka" vs "Osaka-fu"
 * - "Tokyo" vs "Tokyo-to"
 *
 * This script normalizes all prefectures to simple names (e.g., "Aichi" not "Aichi-ken")
 * for cleaner display to English-speaking users.
 *
 * Usage:
 *   npx tsx scripts/normalize-prefectures.ts --dry-run    # Preview changes (default)
 *   npx tsx scripts/normalize-prefectures.ts --execute    # Actually update records
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Normalize a prefecture name by removing Japanese administrative suffixes.
 * - Remove "-ken" suffix (most prefectures)
 * - Remove "-fu" suffix (Osaka-fu, Kyoto-fu)
 * - Remove "-to" suffix (Tokyo-to)
 * - Keep "Hokkaido" as-is (special case where -do is part of the name)
 */
function normalizePrefecture(name: string): string {
  if (!name) return name;

  // Hokkaido is a special case - the "-do" is part of its actual name
  if (name.toLowerCase() === "hokkaido") {
    return name;
  }

  return name
    .replace(/-ken$/i, "")
    .replace(/-fu$/i, "")
    .replace(/-to$/i, "")
    .replace(/\s+Prefecture$/i, "")
    .trim();
}

interface PrefectureGroup {
  normalized: string;
  variants: { original: string; count: number }[];
  totalCount: number;
}

async function fetchDistinctPrefectures(): Promise<Map<string, number>> {
  const prefectureCounts = new Map<string, number>();

  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("locations")
      .select("prefecture")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Error fetching locations:", error);
      throw error;
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      if (row.prefecture) {
        const count = prefectureCounts.get(row.prefecture) || 0;
        prefectureCounts.set(row.prefecture, count + 1);
      }
    }

    from += pageSize;
    if (data.length < pageSize) break;
  }

  return prefectureCounts;
}

function groupPrefectures(prefectureCounts: Map<string, number>): PrefectureGroup[] {
  const groups = new Map<string, PrefectureGroup>();

  for (const [prefecture, count] of prefectureCounts) {
    const normalized = normalizePrefecture(prefecture);

    if (!groups.has(normalized)) {
      groups.set(normalized, {
        normalized,
        variants: [],
        totalCount: 0,
      });
    }

    const group = groups.get(normalized)!;
    group.variants.push({ original: prefecture, count });
    group.totalCount += count;
  }

  // Sort variants within each group (put the normalized form first if it exists)
  for (const group of groups.values()) {
    group.variants.sort((a, b) => {
      // Prefer the normalized form
      if (a.original === group.normalized) return -1;
      if (b.original === group.normalized) return 1;
      // Then sort by count descending
      return b.count - a.count;
    });
  }

  return Array.from(groups.values()).sort((a, b) => a.normalized.localeCompare(b.normalized));
}

async function updatePrefectures(
  fromValue: string,
  toValue: string
): Promise<{ updated: number; error: string | null }> {
  const { data, error } = await supabase
    .from("locations")
    .update({ prefecture: toValue })
    .eq("prefecture", fromValue)
    .select("id");

  if (error) {
    return { updated: 0, error: error.message };
  }

  return { updated: data?.length || 0, error: null };
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes("--execute");
  const dryRun = !execute;

  console.log("======================================================================");
  console.log("       Koku Travel - Prefecture Normalization Script                 ");
  console.log("======================================================================\n");

  if (dryRun) {
    console.log("MODE: DRY RUN (no changes will be made)");
    console.log("Use --execute to actually update records\n");
  } else {
    console.log("MODE: EXECUTE (records will be updated!)\n");
  }

  // Fetch all distinct prefectures with counts
  console.log("Fetching all prefecture values...");
  const prefectureCounts = await fetchDistinctPrefectures();
  console.log(`Found ${prefectureCounts.size} distinct prefecture values\n`);

  // Group by normalized name
  const groups = groupPrefectures(prefectureCounts);

  // Find groups with duplicates (more than one variant)
  const duplicateGroups = groups.filter((g) => g.variants.length > 1);

  if (duplicateGroups.length === 0) {
    console.log("No prefecture duplicates found! All prefectures are already normalized.");
    return;
  }

  // Show all prefectures grouped by normalized name
  console.log("===================================================================");
  console.log("PREFECTURE GROUPS (showing variants that need normalization)");
  console.log("===================================================================\n");

  let totalToUpdate = 0;

  for (const group of duplicateGroups) {
    console.log(`"${group.normalized}" (${group.totalCount} total locations)`);
    for (const variant of group.variants) {
      const needsUpdate = variant.original !== group.normalized;
      const marker = needsUpdate ? " → will update" : " (canonical)";
      console.log(`  - "${variant.original}": ${variant.count} locations${marker}`);
      if (needsUpdate) {
        totalToUpdate += variant.count;
      }
    }
    console.log("");
  }

  // Summary
  console.log("===================================================================");
  console.log("SUMMARY");
  console.log("===================================================================\n");
  console.log(`Total distinct prefecture values: ${prefectureCounts.size}`);
  console.log(`Groups with duplicates: ${duplicateGroups.length}`);
  console.log(`Locations to update: ${totalToUpdate}`);

  if (dryRun) {
    console.log("\n===================================================================");
    console.log("DRY RUN COMPLETE - No changes made");
    console.log("===================================================================\n");
    console.log("To actually update prefectures, run:");
    console.log("  npx tsx scripts/normalize-prefectures.ts --execute");
  } else {
    console.log("\n===================================================================");
    console.log("EXECUTING UPDATES...");
    console.log("===================================================================\n");

    let totalUpdated = 0;
    const errors: string[] = [];

    for (const group of duplicateGroups) {
      for (const variant of group.variants) {
        if (variant.original === group.normalized) continue;

        console.log(`Updating "${variant.original}" → "${group.normalized}"...`);
        const result = await updatePrefectures(variant.original, group.normalized);

        if (result.error) {
          errors.push(`Failed to update "${variant.original}": ${result.error}`);
          console.log(`  ERROR: ${result.error}`);
        } else {
          totalUpdated += result.updated;
          console.log(`  Updated ${result.updated} locations`);
        }
      }
    }

    console.log("\n===================================================================");
    console.log("UPDATE COMPLETE");
    console.log("===================================================================\n");
    console.log(`Total locations updated: ${totalUpdated}`);

    if (errors.length > 0) {
      console.log(`\nErrors (${errors.length}):`);
      for (const err of errors) {
        console.log(`  - ${err}`);
      }
    }

    // Verify the update
    console.log("\nVerifying...");
    const newCounts = await fetchDistinctPrefectures();
    const newGroups = groupPrefectures(newCounts);
    const remainingDuplicates = newGroups.filter((g) => g.variants.length > 1);

    if (remainingDuplicates.length === 0) {
      console.log("All prefectures are now normalized!");
    } else {
      console.log(`WARNING: ${remainingDuplicates.length} groups still have duplicates`);
    }
  }
}

main().catch(console.error);
