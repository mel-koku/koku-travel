#!/usr/bin/env tsx
/**
 * Find Misnamed Locations Script
 *
 * Detects locations where the name appears to be an event/festival but the
 * editorial_summary describes a different entity (typically a shrine/temple).
 *
 * This happens when:
 * 1. JNTO scraper extracted event/festival names as location names
 * 2. Google Places enrichment matched coordinates to actual shrines/temples
 * 3. Enrichment updated editorial_summary but kept original incorrect name
 *
 * Usage:
 *   npx tsx scripts/data-quality/find-misnamed-locations.ts
 *   npx tsx scripts/data-quality/find-misnamed-locations.ts --verbose
 *   npx tsx scripts/data-quality/find-misnamed-locations.ts --json > suspicious.json
 */

import { config } from "dotenv";
config({ path: ".env.local", debug: false });

import { createClient } from "@supabase/supabase-js";

// Verify required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in .env.local");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Keywords that suggest the name is an event/festival
// These should match as whole words to avoid false positives like "Matsumoto" matching "matsuri"
const EVENT_KEYWORDS = [
  "festival",
  "matsuri",
  "matsui",
  "noh",
  "honen",
  "setsubun",
  "yayoi",
  "toka",
  "takigi",
  "chibikko",
  "gozan",
];

// Names containing these words are likely correct shrine/temple names, not events
const SHRINE_TEMPLE_NAME_KEYWORDS = [
  "shrine",
  "temple",
  "jinja",
  "taisha",
  "jingu",
  "-ji",
  "gu",
  "castle",
  "sanctuary",
];

// Keywords in editorial_summary that suggest it's describing a shrine/temple
const SHRINE_TEMPLE_KEYWORDS = [
  "shrine",
  "temple",
  "pagoda",
  "torii",
  "buddhist",
  "shinto",
  "founded",
  "established",
  "century",
  "worship",
  "sacred",
  "deity",
  "god",
  "goddess",
];

interface SuspiciousLocation {
  id: string;
  name: string;
  city: string;
  region: string;
  category: string;
  editorial_summary: string | null;
  coordinates: { lat: number; lng: number } | null;
  place_id: string | null;
  suspicionReason: string;
  confidenceScore: number;
}

// Parse command line arguments
const args = process.argv.slice(2);
const verboseMode = args.includes("--verbose");
const jsonMode = args.includes("--json");

/**
 * Check if a name looks like an event/festival name
 * Uses word boundary matching to avoid false positives
 */
function isEventLikeName(name: string): boolean {
  const lowerName = name.toLowerCase();

  // If name already contains shrine/temple indicators, it's probably correct
  if (SHRINE_TEMPLE_NAME_KEYWORDS.some(k => lowerName.includes(k))) {
    return false;
  }

  // Check for event keywords as whole words
  return EVENT_KEYWORDS.some(keyword => {
    // Create a regex that matches the keyword as a whole word or at word boundaries
    const regex = new RegExp(`\\b${keyword}\\b|^${keyword}|${keyword}$`, "i");
    return regex.test(name);
  });
}

/**
 * Check if editorial_summary describes a shrine or temple
 */
function describesShrineTample(summary: string): boolean {
  const lowerSummary = summary.toLowerCase();
  return SHRINE_TEMPLE_KEYWORDS.some(keyword => lowerSummary.includes(keyword));
}

/**
 * Calculate confidence score for the mismatch
 */
function calculateConfidence(name: string, summary: string): number {
  let score = 0;

  const lowerName = name.toLowerCase();
  const lowerSummary = summary.toLowerCase();

  // Higher score if name contains event keywords
  const eventMatches = EVENT_KEYWORDS.filter(k => lowerName.includes(k)).length;
  score += eventMatches * 20;

  // Higher score if summary describes religious site
  const shrineMatches = SHRINE_TEMPLE_KEYWORDS.filter(k => lowerSummary.includes(k)).length;
  score += shrineMatches * 10;

  // Higher score if name is short (events often have short names)
  if (name.length < 15) score += 10;

  // Higher score if name doesn't contain typical shrine/temple suffixes
  if (!lowerName.includes("-ji") && !lowerName.includes("temple") &&
      !lowerName.includes("shrine") && !lowerName.includes("jinja") &&
      !lowerName.includes("taisha") && !lowerName.includes("jingu")) {
    score += 15;
  }

  // Higher score if summary mentions specific founding dates
  if (/\d{3,4}\s*(a\.?d\.?|century|ce)/i.test(summary)) {
    score += 15;
  }

  return Math.min(score, 100);
}

/**
 * Determine the specific reason for suspicion
 */
function getSuspicionReason(name: string, summary: string): string {
  const reasons: string[] = [];

  if (isEventLikeName(name)) {
    reasons.push(`Name contains event keyword`);
  }

  if (describesShrineTample(summary)) {
    reasons.push(`Editorial describes shrine/temple`);
  }

  if (name.length < 15 && summary.length > 50) {
    reasons.push(`Short name with detailed description`);
  }

  return reasons.join("; ") || "Unknown";
}

/**
 * Find all suspicious locations in the database
 */
async function findSuspiciousLocations(): Promise<SuspiciousLocation[]> {
  // Query locations with editorial_summary that are in culture/shrine/temple categories
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, city, region, category, editorial_summary, coordinates, place_id")
    .not("editorial_summary", "is", null)
    .in("category", ["shrine", "temple", "culture", "landmark", "attraction"])
    .order("name");

  if (error) {
    console.error("Failed to fetch locations:", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    return [];
  }

  const suspicious: SuspiciousLocation[] = [];

  for (const loc of data) {
    const summary = loc.editorial_summary || "";

    // Check if this location appears to be misnamed
    const hasEventName = isEventLikeName(loc.name);
    const summaryDescribesShrine = describesShrineTample(summary);

    if (hasEventName && summaryDescribesShrine) {
      const confidence = calculateConfidence(loc.name, summary);
      const reason = getSuspicionReason(loc.name, summary);

      suspicious.push({
        id: loc.id,
        name: loc.name,
        city: loc.city,
        region: loc.region,
        category: loc.category,
        editorial_summary: loc.editorial_summary,
        coordinates: loc.coordinates,
        place_id: loc.place_id,
        suspicionReason: reason,
        confidenceScore: confidence,
      });
    }
  }

  // Sort by confidence score descending
  suspicious.sort((a, b) => b.confidenceScore - a.confidenceScore);

  return suspicious;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  if (!jsonMode) {
    console.log("\n=== Finding Misnamed Locations ===\n");
  }

  const suspicious = await findSuspiciousLocations();

  if (jsonMode) {
    console.log(JSON.stringify(suspicious, null, 2));
    return;
  }

  if (suspicious.length === 0) {
    console.log("No suspicious locations found.");
    return;
  }

  console.log(`Found ${suspicious.length} suspicious location(s):\n`);

  for (const loc of suspicious) {
    console.log(`[${loc.confidenceScore}%] ${loc.name}`);
    console.log(`   ID: ${loc.id}`);
    console.log(`   City: ${loc.city}, Region: ${loc.region}`);
    console.log(`   Category: ${loc.category}`);
    console.log(`   Reason: ${loc.suspicionReason}`);

    if (verboseMode && loc.editorial_summary) {
      console.log(`   Editorial: "${loc.editorial_summary.slice(0, 150)}..."`);
    }

    if (loc.coordinates) {
      console.log(`   Coords: ${loc.coordinates.lat}, ${loc.coordinates.lng}`);
    }

    console.log("");
  }

  console.log("=== Summary ===");
  console.log(`Total suspicious: ${suspicious.length}`);
  console.log(`High confidence (>70%): ${suspicious.filter(s => s.confidenceScore > 70).length}`);
  console.log(`Medium confidence (40-70%): ${suspicious.filter(s => s.confidenceScore >= 40 && s.confidenceScore <= 70).length}`);
  console.log(`Low confidence (<40%): ${suspicious.filter(s => s.confidenceScore < 40).length}`);

  console.log("\nTo export for further processing:");
  console.log("  npx tsx scripts/data-quality/find-misnamed-locations.ts --json > suspicious.json");
}

main().catch(console.error);
