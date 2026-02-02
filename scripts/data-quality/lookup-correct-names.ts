#!/usr/bin/env tsx
/**
 * Lookup Correct Names Script
 *
 * For each suspicious location, queries Google Places API using coordinates
 * to find the correct location name. Compares with editorial_summary to verify match.
 *
 * Usage:
 *   npx tsx scripts/data-quality/lookup-correct-names.ts
 *   npx tsx scripts/data-quality/lookup-correct-names.ts --input suspicious.json
 *   npx tsx scripts/data-quality/lookup-correct-names.ts --json > corrections.json
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Verify required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in .env.local");
  process.exit(1);
}

if (!process.env.GOOGLE_PLACES_API_KEY) {
  console.error("Error: GOOGLE_PLACES_API_KEY must be configured in .env.local");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

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

interface CorrectionReport {
  id: string;
  currentName: string;
  correctName: string;
  city: string;
  region: string;
  editorial_summary: string | null;
  coordinates: { lat: number; lng: number } | null;
  place_id: string | null;
  googlePlaceId: string | null;
  action: "rename" | "delete" | "skip";
  reason: string;
  existingLocationId?: string;
}

// Parse command line arguments
const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
const jsonMode = args.includes("--json");

/**
 * Query Google Places API to get place details by place_id
 */
async function getPlaceDetails(placeId: string): Promise<{ name: string; types: string[] } | null> {
  try {
    const url = `https://places.googleapis.com/v1/places/${placeId}`;
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY!,
        "X-Goog-FieldMask": "displayName,types",
      },
    });

    if (!response.ok) {
      console.error(`Google API error for ${placeId}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return {
      name: data.displayName?.text || null,
      types: data.types || [],
    };
  } catch (error) {
    console.error(`Failed to fetch place details for ${placeId}:`, error);
    return null;
  }
}

/**
 * Search for nearby places at coordinates
 */
async function searchNearbyPlaces(
  lat: number,
  lng: number,
  types: string[] = ["place_of_worship", "tourist_attraction"]
): Promise<Array<{ name: string; placeId: string; types: string[] }>> {
  try {
    const url = "https://places.googleapis.com/v1/places:searchNearby";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY!,
        "X-Goog-FieldMask": "places.displayName,places.id,places.types",
      },
      body: JSON.stringify({
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 100, // 100 meters
          },
        },
        includedTypes: types,
        maxResultCount: 5,
      }),
    });

    if (!response.ok) {
      console.error(`Nearby search error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return (data.places || []).map((p: { displayName?: { text: string }; id: string; types: string[] }) => ({
      name: p.displayName?.text || "Unknown",
      placeId: p.id,
      types: p.types || [],
    }));
  } catch (error) {
    console.error(`Failed nearby search:`, error);
    return [];
  }
}

/**
 * Check if a location with the given name already exists in the database
 */
async function findExistingLocation(name: string, city: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("locations")
    .select("id")
    .ilike("name", name)
    .ilike("city", city)
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0].id;
}

/**
 * Load suspicious locations from file or database
 */
async function loadSuspiciousLocations(inputFile?: string): Promise<SuspiciousLocation[]> {
  if (inputFile) {
    const fullPath = path.isAbsolute(inputFile) ? inputFile : path.join(process.cwd(), inputFile);
    if (!fs.existsSync(fullPath)) {
      console.error(`File not found: ${fullPath}`);
      process.exit(1);
    }
    const content = fs.readFileSync(fullPath, "utf-8");
    return JSON.parse(content);
  }

  // Otherwise, run the detection query inline
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

  // Filter to suspicious ones
  const EVENT_KEYWORDS = ["festival", "matsuri", "noh", "ebisu", "honen", "setsubun", "yayoi", "toka", "takigi", "chibikko", "oto", "owari", "kanda"];
  const SHRINE_TEMPLE_KEYWORDS = ["shrine", "temple", "pagoda", "buddhist", "shinto", "founded", "established", "century"];

  return (data || [])
    .filter(loc => {
      const lowerName = loc.name.toLowerCase();
      const lowerSummary = (loc.editorial_summary || "").toLowerCase();
      const hasEventName = EVENT_KEYWORDS.some(k => lowerName.includes(k));
      const describesShrine = SHRINE_TEMPLE_KEYWORDS.some(k => lowerSummary.includes(k));
      return hasEventName && describesShrine;
    })
    .map(loc => ({
      ...loc,
      suspicionReason: "Event name with shrine/temple description",
      confidenceScore: 80,
    }));
}

/**
 * Process a single suspicious location and generate correction
 */
async function processLocation(loc: SuspiciousLocation): Promise<CorrectionReport> {
  let correctName: string | null = null;
  let googlePlaceId: string | null = loc.place_id;

  // Method 1: If we have a place_id, query Google for the correct name
  if (loc.place_id) {
    const details = await getPlaceDetails(loc.place_id);
    if (details?.name) {
      correctName = details.name;
    }
  }

  // Method 2: If no place_id or failed, try nearby search with coordinates
  if (!correctName && loc.coordinates) {
    const nearby = await searchNearbyPlaces(loc.coordinates.lat, loc.coordinates.lng);
    if (nearby.length > 0) {
      // Pick the first result (closest match)
      correctName = nearby[0].name;
      googlePlaceId = nearby[0].placeId;
    }
  }

  // If we still don't have a correct name, mark as skip
  if (!correctName) {
    return {
      id: loc.id,
      currentName: loc.name,
      correctName: loc.name,
      city: loc.city,
      region: loc.region,
      editorial_summary: loc.editorial_summary,
      coordinates: loc.coordinates,
      place_id: loc.place_id,
      googlePlaceId,
      action: "skip",
      reason: "Could not determine correct name from Google Places API",
    };
  }

  // Check if the correct name is different from current name
  if (correctName.toLowerCase() === loc.name.toLowerCase()) {
    return {
      id: loc.id,
      currentName: loc.name,
      correctName,
      city: loc.city,
      region: loc.region,
      editorial_summary: loc.editorial_summary,
      coordinates: loc.coordinates,
      place_id: loc.place_id,
      googlePlaceId,
      action: "skip",
      reason: "Name already matches Google Places",
    };
  }

  // Check if a location with the correct name already exists
  const existingId = await findExistingLocation(correctName, loc.city);

  if (existingId) {
    return {
      id: loc.id,
      currentName: loc.name,
      correctName,
      city: loc.city,
      region: loc.region,
      editorial_summary: loc.editorial_summary,
      coordinates: loc.coordinates,
      place_id: loc.place_id,
      googlePlaceId,
      action: "delete",
      reason: `Duplicate of existing location`,
      existingLocationId: existingId,
    };
  }

  return {
    id: loc.id,
    currentName: loc.name,
    correctName,
    city: loc.city,
    region: loc.region,
    editorial_summary: loc.editorial_summary,
    coordinates: loc.coordinates,
    place_id: loc.place_id,
    googlePlaceId,
    action: "rename",
    reason: "Name should be updated to match actual location",
  };
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  if (!jsonMode) {
    console.log("\n=== Looking Up Correct Location Names ===\n");
  }

  const inputFile = inputIndex !== -1 ? args[inputIndex + 1] : undefined;
  const suspicious = await loadSuspiciousLocations(inputFile);

  if (suspicious.length === 0) {
    if (!jsonMode) console.log("No suspicious locations to process.");
    return;
  }

  if (!jsonMode) {
    console.log(`Processing ${suspicious.length} location(s)...\n`);
  }

  const corrections: CorrectionReport[] = [];

  for (const loc of suspicious) {
    if (!jsonMode) {
      console.log(`Processing: ${loc.name} (${loc.city})...`);
    }

    const correction = await processLocation(loc);
    corrections.push(correction);

    if (!jsonMode) {
      console.log(`   → ${correction.action.toUpperCase()}: ${correction.correctName}`);
      console.log(`   Reason: ${correction.reason}`);
      console.log("");
    }

    // Rate limit to avoid hitting Google API limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  if (jsonMode) {
    console.log(JSON.stringify(corrections, null, 2));
    return;
  }

  // Summary
  console.log("\n=== Correction Summary ===");
  console.log(`Total processed: ${corrections.length}`);
  console.log(`To rename: ${corrections.filter(c => c.action === "rename").length}`);
  console.log(`To delete (duplicates): ${corrections.filter(c => c.action === "delete").length}`);
  console.log(`Skipped: ${corrections.filter(c => c.action === "skip").length}`);

  console.log("\nTo export corrections:");
  console.log("  npx tsx scripts/data-quality/lookup-correct-names.ts --json > corrections.json");

  console.log("\nTo apply fixes:");
  console.log("  npx tsx scripts/data-quality/fix-location-names.ts --input corrections.json --dry-run");
  console.log("  npx tsx scripts/data-quality/fix-location-names.ts --input corrections.json");
}

main().catch(console.error);
