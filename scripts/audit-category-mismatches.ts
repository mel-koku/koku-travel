/**
 * Audit script to identify category miscategorizations in location data.
 *
 * This script analyzes location names and compares them against their current
 * category to identify potential mismatches. For example, "Gifu Castle" categorized
 * as "food" instead of "landmark".
 *
 * Categories of issues identified:
 * 1. Landmarks miscategorized as food (castles, shrines, temples as restaurants)
 * 2. Generic categories that should be specific (culture → shrine/temple/museum)
 * 3. Missing category interest mappings
 *
 * Usage:
 *   npx tsx scripts/audit-category-mismatches.ts              # Full audit
 *   npx tsx scripts/audit-category-mismatches.ts --verbose    # Show all matches
 *   npx tsx scripts/audit-category-mismatches.ts --json       # Output as JSON
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
// Each pattern maps to an expected category based on name
const CATEGORY_PATTERNS: { pattern: RegExp; expectedCategory: string; description: string }[] = [
  // Landmarks
  { pattern: /castle|jo\b|城/i, expectedCategory: "landmark", description: "Castles" },
  { pattern: /palace|imperial|御所/i, expectedCategory: "landmark", description: "Palaces" },
  { pattern: /tower|塔/i, expectedCategory: "landmark", description: "Towers" },
  { pattern: /gate|mon\b|門/i, expectedCategory: "landmark", description: "Gates" },
  { pattern: /bridge|橋/i, expectedCategory: "landmark", description: "Bridges" },

  // Shrines
  { pattern: /shrine|jinja|jingu|taisha|torii|神社|大社|神宮/i, expectedCategory: "shrine", description: "Shinto shrines" },

  // Temples
  { pattern: /temple|-ji\b|dera|in\b|寺|院/i, expectedCategory: "temple", description: "Buddhist temples" },

  // Museums
  { pattern: /museum|gallery|art center|美術館|博物館/i, expectedCategory: "museum", description: "Museums" },

  // Restaurants
  { pattern: /restaurant|ramen|sushi|izakaya|cafe|café|coffee|bakery|dining|eatery|レストラン|食堂/i, expectedCategory: "restaurant", description: "Restaurants/cafes" },

  // Bars
  { pattern: /\bbar\b|pub|sake|brewery|酒/i, expectedCategory: "bar", description: "Bars/breweries" },

  // Parks and Gardens
  { pattern: /park|garden|botanical|koen|公園|庭園/i, expectedCategory: "park", description: "Parks/gardens" },

  // Viewpoints
  { pattern: /observatory|observation|viewpoint|lookout|deck|展望/i, expectedCategory: "viewpoint", description: "Viewpoints" },

  // Markets
  { pattern: /market|arcade|street|shotengai|市場|商店街/i, expectedCategory: "market", description: "Markets" },

  // Nature
  { pattern: /mountain|mt\.|mount|waterfall|falls|lake|beach|trail|hiking|onsen|hot spring|volcano|gorge|valley|river|bay|island|山|滝|湖|温泉/i, expectedCategory: "nature", description: "Natural sites" },

  // Historic
  { pattern: /historic|heritage|ruins|ancient|samurai|edo|meiji|old town|traditional|village|historical/i, expectedCategory: "historic", description: "Historic sites" },
];

// Categories that indicate dining/restaurants (should NOT contain landmarks)
const DINING_CATEGORIES = ["food", "restaurant", "bar", "cafe"];

// Categories that should be specific landmarks (not generic "culture")
const LANDMARK_CATEGORIES = ["shrine", "temple", "landmark", "museum", "historic"];

// Patterns that clearly indicate a location is NOT a restaurant
const NON_RESTAURANT_PATTERNS = /castle|shrine|temple|museum|park|garden|tower|palace|observatory|gate|bridge|historic|heritage|ruins|monument|jo\b|jinja|jingu|dera|taisha|-ji\b|城|神社|寺|塔|門/i;

interface LocationRecord {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  prefecture: string | null;
}

interface Mismatch {
  id: string;
  name: string;
  currentCategory: string | null;
  expectedCategory: string;
  reason: string;
  confidence: "high" | "medium" | "low";
}

interface AuditReport {
  timestamp: string;
  totalLocations: number;
  totalMismatches: number;
  byCurrentCategory: Record<string, Mismatch[]>;
  byExpectedCategory: Record<string, Mismatch[]>;
  byConfidence: Record<string, Mismatch[]>;
  summary: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
}

/**
 * Detect the expected category based on location name patterns.
 */
function detectExpectedCategory(name: string): { category: string; reason: string; confidence: "high" | "medium" | "low" } | null {
  const nameLower = name.toLowerCase();

  for (const rule of CATEGORY_PATTERNS) {
    if (rule.pattern.test(name)) {
      // Determine confidence based on pattern specificity
      let confidence: "high" | "medium" | "low" = "medium";

      // High confidence for very specific patterns
      if (/castle|shrine|temple|museum|restaurant|ramen|sushi/i.test(name)) {
        confidence = "high";
      }

      // Lower confidence for ambiguous patterns
      if (/park|garden|bar|tower/i.test(name) && !/castle|shrine|temple/i.test(name)) {
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
 * Check if a location is miscategorized.
 */
function checkMiscategorization(loc: LocationRecord): Mismatch | null {
  if (!loc.name) return null;

  const detected = detectExpectedCategory(loc.name);
  if (!detected) return null;

  const currentCategory = loc.category?.toLowerCase() || null;
  const expectedCategory = detected.category;

  // Case 1: Food category but name matches landmark pattern
  // This is a high-priority mismatch (e.g., "Gifu Castle" as "food")
  if (DINING_CATEGORIES.includes(currentCategory || "") && LANDMARK_CATEGORIES.includes(expectedCategory)) {
    return {
      id: loc.id,
      name: loc.name,
      currentCategory: loc.category,
      expectedCategory,
      reason: `Landmark "${detected.reason}" incorrectly categorized as dining`,
      confidence: "high",
    };
  }

  // Case 2: Generic "culture" category but should be specific (shrine, temple, museum)
  if (currentCategory === "culture" && ["shrine", "temple", "museum", "landmark", "historic"].includes(expectedCategory)) {
    return {
      id: loc.id,
      name: loc.name,
      currentCategory: loc.category,
      expectedCategory,
      reason: `Generic "culture" should be specific "${expectedCategory}" (${detected.reason})`,
      confidence: "medium",
    };
  }

  // Case 3: Category completely different from expected
  if (currentCategory && currentCategory !== expectedCategory) {
    // Skip if current category is more specific and valid
    if (currentCategory === "shrine" && expectedCategory === "temple") return null; // Both valid
    if (currentCategory === "temple" && expectedCategory === "shrine") return null; // Both valid
    if (currentCategory === "park" && expectedCategory === "nature") return null; // Park is valid subset
    if (currentCategory === "garden" && expectedCategory === "park") return null; // Garden is valid

    return {
      id: loc.id,
      name: loc.name,
      currentCategory: loc.category,
      expectedCategory,
      reason: `Category mismatch: "${currentCategory}" vs expected "${expectedCategory}" (${detected.reason})`,
      confidence: detected.confidence,
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
      .select("id, name, category, city, prefecture")
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

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const isVerbose = args.includes("--verbose");
  const outputJson = args.includes("--json");

  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║      Koku Travel - Category Mismatch Audit Script              ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  // Fetch all locations
  console.log("Fetching all locations...");
  const locations = await fetchAllLocations();
  console.log(`Found ${locations.length} total locations\n`);

  // Analyze each location for mismatches
  const mismatches: Mismatch[] = [];
  for (const loc of locations) {
    const mismatch = checkMiscategorization(loc);
    if (mismatch) {
      mismatches.push(mismatch);
    }
  }

  // Build report
  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    totalLocations: locations.length,
    totalMismatches: mismatches.length,
    byCurrentCategory: groupBy(mismatches, (m) => m.currentCategory || "null"),
    byExpectedCategory: groupBy(mismatches, (m) => m.expectedCategory),
    byConfidence: groupBy(mismatches, (m) => m.confidence),
    summary: {
      highConfidence: mismatches.filter((m) => m.confidence === "high").length,
      mediumConfidence: mismatches.filter((m) => m.confidence === "medium").length,
      lowConfidence: mismatches.filter((m) => m.confidence === "low").length,
    },
  };

  // Output results
  if (outputJson) {
    const outputPath = `scripts/category-audit-${new Date().toISOString().split("T")[0]}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Report saved to ${outputPath}`);
    return;
  }

  // Print summary
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("                           AUDIT SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  console.log(`Total locations analyzed: ${report.totalLocations}`);
  console.log(`Total mismatches found:   ${report.totalMismatches}`);
  console.log(`\nBy confidence level:`);
  console.log(`  High:   ${report.summary.highConfidence} (definite mismatches)`);
  console.log(`  Medium: ${report.summary.mediumConfidence} (likely mismatches)`);
  console.log(`  Low:    ${report.summary.lowConfidence} (potential mismatches)`);

  // High-priority mismatches: food category with landmark names
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("HIGH PRIORITY: Landmarks Miscategorized as Food/Dining");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  const foodMismatches = report.byCurrentCategory["food"] || [];
  if (foodMismatches.length === 0) {
    console.log("  ✓ No landmarks miscategorized as food");
  } else {
    console.log(`Found ${foodMismatches.length} landmarks incorrectly in "food" category:\n`);
    for (const m of foodMismatches.slice(0, 20)) {
      console.log(`  - "${m.name}"`);
      console.log(`    Current: ${m.currentCategory} → Expected: ${m.expectedCategory}`);
      console.log(`    Reason: ${m.reason}\n`);
    }
    if (foodMismatches.length > 20) {
      console.log(`  ... and ${foodMismatches.length - 20} more`);
    }
  }

  // Generic "culture" that should be specific
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("MEDIUM PRIORITY: Generic 'culture' Should Be Specific Category");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  const cultureMismatches = report.byCurrentCategory["culture"] || [];
  if (cultureMismatches.length === 0) {
    console.log("  ✓ No generic 'culture' categories found that should be specific");
  } else {
    console.log(`Found ${cultureMismatches.length} locations with generic "culture" category:\n`);

    // Group by expected category
    const byExpected = groupBy(cultureMismatches, (m) => m.expectedCategory);
    for (const [expected, items] of Object.entries(byExpected)) {
      console.log(`  ${expected} (${items.length} locations):`);
      for (const m of items.slice(0, 5)) {
        console.log(`    - "${m.name}"`);
      }
      if (items.length > 5) {
        console.log(`    ... and ${items.length - 5} more`);
      }
      console.log("");
    }
  }

  // By expected category summary
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("MISMATCHES BY EXPECTED CATEGORY");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  for (const [category, items] of Object.entries(report.byExpectedCategory)) {
    console.log(`  ${category}: ${items.length} locations should have this category`);
    if (isVerbose) {
      for (const m of items.slice(0, 10)) {
        console.log(`    - "${m.name}" (current: ${m.currentCategory})`);
      }
      if (items.length > 10) {
        console.log(`    ... and ${items.length - 10} more`);
      }
    }
  }

  // Specific examples for verification
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("SAMPLE HIGH-CONFIDENCE MISMATCHES FOR VERIFICATION");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  const highConfidence = report.byConfidence["high"] || [];
  for (const m of highConfidence.slice(0, 15)) {
    console.log(`  • "${m.name}"`);
    console.log(`    ${m.currentCategory} → ${m.expectedCategory}`);
    console.log(`    ${m.reason}\n`);
  }

  // Save full report
  const outputPath = `scripts/category-audit-${new Date().toISOString().split("T")[0]}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Full report saved to ${outputPath}`);

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("RECOMMENDED NEXT STEPS");
  console.log("═══════════════════════════════════════════════════════════════════\n");
  console.log("1. Review high-confidence mismatches above");
  console.log("2. Run fix script: npx tsx scripts/fix-category-mismatches.ts --dry-run");
  console.log("3. Apply fixes: npx tsx scripts/fix-category-mismatches.ts");
}

main().catch(console.error);
