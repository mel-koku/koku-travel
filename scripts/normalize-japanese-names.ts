/**
 * Normalize Japanese Names Script
 *
 * Finds locations with Japanese characters in their names or city fields
 * and fetches English names from Google Places API.
 *
 * Usage:
 *   npx tsx scripts/normalize-japanese-names.ts --dry-run    # Preview changes
 *   npx tsx scripts/normalize-japanese-names.ts              # Execute
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

if (!googleApiKey) {
  console.error("Missing GOOGLE_PLACES_API_KEY environment variable");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Japanese character pattern (Hiragana, Katakana, Kanji)
const JAPANESE_PATTERN = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\uff00-\uffef]/;

interface LocationRecord {
  id: string;
  name: string;
  city: string;
  placeId: string | null;
}

interface PlaceDetails {
  displayName?: {
    text: string;
    languageCode: string;
  };
  formattedAddress?: string;
  addressComponents?: Array<{
    longText: string;
    shortText: string;
    types: string[];
    languageCode: string;
  }>;
}

/**
 * Check if a string contains Japanese characters
 */
function hasJapanese(str: string): boolean {
  return JAPANESE_PATTERN.test(str);
}

/**
 * Check if two names are similar (share at least one significant word)
 */
function areNamesSimilar(original: string, googleName: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const originalWords = normalize(stripJapanese(original) || original);
  const googleWords = normalize(googleName);

  // Check if any significant word from original appears in Google name
  return originalWords.some((word) => googleWords.some((gw) => gw.includes(word) || word.includes(gw)));
}

/**
 * Strip Japanese characters from a string, keeping only ASCII and common punctuation
 * Returns null if the result would be empty or only punctuation
 */
function stripJapanese(str: string): string | null {
  const stripped = str
    .replace(new RegExp(JAPANESE_PATTERN.source, "g"), "")
    .replace(/\s+/g, " ")
    .trim();

  // Return null if result is empty or only has non-letter characters
  if (!stripped || !/[a-zA-Z]/.test(stripped)) {
    return null;
  }

  return stripped;
}

/**
 * Fetch place details from Google Places API (New)
 */
async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const url = `https://places.googleapis.com/v1/places/${placeId}?languageCode=en`;

  try {
    const response = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": googleApiKey,
        "X-Goog-FieldMask": "displayName,formattedAddress,addressComponents",
      },
    });

    if (!response.ok) {
      console.error(`  Failed to fetch place ${placeId}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`  Error fetching place ${placeId}:`, error);
    return null;
  }
}

/**
 * Extract English city name from address components
 */
function extractCityFromAddress(details: PlaceDetails): string | null {
  if (!details.addressComponents) return null;

  // Look for locality or administrative area
  for (const component of details.addressComponents) {
    if (!component.types) continue;
    if (
      component.types.includes("locality") ||
      component.types.includes("administrative_area_level_2")
    ) {
      // Only return if it's in English (no Japanese)
      if (!hasJapanese(component.longText)) {
        return component.longText;
      }
    }
  }

  return null;
}

/**
 * Fetch all locations with Japanese characters
 */
async function fetchLocationsWithJapanese(): Promise<LocationRecord[]> {
  const allLocations: LocationRecord[] = [];
  let from = 0;
  const pageSize = 1000;

  console.log("  Fetching all locations...");

  while (true) {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, city, placeId:place_id")
      .range(from, from + pageSize - 1)
      .order("name");

    if (error) {
      console.error("Error fetching locations:", error);
      throw error;
    }

    if (!data || data.length === 0) break;

    // Filter to only those with Japanese characters
    const withJapanese = data.filter(
      (loc) => hasJapanese(loc.name) || hasJapanese(loc.city || "")
    );
    allLocations.push(...(withJapanese as LocationRecord[]));

    from += pageSize;
    if (data.length < pageSize) break;
  }

  return allLocations;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║         Normalize Japanese Names Script                        ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  if (isDryRun) {
    console.log("\n🔍 DRY RUN MODE - No changes will be made\n");
  }

  // Fetch locations with Japanese characters
  const locations = await fetchLocationsWithJapanese();
  console.log(`\nFound ${locations.length} locations with Japanese characters\n`);

  if (locations.length === 0) {
    console.log("✅ No locations need normalization");
    return;
  }

  const updates: Array<{
    id: string;
    oldName: string;
    newName: string;
    oldCity: string;
    newCity: string;
  }> = [];

  // Process each location
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    console.log(`[${i + 1}/${locations.length}] Processing: ${loc.name}`);

    let newName = loc.name;
    let newCity = loc.city;

    // If we have a placeId, try to get English name from Google
    if (loc.placeId) {
      const details = await fetchPlaceDetails(loc.placeId);
      const stripped = stripJapanese(loc.name);

      if (details?.displayName?.text && !hasJapanese(details.displayName.text)) {
        const googleName = details.displayName.text;
        // Only use Google name if it's similar to original, otherwise prefer stripped
        if (areNamesSimilar(loc.name, googleName)) {
          newName = googleName;
          console.log(`    Name: "${loc.name}" → "${newName}"`);
        } else if (stripped) {
          // Google name is very different, prefer stripped version
          newName = stripped;
          console.log(`    Name (stripped, Google differed): "${loc.name}" → "${newName}"`);
        } else {
          // No stripped version available, use Google name anyway
          newName = googleName;
          console.log(`    Name (Google, no match): "${loc.name}" → "${newName}"`);
        }
      } else {
        // Fallback: strip Japanese characters
        if (stripped) {
          newName = stripped;
          console.log(`    Name (stripped): "${loc.name}" → "${newName}"`);
        } else {
          console.log(`    Name: "${loc.name}" → (keeping original, no English found)`);
        }
      }

      // Try to get English city from address components
      if (hasJapanese(loc.city) && details) {
        const englishCity = extractCityFromAddress(details);
        if (englishCity) {
          newCity = englishCity;
          console.log(`    City: "${loc.city}" → "${newCity}"`);
        } else {
          const strippedCity = stripJapanese(loc.city);
          if (strippedCity) {
            newCity = strippedCity;
            console.log(`    City (stripped): "${loc.city}" → "${newCity}"`);
          } else {
            console.log(`    City: "${loc.city}" → (keeping original, no English found)`);
          }
        }
      } else if (hasJapanese(loc.city)) {
        const strippedCity = stripJapanese(loc.city);
        if (strippedCity) {
          newCity = strippedCity;
          console.log(`    City (stripped): "${loc.city}" → "${newCity}"`);
        }
      }

      // Rate limit: 1 request per 100ms to avoid hitting API limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    } else {
      // No placeId, just strip Japanese characters
      newName = stripJapanese(loc.name);
      if (hasJapanese(loc.city)) {
        newCity = stripJapanese(loc.city);
      }
      console.log(`    (no placeId) Stripped: "${loc.name}" → "${newName}"`);
    }

    // Record the update if there's a change
    if (newName !== loc.name || newCity !== loc.city) {
      updates.push({
        id: loc.id,
        oldName: loc.name,
        newName,
        oldCity: loc.city,
        newCity,
      });
    }
  }

  console.log(`\n${updates.length} locations to update\n`);

  // Apply updates
  if (!isDryRun && updates.length > 0) {
    console.log("Applying updates...");
    let updated = 0;

    for (const update of updates) {
      const { error } = await supabase
        .from("locations")
        .update({
          name: update.newName,
          city: update.newCity,
        })
        .eq("id", update.id);

      if (error) {
        console.error(`  Error updating ${update.id}:`, error.message);
        continue;
      }
      updated++;
    }

    console.log(`✅ Updated ${updated} locations`);
  }

  // Summary
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║                           SUMMARY                              ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  if (isDryRun) {
    console.log(`\n📊 Would update: ${updates.length} locations`);
    console.log("\n[DRY RUN] No changes made. Remove --dry-run to execute.");
  } else {
    console.log(`\n📊 Updated: ${updates.length} locations`);
  }

  // Show sample updates
  if (updates.length > 0) {
    console.log("\nSample updates:");
    for (const update of updates.slice(0, 10)) {
      console.log(`  "${update.oldName}" → "${update.newName}"`);
      if (update.oldCity !== update.newCity) {
        console.log(`    City: "${update.oldCity}" → "${update.newCity}"`);
      }
    }
    if (updates.length > 10) {
      console.log(`  ... and ${updates.length - 10} more`);
    }
  }

  console.log("\n✅ Done!");
}

main().catch(console.error);
