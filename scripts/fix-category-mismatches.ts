/**
 * Fix script for category miscategorizations in location data.
 *
 * This script updates location categories based on pattern matching of names.
 * It handles:
 * 1. High confidence fixes: Clear landmarks categorized as "food" (castles, shrines, temples)
 * 2. Medium confidence fixes: Generic "culture" categories → specific types
 * 3. Low confidence fixes: Other category mismatches (manual review recommended)
 *
 * Usage:
 *   npx tsx scripts/fix-category-mismatches.ts --dry-run           # Preview all changes
 *   npx tsx scripts/fix-category-mismatches.ts --phase=1           # High confidence only
 *   npx tsx scripts/fix-category-mismatches.ts --phase=2           # Medium confidence
 *   npx tsx scripts/fix-category-mismatches.ts --phase=3           # Low confidence
 *   npx tsx scripts/fix-category-mismatches.ts                     # All phases
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Pattern-based category detection rules
const CATEGORY_PATTERNS: { pattern: RegExp; expectedCategory: string; description: string }[] = [
  // Landmarks - highest priority (should NEVER be food)
  { pattern: /castle|jo\b|城/i, expectedCategory: "landmark", description: "Castles" },
  { pattern: /palace|imperial|御所/i, expectedCategory: "landmark", description: "Palaces" },
  { pattern: /tower|塔/i, expectedCategory: "landmark", description: "Towers" },
  { pattern: /gate|mon\b|門/i, expectedCategory: "landmark", description: "Gates" },

  // Shrines - very clear pattern
  { pattern: /shrine|jinja|jingu|taisha|torii|神社|大社|神宮/i, expectedCategory: "shrine", description: "Shinto shrines" },

  // Temples - very clear pattern
  { pattern: /temple|-ji\b|dera|\bin\b|寺|院/i, expectedCategory: "temple", description: "Buddhist temples" },

  // Museums - clear pattern
  { pattern: /museum|gallery|art center|美術館|博物館/i, expectedCategory: "museum", description: "Museums" },

  // Parks and Gardens
  { pattern: /park|garden|botanical|koen|公園|庭園/i, expectedCategory: "park", description: "Parks/gardens" },

  // Viewpoints
  { pattern: /observatory|observation deck|viewpoint|lookout|展望/i, expectedCategory: "viewpoint", description: "Viewpoints" },

  // Markets
  { pattern: /market|arcade|shotengai|市場|商店街/i, expectedCategory: "market", description: "Markets" },

  // Historic
  { pattern: /historic district|heritage|ruins|ancient|samurai residence|edo period|meiji era|old town|traditional village|historical site/i, expectedCategory: "historic", description: "Historic sites" },

  // Restaurants (only if NOT a landmark)
  { pattern: /restaurant|ramen|sushi|izakaya|cafe|café|coffee shop|bakery|dining|eatery|レストラン|食堂/i, expectedCategory: "restaurant", description: "Restaurants/cafes" },

  // Bars (only if NOT a landmark)
  { pattern: /\bbar\b|pub|sake bar|brewery|酒/i, expectedCategory: "bar", description: "Bars/breweries" },
];

// Categories that indicate dining
const DINING_CATEGORIES = ["food", "restaurant", "bar", "cafe"];

// Categories for landmarks (should never be food)
const LANDMARK_CATEGORIES = ["shrine", "temple", "landmark", "museum", "historic", "park", "viewpoint"];

// Patterns that indicate non-restaurant
const NON_RESTAURANT_PATTERNS = /castle|shrine|temple|museum|park|garden|tower|palace|observatory|gate|bridge|historic|heritage|ruins|monument|jo\b|jinja|jingu|dera|taisha|-ji\b|城|神社|寺|塔|門/i;

interface LocationRecord {
  id: string;
  name: string;
  category: string | null;
}

interface CategoryFix {
  id: string;
  name: string;
  oldCategory: string | null;
  newCategory: string;
  reason: string;
  confidence: "high" | "medium" | "low";
}

interface FixLog {
  timestamp: string;
  phase: number;
  fixes: CategoryFix[];
}

function getLogFilePath(): string {
  return `scripts/category-fix-log-${new Date().toISOString().split("T")[0]}.json`;
}

async function logFixes(phase: number, fixes: CategoryFix[]): Promise<void> {
  const logEntry: FixLog = {
    timestamp: new Date().toISOString(),
    phase,
    fixes,
  };

  const logFile = getLogFilePath();
  let existingLogs: FixLog[] = [];

  if (fs.existsSync(logFile)) {
    existingLogs = JSON.parse(fs.readFileSync(logFile, "utf-8"));
  }

  existingLogs.push(logEntry);
  fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));
  console.log(`  Logged ${fixes.length} fixes to ${logFile}`);
}

/**
 * Detect the expected category based on location name patterns.
 */
function detectExpectedCategory(name: string): { category: string; reason: string; confidence: "high" | "medium" | "low" } | null {
  // First, check if name contains non-restaurant patterns
  const isLandmark = NON_RESTAURANT_PATTERNS.test(name);

  for (const rule of CATEGORY_PATTERNS) {
    if (rule.pattern.test(name)) {
      // If it's a restaurant pattern but also a landmark, skip restaurant detection
      if (rule.expectedCategory === "restaurant" && isLandmark) {
        continue;
      }
      if (rule.expectedCategory === "bar" && isLandmark) {
        continue;
      }

      // Determine confidence
      let confidence: "high" | "medium" | "low" = "medium";

      // High confidence for very specific, unambiguous patterns
      if (/castle|shrine|temple|museum|jinja|jingu|taisha|城|神社|寺/i.test(name)) {
        confidence = "high";
      }

      // Lower confidence for more ambiguous patterns
      if (/tower|gate|park|garden/i.test(name) && !/castle|shrine|temple/i.test(name)) {
        confidence = "medium";
      }

      return {
        category: rule.expectedCategory,
        reason: rule.description,
        confidence,
      };
    }
  }

  return null;
}

/**
 * Determine if a location needs category fix and return the fix details.
 */
function determineFix(loc: LocationRecord): CategoryFix | null {
  if (!loc.name) return null;

  const detected = detectExpectedCategory(loc.name);
  if (!detected) return null;

  const currentCategory = loc.category?.toLowerCase() || null;
  const expectedCategory = detected.category;

  // Case 1: Dining category but name clearly indicates landmark
  // This is the highest priority fix (e.g., "Gifu Castle" as "food")
  if (DINING_CATEGORIES.includes(currentCategory || "") && LANDMARK_CATEGORIES.includes(expectedCategory)) {
    return {
      id: loc.id,
      name: loc.name,
      oldCategory: loc.category,
      newCategory: expectedCategory,
      reason: `Landmark "${detected.reason}" miscategorized as dining`,
      confidence: "high",
    };
  }

  // Case 2: Generic "culture" category but should be specific
  if (currentCategory === "culture" && ["shrine", "temple", "museum", "landmark", "historic"].includes(expectedCategory)) {
    return {
      id: loc.id,
      name: loc.name,
      oldCategory: loc.category,
      newCategory: expectedCategory,
      reason: `Specific category "${expectedCategory}" (${detected.reason}) better than generic "culture"`,
      confidence: "medium",
    };
  }

  // Case 3: Generic "nature" category but should be specific
  if (currentCategory === "nature" && ["park", "viewpoint"].includes(expectedCategory)) {
    return {
      id: loc.id,
      name: loc.name,
      oldCategory: loc.category,
      newCategory: expectedCategory,
      reason: `Specific category "${expectedCategory}" (${detected.reason}) better than generic "nature"`,
      confidence: "low",
    };
  }

  // Case 4: Generic "shopping" category but should be market
  if (currentCategory === "shopping" && expectedCategory === "market") {
    return {
      id: loc.id,
      name: loc.name,
      oldCategory: loc.category,
      newCategory: expectedCategory,
      reason: `Specific category "market" better than generic "shopping"`,
      confidence: "low",
    };
  }

  return null;
}

async function fetchAllLocations(): Promise<LocationRecord[]> {
  let allLocations: LocationRecord[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, category")
      .range(from, from + pageSize - 1)
      .order("name");

    if (error) {
      console.error("Error fetching locations:", error);
      throw error;
    }

    if (!data || data.length === 0) break;

    allLocations = allLocations.concat(data as LocationRecord[]);
    from += pageSize;

    if (data.length < pageSize) break;
  }

  return allLocations;
}

async function applyFixes(fixes: CategoryFix[], isDryRun: boolean): Promise<number> {
  if (fixes.length === 0) return 0;
  if (isDryRun) return fixes.length;

  let updated = 0;

  for (const fix of fixes) {
    const { error } = await supabase
      .from("locations")
      .update({ category: fix.newCategory })
      .eq("id", fix.id);

    if (error) {
      console.error(`  Error updating "${fix.name}":`, error.message);
      continue;
    }

    updated++;
  }

  return updated;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const phaseArg = args.find((a) => a.startsWith("--phase="));
  const specificPhase = phaseArg ? parseInt(phaseArg.split("=")[1] || "0") : null;

  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║      Koku Travel - Category Mismatch Fix Script                ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  if (isDryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  // Fetch all locations
  console.log("Fetching all locations...");
  const locations = await fetchAllLocations();
  console.log(`Found ${locations.length} total locations\n`);

  // Determine all fixes
  const allFixes: CategoryFix[] = [];
  for (const loc of locations) {
    const fix = determineFix(loc);
    if (fix) {
      allFixes.push(fix);
    }
  }

  // Separate by confidence
  const highConfidence = allFixes.filter((f) => f.confidence === "high");
  const mediumConfidence = allFixes.filter((f) => f.confidence === "medium");
  const lowConfidence = allFixes.filter((f) => f.confidence === "low");

  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("                         FIX SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  console.log(`Total fixes identified: ${allFixes.length}`);
  console.log(`  High confidence:   ${highConfidence.length} (landmarks as food)`);
  console.log(`  Medium confidence: ${mediumConfidence.length} (generic culture → specific)`);
  console.log(`  Low confidence:    ${lowConfidence.length} (other refinements)`);

  // Phase 1: High confidence fixes (landmarks miscategorized as food)
  if (!specificPhase || specificPhase === 1) {
    console.log("\n═══════════════════════════════════════════════════════════════════");
    console.log("PHASE 1: High Confidence Fixes (Landmarks as Dining)");
    console.log("═══════════════════════════════════════════════════════════════════\n");

    if (highConfidence.length === 0) {
      console.log("  ✓ No high confidence fixes needed");
    } else {
      console.log(`  Fixing ${highConfidence.length} landmarks incorrectly categorized as food:\n`);

      // Group by new category
      const byNewCategory: Record<string, CategoryFix[]> = {};
      for (const fix of highConfidence) {
        if (!byNewCategory[fix.newCategory]) byNewCategory[fix.newCategory] = [];
        byNewCategory[fix.newCategory].push(fix);
      }

      for (const [category, fixes] of Object.entries(byNewCategory)) {
        console.log(`  → ${category} (${fixes.length} locations):`);
        for (const fix of fixes.slice(0, 10)) {
          console.log(`      "${fix.name}" (was: ${fix.oldCategory})`);
        }
        if (fixes.length > 10) {
          console.log(`      ... and ${fixes.length - 10} more`);
        }
        console.log("");
      }

      if (!isDryRun) {
        const updated = await applyFixes(highConfidence, isDryRun);
        await logFixes(1, highConfidence);
        console.log(`  ✓ Applied ${updated} high confidence fixes`);
      } else {
        console.log(`  [DRY RUN] Would apply ${highConfidence.length} fixes`);
      }
    }
  }

  // Phase 2: Medium confidence fixes (generic culture → specific)
  if (!specificPhase || specificPhase === 2) {
    console.log("\n═══════════════════════════════════════════════════════════════════");
    console.log("PHASE 2: Medium Confidence Fixes (Generic → Specific Category)");
    console.log("═══════════════════════════════════════════════════════════════════\n");

    if (mediumConfidence.length === 0) {
      console.log("  ✓ No medium confidence fixes needed");
    } else {
      console.log(`  Fixing ${mediumConfidence.length} generic categories:\n`);

      // Group by old → new
      const transitions: Record<string, CategoryFix[]> = {};
      for (const fix of mediumConfidence) {
        const key = `${fix.oldCategory} → ${fix.newCategory}`;
        if (!transitions[key]) transitions[key] = [];
        transitions[key].push(fix);
      }

      for (const [transition, fixes] of Object.entries(transitions)) {
        console.log(`  ${transition} (${fixes.length} locations):`);
        for (const fix of fixes.slice(0, 5)) {
          console.log(`    - "${fix.name}"`);
        }
        if (fixes.length > 5) {
          console.log(`    ... and ${fixes.length - 5} more`);
        }
        console.log("");
      }

      if (!isDryRun) {
        const updated = await applyFixes(mediumConfidence, isDryRun);
        await logFixes(2, mediumConfidence);
        console.log(`  ✓ Applied ${updated} medium confidence fixes`);
      } else {
        console.log(`  [DRY RUN] Would apply ${mediumConfidence.length} fixes`);
      }
    }
  }

  // Phase 3: Low confidence fixes (other refinements)
  if (!specificPhase || specificPhase === 3) {
    console.log("\n═══════════════════════════════════════════════════════════════════");
    console.log("PHASE 3: Low Confidence Fixes (Category Refinements)");
    console.log("═══════════════════════════════════════════════════════════════════\n");

    if (lowConfidence.length === 0) {
      console.log("  ✓ No low confidence fixes needed");
    } else {
      console.log(`  Fixing ${lowConfidence.length} category refinements:\n`);

      // Show all since typically fewer
      for (const fix of lowConfidence.slice(0, 20)) {
        console.log(`    "${fix.name}"`);
        console.log(`      ${fix.oldCategory} → ${fix.newCategory}`);
        console.log(`      Reason: ${fix.reason}\n`);
      }
      if (lowConfidence.length > 20) {
        console.log(`    ... and ${lowConfidence.length - 20} more`);
      }

      if (!isDryRun) {
        const updated = await applyFixes(lowConfidence, isDryRun);
        await logFixes(3, lowConfidence);
        console.log(`  ✓ Applied ${updated} low confidence fixes`);
      } else {
        console.log(`  [DRY RUN] Would apply ${lowConfidence.length} fixes`);
      }
    }
  }

  // Final summary
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("                         FINAL SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  const totalApplied =
    ((!specificPhase || specificPhase === 1) ? highConfidence.length : 0) +
    ((!specificPhase || specificPhase === 2) ? mediumConfidence.length : 0) +
    ((!specificPhase || specificPhase === 3) ? lowConfidence.length : 0);

  if (isDryRun) {
    console.log(`[DRY RUN] Would apply ${totalApplied} category fixes`);
    console.log("\nRemove --dry-run to apply changes.");
  } else {
    console.log(`✓ Applied ${totalApplied} category fixes`);
    console.log(`\nChanges logged to ${getLogFilePath()}`);
  }

  console.log("\n✅ Done!");
}

main().catch(console.error);
