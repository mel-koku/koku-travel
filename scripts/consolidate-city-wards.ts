/**
 * City Ward Consolidation Script
 *
 * Normalizes the `city` field in the locations table to use parent city names
 * instead of ward/district names. For example:
 * - "Sakyo Ward" → "Kyoto"
 * - "Nakagyo Ward" → "Kyoto"
 * - "Minato City" → "Tokyo"
 * - "Shibuya" → "Tokyo"
 *
 * This enables proper city filtering in the itinerary generator and provides
 * cleaner city names in the UI.
 *
 * Usage:
 *   npx tsx scripts/consolidate-city-wards.ts --dry-run    # Preview changes
 *   npx tsx scripts/consolidate-city-wards.ts              # Execute migration
 *   npx tsx scripts/consolidate-city-wards.ts --stats      # Show city stats only
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

// =============================================================================
// WARD TO CITY MAPPINGS
// =============================================================================

/**
 * Tokyo's 23 Special Wards (ku) and common variants
 * All map to "Tokyo"
 */
const TOKYO_WARDS = [
  // Core 23 special wards
  "Adachi", "Arakawa", "Bunkyo", "Chiyoda", "Chuo", "Edogawa",
  "Itabashi", "Katsushika", "Kita", "Koto", "Meguro", "Minato",
  "Nakano", "Nerima", "Ota", "Setagaya", "Shibuya", "Shinagawa",
  "Shinjuku", "Suginami", "Sumida", "Taito", "Toshima",
  // Western Tokyo cities (part of Tokyo Metropolis)
  "Hachioji", "Tachikawa", "Musashino", "Mitaka", "Fuchu", "Chofu",
  "Machida", "Koganei", "Kodaira", "Hino", "Higashimurayama",
  "Kokubunji", "Kunitachi", "Fussa", "Komae", "Higashiyamato",
  "Kiyose", "Higashikurume", "Musashimurayama", "Tama", "Inagi",
  "Hamura", "Akiruno", "Nishitokyo",
];

/**
 * Kyoto's 11 Wards (ku)
 * All map to "Kyoto"
 */
const KYOTO_WARDS = [
  "Fushimi", "Higashiyama", "Kamigyo", "Kita", "Minami",
  "Nakagyo", "Nishikyo", "Sakyo", "Shimogyo", "Ukyo", "Yamashina",
];

/**
 * Osaka's 24 Wards (ku)
 * All map to "Osaka"
 */
const OSAKA_WARDS = [
  "Abeno", "Asahi", "Chuo", "Fukushima", "Higashinari",
  "Higashisumiyoshi", "Higashiyodogawa", "Hirano", "Ikuno", "Joto",
  "Kita", "Konohana", "Minato", "Miyakojima", "Naniwa", "Nishi",
  "Nishinari", "Nishiyodogawa", "Suminoe", "Sumiyoshi", "Taisho",
  "Tennoji", "Tsurumi", "Yodogawa",
];

/**
 * Yokohama's 18 Wards (ku)
 * All map to "Yokohama"
 */
const YOKOHAMA_WARDS = [
  "Aoba", "Asahi", "Hodogaya", "Isogo", "Izumi", "Kanagawa",
  "Kanazawa", "Kohoku", "Konan", "Midori", "Minami", "Naka",
  "Nishi", "Sakae", "Seya", "Totsuka", "Tsurumi", "Tsuzuki",
];

/**
 * Kobe's 9 Wards (ku)
 * All map to "Kobe"
 */
const KOBE_WARDS = [
  "Chuo", "Higashinada", "Hyogo", "Kita", "Nagata",
  "Nada", "Nishi", "Suma", "Tarumi",
];

/**
 * Nagoya's 16 Wards (ku)
 * All map to "Nagoya"
 */
const NAGOYA_WARDS = [
  "Atsuta", "Chikusa", "Higashi", "Kita", "Meito", "Midori",
  "Minami", "Minato", "Moriyama", "Naka", "Nakagawa", "Nakamura",
  "Nishi", "Showa", "Tempaku", "Tenpaku",
];

/**
 * Fukuoka's 7 Wards (ku)
 * All map to "Fukuoka"
 */
const FUKUOKA_WARDS = [
  "Chuo", "Hakata", "Higashi", "Jonan", "Minami", "Nishi", "Sawara",
];

/**
 * Sapporo's 10 Wards (ku)
 * All map to "Sapporo"
 */
const SAPPORO_WARDS = [
  "Atsubetsu", "Chuo", "Higashi", "Kita", "Kiyota", "Minami",
  "Nishi", "Shiroishi", "Teine", "Toyohira",
];

/**
 * Sendai's 5 Wards (ku)
 * All map to "Sendai"
 */
const SENDAI_WARDS = [
  "Aoba", "Izumi", "Miyagino", "Taihaku", "Wakabayashi",
];

/**
 * Hiroshima's 8 Wards (ku)
 * All map to "Hiroshima"
 */
const HIROSHIMA_WARDS = [
  "Aki", "Asakita", "Asaminami", "Higashi", "Minami",
  "Naka", "Nishi", "Saeki",
];

/**
 * Kawasaki's 7 Wards (ku)
 * All map to "Kawasaki"
 */
const KAWASAKI_WARDS = [
  "Asao", "Kawasaki", "Miyamae", "Nakahara", "Saiwai", "Takatsu", "Tama",
];

/**
 * Ward names that are ambiguous (same name as a prefecture or major city)
 * These should ONLY be mapped when they have explicit "Ward"/"City"/"-ku" suffix
 *
 * CRITICAL: This list must include ward names that are also independent cities
 * in OTHER regions to prevent cross-region data corruption.
 */
const AMBIGUOUS_WARD_NAMES = new Set([
  // Ward names that are also prefecture names
  "Fukushima", "Chiba", "Nagasaki", "Fukuoka", "Nara", "Gifu", "Nagano",
  // Common ward names shared across multiple cities - need prefecture context
  "Kita", "Minami", "Nishi", "Higashi", "Chuo", "Naka", "Minato",
  "Asahi", "Midori", "Aoba", "Izumi", "Sakae",
  // CRITICAL: Ward names that are also independent cities in OTHER regions
  // These caused data corruption in the January 2026 consolidation
  "Miyakojima",  // Osaka ward AND Okinawa city (Miyakojima-shi)
  "Kanazawa",    // Yokohama ward AND Ishikawa city (capital of Ishikawa prefecture)
  "Moriyama",    // Nagoya ward AND Shiga city (Moriyama-shi in Kansai)
  "Shiroishi",   // Sapporo ward AND Miyagi city (Shiroishi-shi in Tohoku)
  "Konan",       // Yokohama ward AND Kochi city (Konan-shi in Shikoku)
  "Ota",         // Tokyo ward (Ota-ku) AND Gunma city (Ota-shi)
  "Tsurumi",     // Yokohama ward AND Osaka ward (both are wards, but in different cities)
  "Hino",        // Tokyo city (Hino-shi) AND Shiga town (Hino-cho)
  "Tama",        // Kawasaki ward AND Tokyo city (Tama-shi)
]);

/**
 * Prefecture to parent city mapping for ward disambiguation.
 * Uses Google Places prefecture data to determine the correct parent city.
 * This is more accurate than region-based guessing.
 *
 * Note: These prefectures have cities with wards (-ku). The mapping points
 * to the main designated city in each prefecture that uses the ward system.
 */
const PREFECTURE_TO_PARENT_CITY: Record<string, string> = {
  // Designated cities with wards (政令指定都市)
  "Tokyo": "Tokyo",           // 23 special wards
  "Osaka": "Osaka",           // 24 wards
  "Kyoto": "Kyoto",           // 11 wards
  "Hokkaido": "Sapporo",      // 10 wards
  "Kanagawa": "Yokohama",     // 18 wards (Kawasaki also has 7)
  "Hyogo": "Kobe",            // 9 wards
  "Aichi": "Nagoya",          // 16 wards
  "Fukuoka": "Fukuoka",       // 7 wards (Kitakyushu also has 7)
  "Miyagi": "Sendai",         // 5 wards
  "Hiroshima": "Hiroshima",   // 8 wards
  "Niigata": "Niigata",       // 8 wards
  "Shizuoka": "Shizuoka",     // 3 wards (Hamamatsu also has 7)
  "Saitama": "Saitama",       // 10 wards
  "Chiba": "Chiba",           // 6 wards
  "Okayama": "Okayama",       // 4 wards
  "Kumamoto": "Kumamoto",     // 5 wards
  "Kagoshima": "Kagoshima",   // (no wards, but for completeness)
  "Nagasaki": "Nagasaki",     // (no wards, but for completeness)
  "Nara": "Nara",             // (no wards, but for completeness)
  "Oita": "Oita",
  "Ishikawa": "Kanazawa",
  "Toyama": "Toyama",
  "Nagano": "Nagano",
  "Gifu": "Gifu",
  "Mie": "Tsu",
  "Wakayama": "Wakayama",
  "Tottori": "Tottori",
  "Shimane": "Matsue",
  "Yamaguchi": "Yamaguchi",
  "Tokushima": "Tokushima",
  "Kagawa": "Takamatsu",
  "Ehime": "Matsuyama",
  "Kochi": "Kochi",
  "Saga": "Saga",
  "Okinawa": "Naha",
  "Iwate": "Morioka",
  "Akita": "Akita",
  "Yamagata": "Yamagata",
  "Fukushima": "Fukushima",   // Note: Fukushima city, not the ward in Osaka
  "Ibaraki": "Mito",
  "Tochigi": "Utsunomiya",
  "Gunma": "Maebashi",
  "Yamanashi": "Kofu",
  "Shiga": "Otsu",
  "Aomori": "Aomori",
  "Miyazaki": "Miyazaki",
};

/**
 * Build the complete ward-to-city mapping
 */
function buildWardToCityMap(): Map<string, string> {
  const map = new Map<string, string>();

  // Helper to add ward variants - conservative approach for ambiguous names
  function addWardVariants(wards: string[], city: string): void {
    for (const ward of wards) {
      const isAmbiguous = AMBIGUOUS_WARD_NAMES.has(ward);

      // For ambiguous wards, only map explicit suffixed variants
      if (!isAmbiguous) {
        // Base name (e.g., "Shibuya") - only for unambiguous wards
        map.set(ward, city);
        map.set(ward.toLowerCase(), city);
      }

      // With "Ward" suffix (e.g., "Shibuya Ward") - always safe
      map.set(`${ward} Ward`, city);
      map.set(`${ward.toLowerCase()} ward`, city);

      // With "City" suffix (e.g., "Minato City") - always safe
      map.set(`${ward} City`, city);
      map.set(`${ward.toLowerCase()} city`, city);

      // With "-ku" suffix (e.g., "Shibuya-ku") - always safe
      map.set(`${ward}-ku`, city);
      map.set(`${ward.toLowerCase()}-ku`, city);

      // Japanese-style (e.g., "Shibuya Ku") - always safe
      map.set(`${ward} Ku`, city);
      map.set(`${ward.toLowerCase()} ku`, city);
    }
  }

  // Add all city ward mappings
  addWardVariants(TOKYO_WARDS, "Tokyo");
  addWardVariants(KYOTO_WARDS, "Kyoto");
  addWardVariants(OSAKA_WARDS, "Osaka");
  addWardVariants(YOKOHAMA_WARDS, "Yokohama");
  addWardVariants(KOBE_WARDS, "Kobe");
  addWardVariants(NAGOYA_WARDS, "Nagoya");
  addWardVariants(FUKUOKA_WARDS, "Fukuoka");
  addWardVariants(SAPPORO_WARDS, "Sapporo");
  addWardVariants(SENDAI_WARDS, "Sendai");
  addWardVariants(HIROSHIMA_WARDS, "Hiroshima");
  addWardVariants(KAWASAKI_WARDS, "Kawasaki");

  return map;
}

const WARD_TO_CITY_MAP = buildWardToCityMap();

// =============================================================================
// REGION VALIDATION
// =============================================================================

/**
 * Region bounding boxes for coordinate-based validation.
 * Used to prevent cross-region mismatches when consolidating cities.
 */
const REGION_BOUNDS: Record<string, { north: number; south: number; east: number; west: number }> = {
  Hokkaido: { north: 45.5, south: 41.4, east: 145.9, west: 139.3 },
  Tohoku: { north: 41.5, south: 37.0, east: 142.1, west: 139.0 },
  Kanto: { north: 37.0, south: 34.5, east: 140.9, west: 138.2 },
  Chubu: { north: 37.5, south: 34.5, east: 139.2, west: 135.8 },
  Kansai: { north: 36.0, south: 33.4, east: 136.8, west: 134.0 },
  Chugoku: { north: 36.0, south: 33.5, east: 134.5, west: 130.8 },
  Shikoku: { north: 34.5, south: 32.7, east: 134.8, west: 132.0 },
  Kyushu: { north: 34.3, south: 31.0, east: 132.1, west: 129.5 },
  Okinawa: { north: 27.5, south: 24.0, east: 131.5, west: 122.9 },
};

/**
 * Expected region for each parent city (consolidated city).
 * Used to validate that transformations don't create cross-region mismatches.
 */
const CITY_TO_EXPECTED_REGION: Record<string, string> = {
  Tokyo: "Kanto",
  Yokohama: "Kanto",
  Kawasaki: "Kanto",
  Osaka: "Kansai",
  Kyoto: "Kansai",
  Kobe: "Kansai",
  Nagoya: "Chubu",
  Fukuoka: "Kyushu",
  Sapporo: "Hokkaido",
  Sendai: "Tohoku",
  Hiroshima: "Chugoku",
};

/**
 * Check if coordinates fall within a region's bounds.
 */
function isWithinRegionBounds(
  lat: number,
  lng: number,
  regionName: string
): boolean {
  const bounds = REGION_BOUNDS[regionName];
  if (!bounds) return false;
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

/**
 * Find which region contains the given coordinates.
 */
function findRegionByCoordinates(lat: number, lng: number): string | null {
  for (const [region, bounds] of Object.entries(REGION_BOUNDS)) {
    if (
      lat >= bounds.south &&
      lat <= bounds.north &&
      lng >= bounds.west &&
      lng <= bounds.east
    ) {
      return region;
    }
  }
  return null;
}

/**
 * Validate that a city transformation is consistent with the location's region.
 * Returns true if the transformation is valid, false if it would create a mismatch.
 *
 * @param newCity - The target city name (e.g., "Osaka")
 * @param locationRegion - The location's current region (e.g., "Okinawa")
 * @param coordinates - Optional coordinates for additional validation
 */
function validateCityRegionConsistency(
  newCity: string,
  locationRegion: string,
  coordinates?: { lat: number; lng: number } | null
): { valid: boolean; reason?: string } {
  const expectedRegion = CITY_TO_EXPECTED_REGION[newCity];

  // If we don't have an expected region for this city, allow the transformation
  if (!expectedRegion) {
    return { valid: true };
  }

  // Check if location's region matches the expected region for the target city
  if (locationRegion && locationRegion !== expectedRegion) {
    return {
      valid: false,
      reason: `Location region "${locationRegion}" doesn't match expected region "${expectedRegion}" for city "${newCity}"`,
    };
  }

  // Additional coordinate-based validation
  if (coordinates) {
    const coordRegion = findRegionByCoordinates(coordinates.lat, coordinates.lng);
    if (coordRegion && coordRegion !== expectedRegion) {
      return {
        valid: false,
        reason: `Location coordinates (${coordinates.lat}, ${coordinates.lng}) are in "${coordRegion}", not in expected region "${expectedRegion}" for city "${newCity}"`,
      };
    }
  }

  return { valid: true };
}

/**
 * Normalize city name by removing Japanese administrative suffixes
 * and standardizing format
 */
function normalizeCity(city: string): string {
  let normalized = city.trim();

  // Remove common Japanese suffixes
  normalized = normalized
    .replace(/-shi$/i, "")  // e.g., "Kyoto-shi" → "Kyoto"
    .replace(/ City$/i, "") // e.g., "Osaka City" → "Osaka"
    .replace(/-machi$/i, "") // e.g., "Karuizawa-machi" → "Karuizawa"
    .replace(/-cho$/i, "")   // e.g., "Miyama-cho" → "Miyama"
    .replace(/-mura$/i, "")  // e.g., "Shirakawa-mura" → "Shirakawa"
    .replace(/-gun$/i, "")   // e.g., "Sorachi-gun" → "Sorachi"
    .replace(/-ku$/i, "")    // e.g., "Shibuya-ku" → "Shibuya"
    .replace(/ Ward$/i, "")  // e.g., "Shibuya Ward" → "Shibuya"
    .replace(/ Ku$/i, "");   // e.g., "Shibuya Ku" → "Shibuya"

  return normalized;
}

/**
 * Extract ward name from city string (e.g., "Chuo Ward" → "Chuo")
 */
function extractWardName(city: string): string | null {
  // Match patterns like "Chuo Ward", "Chuo City", "Chuo-ku"
  const match = city.match(/^(\w+)\s*(?:Ward|City|Ku|-ku)$/i);
  return match ? match[1] : null;
}

/**
 * Check if this is an ambiguous ward that needs prefecture disambiguation
 */
function isAmbiguousWard(city: string): boolean {
  const wardName = extractWardName(city);
  if (wardName && AMBIGUOUS_WARD_NAMES.has(wardName)) {
    return true;
  }
  // Also check the base name without suffix
  const normalized = normalizeCity(city);
  return AMBIGUOUS_WARD_NAMES.has(normalized);
}

/**
 * Get the parent city for a ward/district name
 * Returns the original city if no mapping found
 *
 * @param city - The city/ward name to resolve
 * @param prefecture - Prefecture from Google Places for accurate disambiguation
 * @param region - Fallback region context (less accurate)
 */
function getParentCity(city: string, prefecture?: string | null, region?: string): string {
  // For ambiguous wards, use prefecture data from Google Places to disambiguate
  if (isAmbiguousWard(city) && prefecture) {
    const parentCity = PREFECTURE_TO_PARENT_CITY[prefecture];
    if (parentCity) {
      return parentCity;
    }
  }

  // Try direct mapping (for unambiguous wards like "Shibuya", "Sakyo Ward")
  const directMatch = WARD_TO_CITY_MAP.get(city);
  if (directMatch) {
    return directMatch;
  }

  // Try lowercase match
  const lowerMatch = WARD_TO_CITY_MAP.get(city.toLowerCase());
  if (lowerMatch) {
    return lowerMatch;
  }

  // Try normalized version
  const normalized = normalizeCity(city);
  const normalizedMatch = WARD_TO_CITY_MAP.get(normalized);
  if (normalizedMatch) {
    return normalizedMatch;
  }

  // Try lowercase normalized
  const lowerNormalizedMatch = WARD_TO_CITY_MAP.get(normalized.toLowerCase());
  if (lowerNormalizedMatch) {
    return lowerNormalizedMatch;
  }

  // Return normalized version (removes suffixes like -shi)
  return normalized;
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

interface LocationRecord {
  id: string;
  name: string;
  city: string;
  city_original: string | null;
  region: string;
  prefecture: string | null;
  coordinates: { lat: number; lng: number } | null;
}

interface MigrationLogEntry {
  id: string;
  name: string;
  oldCity: string;
  newCity: string;
  region: string;
}

interface MigrationLog {
  timestamp: string;
  entries: MigrationLogEntry[];
  stats: {
    totalLocations: number;
    locationsUpdated: number;
    uniqueCitiesBefore: number;
    uniqueCitiesAfter: number;
  };
  // Rollback data - all old city values for easy restoration
  rollbackData?: Array<{ id: string; oldCity: string }>;
}

/**
 * Fetch all locations from the database
 */
async function fetchAllLocations(hasCityOriginalColumn: boolean): Promise<LocationRecord[]> {
  const allLocations: LocationRecord[] = [];
  let from = 0;
  const pageSize = 1000;

  console.log("  Fetching all locations...");

  const columns = hasCityOriginalColumn
    ? "id, name, city, city_original, region, prefecture, coordinates"
    : "id, name, city, region, prefecture, coordinates";

  while (true) {
    const { data, error } = await supabase
      .from("locations")
      .select(columns)
      .range(from, from + pageSize - 1)
      .order("name");

    if (error) {
      console.error("Error fetching locations:", error);
      throw error;
    }

    if (!data || data.length === 0) break;

    // Add city_original: null if column doesn't exist
    const records = (data as LocationRecord[]).map((row) => ({
      ...row,
      city_original: hasCityOriginalColumn ? row.city_original : null,
    }));

    allLocations.push(...records);
    console.log(`    Fetched ${allLocations.length} locations...`);
    from += pageSize;

    if (data.length < pageSize) break;
  }

  return allLocations;
}

/**
 * Add city_original column if it doesn't exist
 */
async function ensureCityOriginalColumn(): Promise<boolean> {
  console.log("  Checking for city_original column...");

  // Try to query the column - if it fails, we need to add it
  const { error } = await supabase
    .from("locations")
    .select("city_original")
    .limit(1);

  if (error && error.message.includes("city_original")) {
    console.log("  Adding city_original column...");

    // Use raw SQL via RPC or manual migration
    // Since Supabase JS client doesn't support ALTER TABLE,
    // we'll create a workaround by attempting an update with the column
    console.log("  ⚠️  Column city_original needs to be added manually:");
    console.log("     Run this SQL in Supabase dashboard:");
    console.log("     ALTER TABLE locations ADD COLUMN IF NOT EXISTS city_original TEXT;");
    return false;
  }

  console.log("  ✓ city_original column exists");
  return true;
}

/**
 * Backup current city values to city_original
 */
async function backupCityValues(locations: LocationRecord[], isDryRun: boolean): Promise<number> {
  const toBackup = locations.filter((loc) => !loc.city_original && loc.city);

  console.log(`\n  Backing up ${toBackup.length} city values to city_original...`);

  if (isDryRun || toBackup.length === 0) {
    return toBackup.length;
  }

  let backed = 0;
  const batchSize = 100;

  for (let i = 0; i < toBackup.length; i += batchSize) {
    const batch = toBackup.slice(i, i + batchSize);

    for (const loc of batch) {
      const { error } = await supabase
        .from("locations")
        .update({ city_original: loc.city })
        .eq("id", loc.id);

      if (error) {
        console.error(`  Error backing up "${loc.name}":`, error.message);
        continue;
      }
      backed++;
    }

    if ((i + batchSize) % 500 === 0 || i + batchSize >= toBackup.length) {
      console.log(`    Backed up ${Math.min(i + batchSize, toBackup.length)}/${toBackup.length}`);
    }
  }

  console.log(`  ✓ Backed up ${backed} city values`);
  return backed;
}

/**
 * Apply city consolidation
 */
async function consolidateCities(
  locations: LocationRecord[],
  isDryRun: boolean
): Promise<{ updated: number; entries: MigrationLogEntry[]; skipped: number }> {
  const entries: MigrationLogEntry[] = [];
  const updates: { id: string; newCity: string }[] = [];
  const skippedEntries: { name: string; city: string; newCity: string; reason: string }[] = [];

  console.log("\n  Analyzing city values...");

  // Track locations without prefecture for reporting
  let missingPrefecture = 0;

  for (const loc of locations) {
    if (!loc.city) continue;

    // Use prefecture for accurate disambiguation (from Google Places data)
    const newCity = getParentCity(loc.city, loc.prefecture, loc.region);

    if (!loc.prefecture && isAmbiguousWard(loc.city)) {
      missingPrefecture++;
    }

    if (newCity !== loc.city) {
      // CRITICAL: Validate that this transformation doesn't create a cross-region mismatch
      const validation = validateCityRegionConsistency(newCity, loc.region, loc.coordinates);

      if (!validation.valid) {
        // Skip this transformation - it would create data corruption
        skippedEntries.push({
          name: loc.name,
          city: loc.city,
          newCity,
          reason: validation.reason ?? "Unknown validation error",
        });
        continue;
      }

      entries.push({
        id: loc.id,
        name: loc.name,
        oldCity: loc.city,
        newCity,
        region: loc.region,
      });
      updates.push({ id: loc.id, newCity });
    }
  }

  console.log(`  Found ${updates.length} locations to consolidate`);
  if (skippedEntries.length > 0) {
    console.log(`  🛡️  Skipped ${skippedEntries.length} locations due to region validation (prevented cross-region corruption)`);
    for (const skipped of skippedEntries.slice(0, 10)) {
      console.log(`      - "${skipped.name}": "${skipped.city}" → "${skipped.newCity}" blocked (${skipped.reason})`);
    }
    if (skippedEntries.length > 10) {
      console.log(`      ... and ${skippedEntries.length - 10} more skipped`);
    }
  }
  if (missingPrefecture > 0) {
    console.log(`  ⚠️  ${missingPrefecture} ambiguous wards without prefecture data (may need manual review)`);
  }
  console.log("");

  // Group by transformation for summary
  const transformations = new Map<string, number>();
  for (const entry of entries) {
    const key = `"${entry.oldCity}" → "${entry.newCity}"`;
    transformations.set(key, (transformations.get(key) || 0) + 1);
  }

  console.log("  Transformations:");
  const sortedTransformations = Array.from(transformations.entries())
    .sort((a, b) => b[1] - a[1]);

  for (const [transformation, count] of sortedTransformations.slice(0, 20)) {
    console.log(`    ${transformation}: ${count} locations`);
  }
  if (sortedTransformations.length > 20) {
    console.log(`    ... and ${sortedTransformations.length - 20} more transformations`);
  }

  if (isDryRun || updates.length === 0) {
    return { updated: updates.length, entries, skipped: skippedEntries.length };
  }

  // Execute updates
  console.log("\n  Applying updates...");
  let updated = 0;

  for (let i = 0; i < updates.length; i++) {
    const { id, newCity } = updates[i];

    const { error } = await supabase
      .from("locations")
      .update({ city: newCity })
      .eq("id", id);

    if (error) {
      console.error(`  Error updating location ${id}:`, error.message);
      continue;
    }
    updated++;

    if ((i + 1) % 100 === 0 || i + 1 === updates.length) {
      console.log(`    Updated ${i + 1}/${updates.length}`);
    }
  }

  console.log(`  ✓ Updated ${updated} locations`);
  return { updated, entries, skipped: skippedEntries.length };
}

/**
 * Get unique city statistics
 */
async function getCityStats(): Promise<{ cities: Map<string, number>; total: number }> {
  const { data, error } = await supabase
    .from("locations")
    .select("city");

  if (error) {
    console.error("Error fetching city stats:", error);
    return { cities: new Map(), total: 0 };
  }

  const cities = new Map<string, number>();
  for (const row of data || []) {
    const city = row.city || "unknown";
    cities.set(city, (cities.get(city) || 0) + 1);
  }

  return { cities, total: data?.length || 0 };
}

/**
 * Log migration results to file
 */
function logMigration(log: MigrationLog): void {
  const logFile = `scripts/city-consolidation-log-${new Date().toISOString().split("T")[0]}.json`;
  fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
  console.log(`\n  Logged migration to ${logFile}`);
}

// =============================================================================
// MAIN
// =============================================================================

async function showStats(): Promise<void> {
  console.log("\n=== City Statistics ===\n");

  const { cities, total } = await getCityStats();

  console.log(`Total locations: ${total}`);
  console.log(`Unique cities: ${cities.size}\n`);

  // Show top cities
  const sortedCities = Array.from(cities.entries())
    .sort((a, b) => b[1] - a[1]);

  console.log("Top 30 cities by location count:");
  for (const [city, count] of sortedCities.slice(0, 30)) {
    const parentCity = getParentCity(city);
    const indicator = parentCity !== city ? ` → ${parentCity}` : "";
    console.log(`  ${city}: ${count}${indicator}`);
  }

  // Count how many would be consolidated
  let wouldConsolidate = 0;
  for (const [city, count] of cities.entries()) {
    if (getParentCity(city) !== city) {
      wouldConsolidate += count;
    }
  }

  console.log(`\nLocations that would be consolidated: ${wouldConsolidate}`);

  // Estimate unique cities after consolidation
  const afterCities = new Set<string>();
  for (const city of cities.keys()) {
    afterCities.add(getParentCity(city));
  }
  console.log(`Estimated unique cities after: ${afterCities.size}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const showStatsOnly = args.includes("--stats");

  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║         Koku Travel - City Ward Consolidation Script           ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  if (showStatsOnly) {
    await showStats();
    return;
  }

  if (isDryRun) {
    console.log("\n🔍 DRY RUN MODE - No changes will be made\n");
  }

  // Step 1: Check if city_original column exists
  const hasColumn = await ensureCityOriginalColumn();

  // Step 2: Get before stats
  const beforeStats = await getCityStats();
  console.log(`\nBefore: ${beforeStats.cities.size} unique cities across ${beforeStats.total} locations`);

  // Step 3: Fetch all locations
  const locations = await fetchAllLocations(hasColumn);

  // Step 4: Backup city values to database column if available, otherwise to log file
  let backed = 0;
  if (hasColumn) {
    backed = await backupCityValues(locations, isDryRun);
  } else {
    // Backup will be saved in the migration log file
    backed = locations.filter((l) => l.city).length;
    if (!isDryRun) {
      console.log(`\n  ℹ️  city_original column not available - backup will be saved in log file`);
    }
  }

  // Step 5: Consolidate cities
  const { updated, entries, skipped } = await consolidateCities(locations, isDryRun);

  // Step 6: Get after stats (for dry run, calculate from entries)
  let afterCityCount: number;
  if (isDryRun) {
    const afterCities = new Set<string>();
    for (const [city] of beforeStats.cities.entries()) {
      afterCities.add(getParentCity(city));
    }
    afterCityCount = afterCities.size;
  } else {
    const afterStats = await getCityStats();
    afterCityCount = afterStats.cities.size;
  }

  // Step 7: Log results with rollback data
  const rollbackData = entries.map((e) => ({ id: e.id, oldCity: e.oldCity }));
  const log: MigrationLog = {
    timestamp: new Date().toISOString(),
    entries,
    stats: {
      totalLocations: beforeStats.total,
      locationsUpdated: updated,
      uniqueCitiesBefore: beforeStats.cities.size,
      uniqueCitiesAfter: afterCityCount,
    },
    rollbackData, // For easy restoration if needed
  };

  if (!isDryRun && entries.length > 0) {
    logMigration(log);
  }

  // Summary
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║                           SUMMARY                              ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  if (isDryRun) {
    console.log(`\n📊 Would backup: ${backed} city values`);
    console.log(`📊 Would update: ${updated} locations`);
    if (skipped > 0) {
      console.log(`🛡️  Skipped: ${skipped} locations (prevented cross-region corruption)`);
    }
    console.log(`📊 Cities: ${beforeStats.cities.size} → ${afterCityCount}`);
    console.log("\n[DRY RUN] No changes made. Remove --dry-run to execute.");
  } else {
    console.log(`\n📊 Backed up: ${backed} city values`);
    console.log(`📊 Updated: ${updated} locations`);
    if (skipped > 0) {
      console.log(`🛡️  Skipped: ${skipped} locations (prevented cross-region corruption)`);
    }
    console.log(`📊 Cities: ${beforeStats.cities.size} → ${afterCityCount}`);
  }

  console.log("\n✅ Done!");
}

main().catch(console.error);
