#!/usr/bin/env tsx
/**
 * Batch geocoding script using Google Places API
 * 
 * This script:
 * 1. Reads all locations from mockLocations.ts
 * 2. Uses Google Places API to find coordinates for locations missing them
 * 3. Updates mockLocations.ts with coordinates
 * 4. Generates locationCoordinates.ts entries
 * 
 * Usage:
 *   GOOGLE_PLACES_API_KEY=your_key npm run tsx scripts/batch-geocode-locations.ts
 * 
 * Or if tsx is not available:
 *   npx tsx scripts/batch-geocode-locations.ts
 */

import { MOCK_LOCATIONS } from "../src/data/mockLocations";
import { env } from "../src/lib/env";
import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { Location } from "../src/types/location";

const PLACES_API_BASE_URL = "https://places.googleapis.com/v1";
const DELAY_BETWEEN_REQUESTS = 200; // ms - to avoid rate limits

interface GeocodeResult {
  locationId: string;
  coordinates: { lat: number; lng: number } | null;
  source: "existing" | "google" | "error";
  error?: string;
  placeId?: string;
}

function getApiKey(): string {
  const key = env.googlePlacesApiKey;
  if (!key) {
    throw new Error(
      "Missing Google Places API key. Set GOOGLE_PLACES_API_KEY in your environment."
    );
  }
  return key;
}

/**
 * Search for a place using Google Places API and get coordinates
 */
async function geocodeWithPlacesAPI(
  query: string,
  regionCode: string = "JP"
): Promise<{ lat: number; lng: number; placeId?: string } | null> {
  const apiKey = getApiKey();

  try {
    const response = await fetch(`${PLACES_API_BASE_URL}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.location",
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "en",
        regionCode,
        pageSize: 1,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error: ${response.status} - ${errorBody}`);
    }

    const data = (await response.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        location?: {
          latitude?: number;
          longitude?: number;
        };
      }>;
    };

    const place = data.places?.[0];
    if (place?.location?.latitude !== undefined && place?.location?.longitude !== undefined) {
      return {
        lat: place.location.latitude,
        lng: place.location.longitude,
        placeId: place.id,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error geocoding "${query}":`, error);
    return null;
  }
}

/**
 * Geocode a single location
 */
async function geocodeLocation(location: Location): Promise<GeocodeResult> {
  // Skip if already has coordinates
  if (location.coordinates) {
    return {
      locationId: location.id,
      coordinates: location.coordinates,
      source: "existing",
    };
  }

  // Build search query
  const query = [location.name, location.city, location.region, "Japan"]
    .filter(Boolean)
    .join(", ");

  // Try geocoding with Google Places API
  const result = await geocodeWithPlacesAPI(query);
  
  if (result) {
    return {
      locationId: location.id,
      coordinates: { lat: result.lat, lng: result.lng },
      source: "google",
      placeId: result.placeId,
    };
  }

  return {
    locationId: location.id,
    coordinates: null,
    source: "error",
    error: `Could not geocode: ${query}`,
  };
}

/**
 * Format coordinates object for TypeScript
 */
function formatCoordinates(coords: { lat: number; lng: number }): string {
  return `{
      lat: ${coords.lat},
      lng: ${coords.lng},
    }`;
}

/**
 * Update mockLocations.ts with coordinates
 * Uses a more robust approach: finds the location object and inserts coordinates before the closing brace
 */
function updateMockLocationsFile(
  results: GeocodeResult[],
  outputPath: string
): void {
  const filePath = join(process.cwd(), "src/data/mockLocations.ts");
  let content = readFileSync(filePath, "utf-8");

  // Process results in reverse order to maintain line positions
  const updates = results
    .filter((r) => r.coordinates && r.source === "google")
    .reverse();

  for (const result of updates) {
    const location = MOCK_LOCATIONS.find((l) => l.id === result.locationId);
    if (!location || location.coordinates) continue;

    // Find the location entry - look for the id field and then find the closing brace
    // We need to match the entire object, accounting for nested objects
    const idPattern = `id:\\s*"${result.locationId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`;
    const idIndex = content.indexOf(idPattern);
    
    if (idIndex === -1) {
      console.warn(`Could not find location ${result.locationId} in file`);
      continue;
    }

    // Find the start of this object (previous opening brace)
    let objectStart = idIndex;
    let braceDepth = 0;
    let foundStart = false;
    
    // Go backwards to find the opening brace
    for (let i = idIndex; i >= 0; i--) {
      if (content[i] === '}') braceDepth++;
      if (content[i] === '{') {
        braceDepth--;
        if (braceDepth === 0) {
          objectStart = i;
          foundStart = true;
          break;
        }
      }
    }

    if (!foundStart) {
      console.warn(`Could not find object start for ${result.locationId}`);
      continue;
    }

    // Find the closing brace for this object
    braceDepth = 1;
    let objectEnd = idIndex;
    for (let i = idIndex; i < content.length; i++) {
      if (content[i] === '{') braceDepth++;
      if (content[i] === '}') {
        braceDepth--;
        if (braceDepth === 0) {
          objectEnd = i;
          break;
        }
      }
    }

    // Check if coordinates already exist in this object
    const objectContent = content.substring(objectStart, objectEnd + 1);
    if (objectContent.includes('coordinates:')) {
      continue; // Already has coordinates
    }

    // Find the last property before the closing brace
    // Look for the last comma or property before the closing brace
    let insertPos = objectEnd;
    for (let i = objectEnd - 1; i >= objectStart; i--) {
      if (content[i] === '}') continue;
      if (content[i] === '\n' || content[i] === ',') {
        // Find the indentation level
        let indent = '';
        for (let j = i + 1; j < objectEnd && (content[j] === ' ' || content[j] === '\t'); j++) {
          indent += content[j];
        }
        // Use the same indentation
        const coordsStr = result.coordinates ? formatCoordinates(result.coordinates) : "null";
        const insertText = `,\n${indent}coordinates: ${coordsStr}`;
        content = content.slice(0, objectEnd) + insertText + content.slice(objectEnd);
        break;
      }
    }
  }

  writeFileSync(outputPath || filePath, content, "utf-8");
}

/**
 * Generate locationCoordinates.ts file
 */
function generateLocationCoordinatesFile(
  results: GeocodeResult[],
  outputPath: string
): void {
  const coordinatesById: Record<string, { lat: number; lng: number }> = {};
  const coordinatesByName: Record<string, { lat: number; lng: number }> = {};

  // Collect all coordinates (including existing ones)
  MOCK_LOCATIONS.forEach((location) => {
    if (location.coordinates) {
      coordinatesById[location.id] = location.coordinates;
      coordinatesByName[location.name.toLowerCase()] = location.coordinates;
    }
  });

  // Add newly geocoded coordinates
  results.forEach((result) => {
    if (result.coordinates) {
      const location = MOCK_LOCATIONS.find((l) => l.id === result.locationId);
      if (location) {
        coordinatesById[location.id] = result.coordinates;
        coordinatesByName[location.name.toLowerCase()] = result.coordinates;
      }
    }
  });

  // Read existing file to preserve format
  const existingFilePath = join(process.cwd(), "src/data/locationCoordinates.ts");
  let existingContent = "";
  try {
    existingContent = readFileSync(existingFilePath, "utf-8");
  } catch {
    // File doesn't exist, create from scratch
  }

  // Generate new content
  const byIdEntries = Object.entries(coordinatesById)
    .map(([id, coords]) => `  "${id}": { lat: ${coords.lat}, lng: ${coords.lng} }`)
    .join(",\n");

  const byNameEntries = Object.entries(coordinatesByName)
    .map(([name, coords]) => `  "${name}": { lat: ${coords.lat}, lng: ${coords.lng} }`)
    .join(",\n");

  const newContent = `export type Coordinates = {
  lat: number;
  lng: number;
};

const LOCATION_COORDINATES_BY_ID: Record<string, Coordinates> = {
${byIdEntries},
};

const LOCATION_COORDINATES_BY_NAME: Record<string, Coordinates> = {
${byNameEntries},
};

export function getCoordinatesForLocationId(id: string): Coordinates | null {
  return LOCATION_COORDINATES_BY_ID[id] ?? null;
}

export function getCoordinatesForName(name: string): Coordinates | null {
  const normalized = name.trim().toLowerCase();
  return LOCATION_COORDINATES_BY_NAME[normalized] ?? null;
}
`;

  writeFileSync(outputPath || existingFilePath, newContent, "utf-8");
}

/**
 * Main execution
 */
async function main() {
  console.log("🚀 Starting batch geocoding with Google Places API\n");
  console.log(`Processing ${MOCK_LOCATIONS.length} locations...\n`);

  const results: GeocodeResult[] = [];
  const locationsToProcess = MOCK_LOCATIONS.filter((l) => !l.coordinates);
  
  console.log(`Found ${locationsToProcess.length} locations without coordinates\n`);

  for (let i = 0; i < locationsToProcess.length; i++) {
    const location = locationsToProcess[i];
    if (!location) continue;
    const result = await geocodeLocation(location);
    results.push(result);

    const progress = ((i + 1) / locationsToProcess.length * 100).toFixed(1);
    const status = result.coordinates ? "✓" : "✗";
    console.log(
      `[${progress}%] ${status} ${location.name} (${location.city})`
    );

    // Delay between requests to avoid rate limits
    if (i < locationsToProcess.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }
  }

  // Generate statistics
  const stats = {
    existing: MOCK_LOCATIONS.filter((l) => l.coordinates).length,
    geocoded: results.filter((r) => r.coordinates && r.source === "google").length,
    errors: results.filter((r) => r.source === "error").length,
    total: MOCK_LOCATIONS.length,
  };

  console.log(`\n=== Results ===`);
  console.log(`Total locations: ${stats.total}`);
  console.log(`Already had coordinates: ${stats.existing}`);
  console.log(`Successfully geocoded: ${stats.geocoded}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Total with coordinates: ${stats.existing + stats.geocoded}/${stats.total}`);

  if (stats.errors > 0) {
    console.log(`\n⚠️  Locations that failed to geocode:`);
    results
      .filter((r) => r.source === "error")
      .forEach((r) => {
        const loc = MOCK_LOCATIONS.find((l) => l.id === r.locationId);
        console.log(`  - ${loc?.name} (${loc?.city}): ${r.error}`);
      });
  }

  // Generate output files
  console.log(`\n📝 Generating output files...`);
  
  // Generate JSON file with updates for manual review
  const tmpDir = join(process.cwd(), "tmp");
  try {
    mkdirSync(tmpDir, { recursive: true });
  } catch {
    // Directory might already exist
  }
  
  const updatesFile = join(tmpDir, "location-coordinates-updates.json");
  const updates = results
    .filter((r) => r.coordinates && r.source === "google")
    .map((r) => ({
      locationId: r.locationId,
      name: MOCK_LOCATIONS.find((l) => l.id === r.locationId)?.name,
      coordinates: r.coordinates,
      placeId: r.placeId,
    }));
  
  writeFileSync(updatesFile, JSON.stringify(updates, null, 2), "utf-8");
  console.log(`✓ Generated ${updatesFile} (${updates.length} updates)`);

  // Update mockLocations.ts with coordinates
  try {
    updateMockLocationsFile(results, "");
    console.log(`✓ Updated src/data/mockLocations.ts`);
  } catch (error) {
    console.warn(`⚠️  Could not automatically update mockLocations.ts:`, error);
    console.log(`   Review ${updatesFile} and manually add coordinates`);
  }

  // Generate locationCoordinates.ts
  generateLocationCoordinatesFile(results, "");
  console.log(`✓ Updated src/data/locationCoordinates.ts`);

  console.log(`\n✅ Batch geocoding complete!`);
  if (updates.length > 0) {
    console.log(`\n📋 Summary:`);
    console.log(`   - ${updates.length} locations geocoded`);
    console.log(`   - Updates saved to: ${updatesFile}`);
    console.log(`   - Files updated: mockLocations.ts, locationCoordinates.ts`);
  }
}

// Run the script
main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});

