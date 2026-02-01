#!/usr/bin/env tsx
/**
 * Cleanup script to identify and fix festival/event location data quality issues.
 *
 * This script identifies:
 * 1. Festival-keyword locations NOT tagged as seasonal (is_seasonal = false)
 * 2. Duplicate festival entries (same city + festival in description but different names)
 * 3. Vague names (city name only for what's actually a festival)
 *
 * Usage:
 *   npx tsx scripts/cleanup-festival-locations.ts              # Dry run (default)
 *   npx tsx scripts/cleanup-festival-locations.ts --fix        # Apply fixes
 *   npx tsx scripts/cleanup-festival-locations.ts --json       # Output as JSON
 *   npx tsx scripts/cleanup-festival-locations.ts --verbose    # Show all details
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

// ============================================================================
// Types
// ============================================================================

interface LocationRecord {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  category: string | null;
  description: string | null;
  short_description: string | null;
  is_seasonal: boolean | null;
  seasonal_type: string | null;
  place_id: string | null;
  coordinates: { lat: number; lng: number } | null;
  rating: number | null;
}

interface Issue {
  type: "untagged_festival" | "duplicate_festival" | "vague_name";
  locationId: string;
  locationName: string;
  city: string | null;
  description: string;
  suggestedFix: string;
  relatedLocationId?: string; // For duplicates
  relatedLocationName?: string;
  confidence: "high" | "medium" | "low";
}

interface FestivalCandidate {
  location: LocationRecord;
  matchedKeyword: string;
  matchedIn: "name" | "description" | "short_description";
}

// ============================================================================
// Festival Detection Patterns
// ============================================================================

/**
 * Keywords that strongly indicate a festival/event
 * These must be carefully chosen to avoid false positives
 */
const FESTIVAL_KEYWORDS = [
  // Japanese festival terms (strong indicators)
  "matsuri",
  "festival",
  "hanabi",
  "fireworks",
  "bon odori", // More specific than just "odori" or "bon"
  "tanabata",
  // Specific event types
  "parade",
  "procession",
  "fire festival",
  "snow festival",
  "ice festival",
  "lantern festival",
  "flower festival",
  "cherry blossom festival",
  "autumn festival",
  "summer festival",
  "winter festival",
  "spring festival",
  // Known specific festivals (whole words/phrases)
  "gion matsuri",
  "awa odori", // The dance festival, not just "awa"
  "nebuta",
  "tenjin matsuri",
  "kanda matsuri",
  "sanja matsuri",
  "takayama matsuri",
  "chichibu matsuri",
  "hakata dontaku",
  "hakata gion",
  "hyakumangoku",
  "yuki matsuri",
];

/**
 * Keywords that might indicate false positives (permanent places that host festivals)
 */
const FALSE_POSITIVE_KEYWORDS = [
  "shrine", // Shrines are permanent even if they host festivals
  "temple",
  "jinja",
  "taisha",
  "museum",
  "hall",
  "theater",
  "theatre",
  "stadium",
  "park", // Parks are permanent, festivals happen there
  "garden",
];

/**
 * Patterns for vague city-named locations that are actually festivals
 */
const VAGUE_NAME_PATTERNS = [
  // Just the city name (will match names that are only the city name)
  /^([A-Za-z]+)$/i,
];

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Check if text contains festival keywords
 */
function containsFestivalKeyword(text: string): { found: boolean; keyword: string } {
  const lowerText = text.toLowerCase();
  for (const keyword of FESTIVAL_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return { found: true, keyword };
    }
  }
  return { found: false, keyword: "" };
}

/**
 * Check if text contains false positive keywords
 */
function containsFalsePositiveKeyword(text: string): boolean {
  const lowerText = text.toLowerCase();
  return FALSE_POSITIVE_KEYWORDS.some((keyword) =>
    lowerText.includes(keyword.toLowerCase())
  );
}

/**
 * Detect festival candidates from locations
 */
function detectFestivalCandidates(locations: LocationRecord[]): FestivalCandidate[] {
  const candidates: FestivalCandidate[] = [];

  for (const location of locations) {
    // Skip already tagged seasonal locations
    if (location.is_seasonal) {
      continue;
    }

    // Check name first
    const nameCheck = containsFestivalKeyword(location.name);
    if (nameCheck.found) {
      // Skip if name contains false positive keywords
      if (!containsFalsePositiveKeyword(location.name)) {
        candidates.push({
          location,
          matchedKeyword: nameCheck.keyword,
          matchedIn: "name",
        });
        continue;
      }
    }

    // Check description
    const desc = location.description || "";
    const descCheck = containsFestivalKeyword(desc);
    if (descCheck.found) {
      // For descriptions, only flag if name doesn't contain false positives
      // AND description strongly indicates it's an event (not a place that hosts events)
      const descLower = desc.toLowerCase();
      const isEvent =
        descLower.includes("annual") ||
        descLower.includes("held") ||
        descLower.includes("takes place") ||
        descLower.includes("occurs") ||
        descLower.includes("celebrated") ||
        descLower.includes("every year");

      if (isEvent && !containsFalsePositiveKeyword(location.name)) {
        candidates.push({
          location,
          matchedKeyword: descCheck.keyword,
          matchedIn: "description",
        });
        continue;
      }
    }

    // Check short description
    const shortDesc = location.short_description || "";
    const shortDescCheck = containsFestivalKeyword(shortDesc);
    if (shortDescCheck.found && !containsFalsePositiveKeyword(location.name)) {
      candidates.push({
        location,
        matchedKeyword: shortDescCheck.keyword,
        matchedIn: "short_description",
      });
    }
  }

  return candidates;
}

/**
 * Detect vague names (city name only for what's actually a festival)
 */
function detectVagueNames(locations: LocationRecord[]): Issue[] {
  const issues: Issue[] = [];

  for (const location of locations) {
    const name = location.name.trim();
    const city = location.city?.trim().toLowerCase() || "";

    // Check if name is just the city name
    if (name.toLowerCase() === city && city.length > 0) {
      // Check if description mentions festival/event
      const desc = (location.description || "").toLowerCase();
      const shortDesc = (location.short_description || "").toLowerCase();
      const combinedDesc = `${desc} ${shortDesc}`;

      const festivalCheck = containsFestivalKeyword(combinedDesc);
      if (festivalCheck.found) {
        issues.push({
          type: "vague_name",
          locationId: location.id,
          locationName: location.name,
          city: location.city,
          description: `Location named "${name}" is actually a festival (${festivalCheck.keyword} found in description)`,
          suggestedFix: `Rename to include festival name from description or delete if duplicate`,
          confidence: "high",
        });
      }
    }
  }

  return issues;
}

/**
 * Detect duplicate festival entries
 */
function detectDuplicateFestivals(locations: LocationRecord[]): Issue[] {
  const issues: Issue[] = [];

  // Group by city
  const byCity = new Map<string, LocationRecord[]>();
  for (const location of locations) {
    const city = (location.city || "unknown").toLowerCase();
    const existing = byCity.get(city) || [];
    existing.push(location);
    byCity.set(city, existing);
  }

  // For each city, find festivals and check for duplicates
  for (const [city, cityLocations] of byCity) {
    // Find all locations that appear to be festivals
    const festivalLocations: Array<{ location: LocationRecord; festivalName: string }> = [];

    for (const location of cityLocations) {
      const nameCheck = containsFestivalKeyword(location.name);
      const descCheck = containsFestivalKeyword(location.description || "");

      if (nameCheck.found || descCheck.found) {
        // Extract festival name from the location name or description
        const festivalName = extractFestivalName(location);
        if (festivalName) {
          festivalLocations.push({ location, festivalName });
        }
      }
    }

    // Check for duplicates based on festival name similarity
    for (let i = 0; i < festivalLocations.length; i++) {
      for (let j = i + 1; j < festivalLocations.length; j++) {
        const a = festivalLocations[i];
        const b = festivalLocations[j];

        if (!a || !b) continue;

        // Check if these might be the same festival
        if (areSameFestival(a.festivalName, b.festivalName)) {
          // Determine which one to keep (prefer the one with more data)
          const scoreA = scoreLocationQuality(a.location);
          const scoreB = scoreLocationQuality(b.location);

          const keepLocation = scoreA >= scoreB ? a.location : b.location;
          const deleteLocation = scoreA >= scoreB ? b.location : a.location;

          issues.push({
            type: "duplicate_festival",
            locationId: deleteLocation.id,
            locationName: deleteLocation.name,
            city: deleteLocation.city,
            description: `Appears to be duplicate of "${keepLocation.name}" (${a.festivalName} vs ${b.festivalName})`,
            suggestedFix: `Delete this entry and keep "${keepLocation.name}" (score: ${Math.max(scoreA, scoreB)} vs ${Math.min(scoreA, scoreB)})`,
            relatedLocationId: keepLocation.id,
            relatedLocationName: keepLocation.name,
            confidence: areSameFestival(a.festivalName, b.festivalName) ? "high" : "medium",
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Extract festival name from location
 */
function extractFestivalName(location: LocationRecord): string | null {
  const name = location.name.toLowerCase();
  const desc = (location.description || "").toLowerCase();

  // Try to extract from name first
  for (const keyword of ["matsuri", "festival"]) {
    if (name.includes(keyword)) {
      // Return the full name as the festival name
      return name;
    }
  }

  // Check specific festival patterns in description
  const patterns = [
    /hyakumangoku/i,
    /gion/i,
    /nebuta/i,
    /awa odori/i,
    /tenjin/i,
    /tanabata/i,
    /hanabi/i,
  ];

  for (const pattern of patterns) {
    const match = desc.match(pattern);
    if (match) {
      return match[0].toLowerCase();
    }
  }

  return null;
}

/**
 * Check if two festival names refer to the same festival
 */
function areSameFestival(name1: string, name2: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .replace(/matsuri|festival/g, "");

  const n1 = normalize(name1);
  const n2 = normalize(name2);

  // Exact match after normalization
  if (n1 === n2) return true;

  // One is substring of the other
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Check for common festival name patterns
  const festivalPatterns = [
    "hyakumangoku",
    "gion",
    "nebuta",
    "awaodori",
    "tenjin",
    "tanabata",
    "hanabi",
  ];

  for (const pattern of festivalPatterns) {
    if (n1.includes(pattern) && n2.includes(pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Score location quality for determining which duplicate to keep
 */
function scoreLocationQuality(location: LocationRecord): number {
  let score = 0;

  // Prefer locations with proper names (not just city name)
  if (location.name.toLowerCase() !== (location.city || "").toLowerCase()) {
    score += 50;
  }

  // Has place_id (Google verified)
  if (location.place_id) score += 30;

  // Has coordinates
  if (location.coordinates) score += 20;

  // Has proper seasonal tagging
  if (location.is_seasonal) score += 20;

  // Has description
  if (location.description && location.description.length > 50) score += 15;

  // Has rating
  if (location.rating) score += 10;

  // Has category
  if (location.category) score += 5;

  return score;
}

// ============================================================================
// Data Fetching
// ============================================================================

async function fetchAllLocations(): Promise<LocationRecord[]> {
  const allLocations: LocationRecord[] = [];
  let page = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("locations")
      .select(
        "id, name, city, region, category, description, short_description, is_seasonal, seasonal_type, place_id, coordinates, rating"
      )
      .order("name", { ascending: true })
      .range(page * limit, (page + 1) * limit - 1);

    if (error) {
      console.error("Error fetching locations:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allLocations.push(...(data as LocationRecord[]));
    hasMore = data.length === limit;
    page++;

    if (page > 50) {
      console.warn("Reached pagination safety limit");
      break;
    }
  }

  return allLocations;
}

// ============================================================================
// Fix Application
// ============================================================================

async function applyFixes(issues: Issue[]): Promise<{ fixed: number; errors: string[] }> {
  let fixed = 0;
  const errors: string[] = [];

  // Group issues by type
  const untaggedFestivals = issues.filter((i) => i.type === "untagged_festival");
  const duplicates = issues.filter((i) => i.type === "duplicate_festival");

  // Fix untagged festivals - mark as seasonal
  for (const issue of untaggedFestivals) {
    const { error } = await supabase
      .from("locations")
      .update({
        is_seasonal: true,
        seasonal_type: "festival",
      })
      .eq("id", issue.locationId);

    if (error) {
      errors.push(`Failed to update ${issue.locationName}: ${error.message}`);
    } else {
      fixed++;
      console.log(`  Tagged as seasonal: ${issue.locationName}`);
    }
  }

  // Delete duplicates
  for (const issue of duplicates) {
    if (issue.confidence !== "high") {
      console.log(`  Skipping low-confidence duplicate: ${issue.locationName}`);
      continue;
    }

    const { error } = await supabase.from("locations").delete().eq("id", issue.locationId);

    if (error) {
      errors.push(`Failed to delete ${issue.locationName}: ${error.message}`);
    } else {
      fixed++;
      console.log(`  Deleted duplicate: ${issue.locationName}`);
    }
  }

  return { fixed, errors };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const applyFix = args.includes("--fix");
  const jsonOutput = args.includes("--json");
  const verbose = args.includes("--verbose");

  console.log("======================================================================");
  console.log("       Koku Travel - Festival Locations Cleanup Script               ");
  console.log("======================================================================\n");

  if (!applyFix) {
    console.log("MODE: DRY RUN (no changes will be made)");
    console.log("Use --fix to apply corrections\n");
  } else {
    console.log("MODE: FIX (changes will be applied!)\n");
  }

  // Fetch all locations
  console.log("Fetching all locations...");
  const locations = await fetchAllLocations();
  console.log(`Found ${locations.length} total locations\n`);

  // Count already tagged
  const alreadyTagged = locations.filter((l) => l.is_seasonal);
  console.log(`Already tagged as seasonal: ${alreadyTagged.length}`);

  // Detect issues
  console.log("\nAnalyzing locations for issues...\n");

  const allIssues: Issue[] = [];

  // 1. Detect untagged festival locations
  const festivalCandidates = detectFestivalCandidates(locations);
  for (const candidate of festivalCandidates) {
    allIssues.push({
      type: "untagged_festival",
      locationId: candidate.location.id,
      locationName: candidate.location.name,
      city: candidate.location.city,
      description: `Contains "${candidate.matchedKeyword}" in ${candidate.matchedIn} but is_seasonal=false`,
      suggestedFix: "Set is_seasonal=true, seasonal_type='festival'",
      confidence:
        candidate.matchedIn === "name"
          ? "high"
          : candidate.matchedIn === "short_description"
            ? "medium"
            : "low",
    });
  }

  // 2. Detect vague names
  const vagueNameIssues = detectVagueNames(locations);
  allIssues.push(...vagueNameIssues);

  // 3. Detect duplicate festivals
  const duplicateIssues = detectDuplicateFestivals(locations);
  allIssues.push(...duplicateIssues);

  // Group by type for reporting
  const untaggedFestivals = allIssues.filter((i) => i.type === "untagged_festival");
  const vagueNames = allIssues.filter((i) => i.type === "vague_name");
  const duplicates = allIssues.filter((i) => i.type === "duplicate_festival");

  console.log("=== ISSUE SUMMARY ===\n");
  console.log(`Festival-keyword locations NOT tagged seasonal: ${untaggedFestivals.length}`);
  console.log(`Vague city-named locations: ${vagueNames.length}`);
  console.log(`Duplicate festival entries: ${duplicates.length}`);
  console.log(`Total issues: ${allIssues.length}\n`);

  if (jsonOutput) {
    console.log("\n=== JSON OUTPUT ===\n");
    console.log(JSON.stringify(allIssues, null, 2));
    return;
  }

  // Print high confidence issues
  const highConfidence = allIssues.filter((i) => i.confidence === "high");
  const mediumConfidence = allIssues.filter((i) => i.confidence === "medium");
  const lowConfidence = allIssues.filter((i) => i.confidence === "low");

  console.log("\n=== HIGH CONFIDENCE ISSUES ===\n");
  for (const issue of highConfidence.slice(0, verbose ? undefined : 20)) {
    console.log(`[${issue.type}] ${issue.locationName} (${issue.city || "unknown city"})`);
    console.log(`  ${issue.description}`);
    console.log(`  Fix: ${issue.suggestedFix}`);
    if (issue.relatedLocationName) {
      console.log(`  Related: ${issue.relatedLocationName}`);
    }
    console.log("");
  }

  if (!verbose && highConfidence.length > 20) {
    console.log(`... and ${highConfidence.length - 20} more high confidence issues\n`);
  }

  if (verbose || mediumConfidence.length <= 10) {
    console.log("\n=== MEDIUM CONFIDENCE ISSUES ===\n");
    for (const issue of mediumConfidence) {
      console.log(`[${issue.type}] ${issue.locationName} (${issue.city || "unknown city"})`);
      console.log(`  ${issue.description}`);
      console.log("");
    }
  } else {
    console.log(`\nMedium confidence issues: ${mediumConfidence.length} (use --verbose to see)`);
  }

  if (verbose) {
    console.log("\n=== LOW CONFIDENCE ISSUES ===\n");
    for (const issue of lowConfidence) {
      console.log(`[${issue.type}] ${issue.locationName} (${issue.city || "unknown city"})`);
      console.log(`  ${issue.description}`);
      console.log("");
    }
  } else if (lowConfidence.length > 0) {
    console.log(`Low confidence issues: ${lowConfidence.length} (use --verbose to see)\n`);
  }

  // Save report
  const reportPath = `scripts/output/festival-cleanup-${new Date().toISOString().split("T")[0]}.json`;

  // Ensure output directory exists
  if (!fs.existsSync("scripts/output")) {
    fs.mkdirSync("scripts/output", { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    mode: applyFix ? "fix" : "dry-run",
    totalLocations: locations.length,
    alreadySeasonalCount: alreadyTagged.length,
    summary: {
      untaggedFestivals: untaggedFestivals.length,
      vagueNames: vagueNames.length,
      duplicates: duplicates.length,
      total: allIssues.length,
    },
    byConfidence: {
      high: highConfidence.length,
      medium: mediumConfidence.length,
      low: lowConfidence.length,
    },
    issues: allIssues,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to ${reportPath}`);

  // Apply fixes if requested
  if (applyFix) {
    console.log("\n=== APPLYING FIXES ===\n");

    // Only apply high confidence fixes by default
    const fixableIssues = allIssues.filter(
      (i) =>
        i.confidence === "high" &&
        (i.type === "untagged_festival" || i.type === "duplicate_festival")
    );

    if (fixableIssues.length === 0) {
      console.log("No high-confidence fixes to apply.");
    } else {
      console.log(`Applying ${fixableIssues.length} high-confidence fixes...`);
      const result = await applyFixes(fixableIssues);
      console.log(`\nFixed: ${result.fixed}`);
      if (result.errors.length > 0) {
        console.log(`Errors: ${result.errors.length}`);
        for (const err of result.errors.slice(0, 5)) {
          console.log(`  - ${err}`);
        }
      }
    }
  } else {
    console.log("\n===================================================================");
    console.log("DRY RUN COMPLETE - No changes made");
    console.log("===================================================================\n");
    console.log("To apply high-confidence fixes, run:");
    console.log("  npx tsx scripts/cleanup-festival-locations.ts --fix");
  }
}

main().catch(console.error);
