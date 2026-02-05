#!/usr/bin/env tsx
/**
 * Google Places Enrichment for Locations Missing place_id
 *
 * This script enriches locations that don't have a place_id using a single
 * Google Places Text Search API call per location with a comprehensive field mask.
 *
 * Features:
 * - Single API call per location (cost-optimized)
 * - Comprehensive field mask (22+ fields)
 * - Photo reference extraction (proxy URL)
 * - Progress tracking with percentage
 * - Detailed JSON log file
 * - Error handling with continuation
 *
 * Usage:
 *   npx tsx scripts/enrich-missing-places.ts --dry-run    # Preview (no API calls)
 *   npx tsx scripts/enrich-missing-places.ts --test       # Process only 10 locations (~$0.40)
 *   npx tsx scripts/enrich-missing-places.ts --limit 100  # Process 100 locations (~$4)
 *   npx tsx scripts/enrich-missing-places.ts              # Full enrichment (~$72)
 *
 * Cost: ~$40 per 1,000 locations (Preferred tier)
 * Time: ~6-7 minutes for 1,801 locations with rate limiting
 */

import { config } from "dotenv";
const result = config({ path: ".env.local" });

if (result.error) {
  console.error("Failed to load .env.local:", result.error);
  process.exit(1);
}

// Verify required environment variables
if (!process.env.GOOGLE_PLACES_API_KEY) {
  console.error(
    "Error: GOOGLE_PLACES_API_KEY must be configured in .env.local"
  );
  console.error(
    "Get your API key from: https://console.cloud.google.com/apis/credentials"
  );
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL must be configured in .env.local"
  );
  process.exit(1);
}

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import type {
  LocationOperatingHours,
  LocationOperatingPeriod,
  Weekday,
} from "../src/types/location";

// Google Places API configuration
const PLACES_API_BASE_URL = "https://places.googleapis.com/v1";
const RATE_LIMIT_MS = 200; // 200ms between requests (5 req/sec)

// Cost per 1000 requests for Preferred tier
const COST_PER_1000 = 40;

// Comprehensive field mask for Text Search API
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.types",
  "places.businessStatus",
  "places.priceLevel",
  "places.rating",
  "places.userRatingCount",
  "places.addressComponents",
  "places.regularOpeningHours",
  "places.editorialSummary",
  "places.goodForChildren",
  "places.goodForGroups",
  "places.outdoorSeating",
  "places.reservable",
  "places.accessibilityOptions",
  "places.servesVegetarianFood",
  "places.dineIn",
  "places.takeout",
  "places.delivery",
  "places.servesBreakfast",
  "places.servesBrunch",
  "places.servesLunch",
  "places.servesDinner",
  "places.photos",
].join(",");

// Mapping from Google Places primaryType to our category system
const GOOGLE_TYPE_TO_CATEGORY: Record<string, string> = {
  // Religious / Temples / Shrines
  buddhist_temple: "temple",
  hindu_temple: "shrine",
  shinto_shrine: "shrine",
  place_of_worship: "shrine",
  church: "shrine",
  mosque: "shrine",
  synagogue: "shrine",

  // Cultural / Landmarks
  museum: "museum",
  art_gallery: "museum",
  castle: "landmark",
  cultural_landmark: "landmark",
  tourist_attraction: "landmark",
  historical_landmark: "landmark",
  monument: "landmark",
  landmark: "landmark",
  cultural_center: "culture",

  // Food & Drink
  restaurant: "restaurant",
  cafe: "restaurant",
  coffee_shop: "restaurant",
  bar: "bar",
  pub: "bar",
  wine_bar: "bar",
  cocktail_bar: "bar",
  bakery: "restaurant",
  ramen_restaurant: "restaurant",
  sushi_restaurant: "restaurant",
  japanese_restaurant: "restaurant",
  fast_food_restaurant: "restaurant",
  meal_takeaway: "restaurant",
  meal_delivery: "restaurant",
  ice_cream_shop: "restaurant",
  food: "food",
  food_court: "food",

  // Nature
  park: "park",
  national_park: "nature",
  state_park: "nature",
  zoo: "nature",
  aquarium: "nature",
  botanical_garden: "nature",
  garden: "park",
  beach: "nature",
  campground: "nature",
  natural_feature: "nature",
  hiking_area: "nature",

  // Shopping
  shopping_mall: "shopping",
  market: "market",
  grocery_store: "market",
  supermarket: "market",
  convenience_store: "shopping",
  store: "shopping",
  clothing_store: "shopping",
  department_store: "shopping",
  electronics_store: "shopping",
  bookstore: "shopping",
  gift_shop: "shopping",
  souvenir_store: "shopping",

  // Entertainment
  movie_theater: "entertainment",
  performing_arts_theater: "entertainment",
  amusement_park: "entertainment",
  theme_park: "entertainment",
  bowling_alley: "entertainment",
  night_club: "bar",

  // Sports
  stadium: "landmark",
  sports_complex: "entertainment",
  gym: "entertainment",
  spa: "wellness",

  // Transportation
  train_station: "landmark",
  transit_station: "landmark",
  airport: "landmark",
  bus_station: "landmark",

  // Viewpoints
  observation_deck: "viewpoint",
  scenic_viewpoint: "viewpoint",
  lookout: "viewpoint",

  // Other
  hotel: "accommodation",
  lodging: "accommodation",
  hot_spring: "wellness",
  onsen: "wellness",
};

interface LocationRow {
  id: string;
  name: string;
  category: string;
  city: string;
  region: string;
  place_id: string | null;
  coordinates: { lat: number; lng: number } | null;
}

interface AddressComponent {
  longText: string;
  shortText: string;
  types: string[];
}

interface PlacePhoto {
  name: string;
  widthPx?: number;
  heightPx?: number;
}

interface TextSearchPlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  primaryType?: string;
  types?: string[];
  businessStatus?: string;
  priceLevel?: string;
  rating?: number;
  userRatingCount?: number;
  addressComponents?: AddressComponent[];
  regularOpeningHours?: {
    periods: Array<{
      open: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }>;
  };
  editorialSummary?: { text: string };
  goodForChildren?: boolean;
  goodForGroups?: boolean;
  outdoorSeating?: boolean;
  reservable?: boolean;
  accessibilityOptions?: {
    wheelchairAccessibleEntrance?: boolean;
    wheelchairAccessibleParking?: boolean;
    wheelchairAccessibleRestroom?: boolean;
    wheelchairAccessibleSeating?: boolean;
  };
  servesVegetarianFood?: boolean;
  dineIn?: boolean;
  takeout?: boolean;
  delivery?: boolean;
  servesBreakfast?: boolean;
  servesBrunch?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  photos?: PlacePhoto[];
}

interface EnrichmentResult {
  id: string;
  name: string;
  success: boolean;
  placeId?: string;
  googleName?: string;
  category?: string;
  hasCoordinates?: boolean;
  hasRating?: boolean;
  hasOperatingHours?: boolean;
  hasMealOptions?: boolean;
  hasPrimaryPhoto?: boolean;
  hasNeighborhood?: boolean;
  notFound?: boolean;
  error?: string;
}

interface EnrichmentLog {
  timestamp: string;
  mode: string;
  totalProcessed: number;
  successful: number;
  notFound: number;
  rejected: number;
  errors: number;
  results: EnrichmentResult[];
  rejectedMatches: Array<{ id: string; name: string; reason: string }>;
  coverage: {
    placeId: number;
    coordinates: number;
    rating: number;
    operatingHours: number;
    mealOptions: number;
    primaryPhotoUrl: number;
    neighborhood: number;
  };
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert Google Places priceLevel string to numeric value
 */
function parsePriceLevel(priceLevel?: string): number | null {
  if (!priceLevel) return null;

  const mapping: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };

  return mapping[priceLevel] ?? null;
}

/**
 * Extract neighborhood from Google Places addressComponents
 */
function extractNeighborhood(
  addressComponents?: AddressComponent[]
): string | null {
  if (!addressComponents) return null;

  const neighborhoodTypes = [
    "neighborhood",
    "sublocality_level_1",
    "sublocality",
    "sublocality_level_2",
  ];

  for (const type of neighborhoodTypes) {
    const component = addressComponents.find((c) => c.types?.includes(type));
    if (component) return component.longText;
  }
  return null;
}

/**
 * Convert Google Places regularOpeningHours to our format
 */
function convertOpeningHours(
  regularOpeningHours?: TextSearchPlace["regularOpeningHours"]
): LocationOperatingHours | null {
  if (!regularOpeningHours?.periods || regularOpeningHours.periods.length === 0) {
    return null;
  }

  const dayNames: Weekday[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const periods: LocationOperatingPeriod[] = [];

  for (const p of regularOpeningHours.periods) {
    if (!p.open || p.open.hour === undefined || p.open.minute === undefined) {
      continue;
    }

    // Handle 24-hour periods (no close time means open 24 hours)
    if (!p.close || p.close.hour === undefined) {
      periods.push({
        day: dayNames[p.open.day],
        open: "00:00",
        close: "23:59",
        isOvernight: false,
      });
      continue;
    }

    periods.push({
      day: dayNames[p.open.day],
      open: `${String(p.open.hour).padStart(2, "0")}:${String(p.open.minute).padStart(2, "0")}`,
      close: `${String(p.close.hour).padStart(2, "0")}:${String(p.close.minute).padStart(2, "0")}`,
      isOvernight: p.close.day !== p.open.day,
    });
  }

  if (periods.length === 0) return null;

  return { timezone: "Asia/Tokyo", periods };
}

/**
 * Derive category from Google's types
 */
function deriveCategory(place: TextSearchPlace, currentCategory: string): string {
  if (place.primaryType) {
    const mapped = GOOGLE_TYPE_TO_CATEGORY[place.primaryType];
    if (mapped) return mapped;
  }

  if (place.types) {
    for (const type of place.types) {
      const mapped = GOOGLE_TYPE_TO_CATEGORY[type];
      if (mapped) return mapped;
    }
  }

  return currentCategory;
}

/**
 * Build photo proxy URL from Google Places photo reference
 */
function buildPhotoProxyUrl(photo?: PlacePhoto): string | null {
  if (!photo?.name) return null;
  // The photo name is the resource path that can be used with the photo API
  // We store it as-is and use our proxy endpoint to serve it
  return `/api/places/photo?reference=${encodeURIComponent(photo.name)}&maxwidth=800`;
}

/**
 * Types that are completely incompatible with food/restaurant locations
 * If Google returns one of these for a food location, it's a bad match
 */
const INCOMPATIBLE_TYPES_FOR_FOOD = [
  "airport",
  "train_station",
  "bus_station",
  "hospital",
  "school",
  "university",
  "government_office",
  "police",
  "fire_station",
  "post_office",
  "bank",
  "atm",
  "gas_station",
  "car_wash",
  "car_repair",
  "parking",
];

/**
 * Types that are completely incompatible with shrine/temple locations
 */
const INCOMPATIBLE_TYPES_FOR_RELIGIOUS = [
  "airport",
  "restaurant",
  "cafe",
  "bar",
  "hotel",
  "shopping_mall",
  "hospital",
  "school",
];

/**
 * Calculate string similarity (Jaccard index on words)
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 1);

  const arr1 = normalize(name1);
  const arr2 = normalize(name2);

  if (arr1.length === 0 || arr2.length === 0) return 0;

  const set2 = new Set(arr2);
  const intersectionCount = arr1.filter((w) => set2.has(w)).length;
  const unionCount = new Set([...arr1, ...arr2]).size;

  return intersectionCount / unionCount;
}

/**
 * Calculate distance between two coordinates in kilometers (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface MatchValidation {
  isValid: boolean;
  reason?: string;
  nameSimilarity?: number;
  distanceKm?: number;
}

/**
 * Validate if a Google Places result is a reasonable match for our location
 */
function validateMatch(
  location: LocationRow,
  place: TextSearchPlace
): MatchValidation {
  const googleName = place.displayName?.text || "";
  const googleType = place.primaryType || "";
  const googleTypes = place.types || [];
  const ourCategory = location.category?.toLowerCase() || "";

  // 1. Check for type incompatibility (HIGH PRIORITY - prevents airport mismatches)
  if (["food", "restaurant", "cafe", "bar"].includes(ourCategory)) {
    if (
      INCOMPATIBLE_TYPES_FOR_FOOD.includes(googleType) ||
      googleTypes.some((t) => INCOMPATIBLE_TYPES_FOR_FOOD.includes(t))
    ) {
      return {
        isValid: false,
        reason: `Type mismatch: our category "${ourCategory}" but Google type is "${googleType}"`,
      };
    }
  }

  if (["shrine", "temple"].includes(ourCategory)) {
    if (
      INCOMPATIBLE_TYPES_FOR_RELIGIOUS.includes(googleType) ||
      googleTypes.some((t) => INCOMPATIBLE_TYPES_FOR_RELIGIOUS.includes(t))
    ) {
      return {
        isValid: false,
        reason: `Type mismatch: our category "${ourCategory}" but Google type is "${googleType}"`,
      };
    }
  }

  // 2. Check for airport type when location name doesn't contain "airport"
  if (
    (googleType === "airport" || googleTypes.includes("airport")) &&
    !location.name.toLowerCase().includes("airport")
  ) {
    return {
      isValid: false,
      reason: `Google returned airport but location name "${location.name}" doesn't contain "airport"`,
    };
  }

  // 3. Check name similarity
  const nameSimilarity = calculateNameSimilarity(location.name, googleName);

  // If name similarity is very low and Google returned a major type mismatch, reject
  if (nameSimilarity < 0.1) {
    // Check if this is a major facility that's unlikely to be our location
    const majorFacilityTypes = [
      "airport",
      "train_station",
      "hospital",
      "university",
      "stadium",
      "shopping_mall",
    ];
    if (
      majorFacilityTypes.includes(googleType) ||
      googleTypes.some((t) => majorFacilityTypes.includes(t))
    ) {
      return {
        isValid: false,
        reason: `Low name similarity (${(nameSimilarity * 100).toFixed(0)}%) and Google returned major facility type "${googleType}"`,
        nameSimilarity,
      };
    }
  }

  // 4. If we have coordinates, check distance
  if (location.coordinates && place.location) {
    const distance = calculateDistance(
      location.coordinates.lat,
      location.coordinates.lng,
      place.location.latitude,
      place.location.longitude
    );

    // If distance > 50km and name similarity is low, likely a bad match
    if (distance > 50 && nameSimilarity < 0.3) {
      return {
        isValid: false,
        reason: `Location too far (${distance.toFixed(0)}km) with low name similarity (${(nameSimilarity * 100).toFixed(0)}%)`,
        nameSimilarity,
        distanceKm: distance,
      };
    }
  }

  return { isValid: true, nameSimilarity };
}

/**
 * Search for a place using Text Search API with validation
 */
async function searchPlace(
  location: LocationRow
): Promise<{ place: TextSearchPlace | null; rejected?: string }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Google Places API key");
  }

  // Build search query
  const query = `${location.name}, ${location.city}, ${location.region}, Japan`;

  try {
    const response = await fetch(`${PLACES_API_BASE_URL}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "en",
        regionCode: "JP",
        maxResultCount: 1,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error: ${response.status} - ${errorBody}`);
    }

    const data = (await response.json()) as { places?: TextSearchPlace[] };

    if (!data.places || data.places.length === 0) {
      return { place: null };
    }

    const place = data.places[0];

    // IMPORTANT: Validate the match before accepting it
    const validation = validateMatch(location, place);
    if (!validation.isValid) {
      return { place: null, rejected: validation.reason };
    }

    return { place };
  } catch (error) {
    console.error(`  Error searching for "${location.name}":`, error);
    return { place: null };
  }
}

/**
 * Main enrichment function
 */
async function enrichMissingPlaces(options: {
  dryRun: boolean;
  limit?: number;
}): Promise<void> {
  const { dryRun, limit } = options;

  console.log("\n=== Google Places Enrichment (Single-Call) ===");
  console.log(`Mode: ${dryRun ? "DRY RUN (no API calls, no changes)" : "LIVE"}`);
  if (limit) console.log(`Limit: ${limit} locations`);
  console.log("");

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch locations missing place_id
  let query = supabase
    .from("locations")
    .select("id, name, category, city, region, place_id, coordinates")
    .is("place_id", null)
    .order("name");

  if (limit) {
    query = query.limit(limit);
  } else {
    // Override Supabase's default 1000 limit
    query = query.limit(5000);
  }

  const { data: locations, error } = await query;

  if (error) {
    console.error("Failed to fetch locations:", error);
    process.exit(1);
  }

  if (!locations || locations.length === 0) {
    console.log("No locations found missing place_id.");
    return;
  }

  const totalLocations = locations.length;
  const estimatedCost = Math.round((totalLocations / 1000) * COST_PER_1000);

  console.log(`Locations to process: ${totalLocations}`);
  console.log(`Estimated cost: ~$${estimatedCost}`);
  console.log("");

  if (dryRun) {
    console.log("--- DRY RUN MODE ---");
    console.log("First 10 locations that would be processed:");
    for (const loc of locations.slice(0, 10)) {
      const l = loc as LocationRow;
      console.log(`  - ${l.name} (${l.city}, ${l.region})`);
    }
    console.log(`... and ${totalLocations - 10} more`);
    console.log("\nRun without --dry-run to process these locations.");
    return;
  }

  const results: EnrichmentResult[] = [];
  let successful = 0;
  let notFound = 0;
  let errors = 0;

  // Coverage tracking
  const coverage = {
    placeId: 0,
    coordinates: 0,
    rating: 0,
    operatingHours: 0,
    mealOptions: 0,
    primaryPhotoUrl: 0,
    neighborhood: 0,
  };

  for (let i = 0; i < locations.length; i++) {
    const location = locations[i] as LocationRow;

    // Progress indicator
    const percent = ((i + 1) / totalLocations * 100).toFixed(1);
    process.stdout.write(`\r[${percent}%] ${i + 1}/${totalLocations} - ${location.name.substring(0, 40).padEnd(40)} `);

    // Rate limiting
    if (i > 0) {
      await delay(RATE_LIMIT_MS);
    }

    // Search for the place (with validation)
    const searchResult = await searchPlace(location);

    if (!searchResult.place) {
      if (searchResult.rejected) {
        // Match was rejected due to validation failure
        results.push({
          id: location.id,
          name: location.name,
          success: false,
          notFound: false,
          error: `REJECTED: ${searchResult.rejected}`,
        });
        errors++;
        process.stdout.write(`(REJECTED: ${searchResult.rejected.substring(0, 30)}...)`);
      } else {
        // No results found
        results.push({
          id: location.id,
          name: location.name,
          success: false,
          notFound: true,
        });
        notFound++;
        process.stdout.write("(not found)");
      }
      continue;
    }

    const place = searchResult.place;

    // Extract and transform data
    const priceLevel = parsePriceLevel(place.priceLevel);
    const neighborhood = extractNeighborhood(place.addressComponents);
    const operatingHours = convertOpeningHours(place.regularOpeningHours);
    const newCategory = deriveCategory(place, location.category);
    const primaryPhotoUrl = buildPhotoProxyUrl(place.photos?.[0]);

    // Build update object
    const updateData: Record<string, unknown> = {
      place_id: place.id,
      google_primary_type: place.primaryType || null,
      google_types: place.types || null,
      business_status: place.businessStatus || null,
      price_level: priceLevel,
      rating: place.rating ?? null,
      review_count: place.userRatingCount ?? null,
      good_for_children: place.goodForChildren ?? null,
      good_for_groups: place.goodForGroups ?? null,
      outdoor_seating: place.outdoorSeating ?? null,
      reservable: place.reservable ?? null,
      editorial_summary: place.editorialSummary?.text ?? null,
    };

    // Update coordinates if we got location data and didn't have it
    if (place.location && !location.coordinates) {
      updateData.coordinates = {
        lat: place.location.latitude,
        lng: place.location.longitude,
      };
    }

    // Update neighborhood if extracted
    if (neighborhood) {
      updateData.neighborhood = neighborhood;
    }

    // Update operating hours if available
    if (operatingHours) {
      updateData.operating_hours = operatingHours;
    }

    // Update primary photo URL if available
    if (primaryPhotoUrl) {
      updateData.primary_photo_url = primaryPhotoUrl;
    }

    // Update accessibility options
    if (
      place.accessibilityOptions &&
      Object.keys(place.accessibilityOptions).length > 0
    ) {
      updateData.accessibility_options = place.accessibilityOptions;
    }

    // Update dietary options
    if (place.servesVegetarianFood !== undefined) {
      updateData.dietary_options = {
        servesVegetarianFood: place.servesVegetarianFood,
      };
    }

    // Update service options
    if (
      place.dineIn !== undefined ||
      place.takeout !== undefined ||
      place.delivery !== undefined
    ) {
      updateData.service_options = {
        dineIn: place.dineIn,
        takeout: place.takeout,
        delivery: place.delivery,
      };
    }

    // Update meal options
    const hasMealOptions =
      place.servesBreakfast !== undefined ||
      place.servesBrunch !== undefined ||
      place.servesLunch !== undefined ||
      place.servesDinner !== undefined;

    if (hasMealOptions) {
      updateData.meal_options = {
        servesBreakfast: place.servesBreakfast,
        servesBrunch: place.servesBrunch,
        servesLunch: place.servesLunch,
        servesDinner: place.servesDinner,
      };
    }

    // Update category if changed
    if (newCategory !== location.category) {
      updateData.category = newCategory;
    }

    // Apply update
    const { error: updateError } = await supabase
      .from("locations")
      .update(updateData)
      .eq("id", location.id);

    if (updateError) {
      results.push({
        id: location.id,
        name: location.name,
        success: false,
        error: updateError.message,
      });
      errors++;
      process.stdout.write("(error)");
      continue;
    }

    // Track coverage
    coverage.placeId++;
    if (place.location || location.coordinates) coverage.coordinates++;
    if (place.rating !== undefined) coverage.rating++;
    if (operatingHours) coverage.operatingHours++;
    if (hasMealOptions) coverage.mealOptions++;
    if (primaryPhotoUrl) coverage.primaryPhotoUrl++;
    if (neighborhood) coverage.neighborhood++;

    results.push({
      id: location.id,
      name: location.name,
      success: true,
      placeId: place.id,
      googleName: place.displayName?.text,
      category: newCategory,
      hasCoordinates: !!(place.location || location.coordinates),
      hasRating: place.rating !== undefined,
      hasOperatingHours: !!operatingHours,
      hasMealOptions,
      hasPrimaryPhoto: !!primaryPhotoUrl,
      hasNeighborhood: !!neighborhood,
    });
    successful++;
    process.stdout.write("OK");
  }

  // Clear progress line
  console.log("\n");

  // Count rejected matches
  const rejectedMatches = results
    .filter((r) => r.error?.startsWith("REJECTED:"))
    .map((r) => ({
      id: r.id,
      name: r.name,
      reason: r.error?.replace("REJECTED: ", "") || "Unknown",
    }));
  const rejected = rejectedMatches.length;

  // Summary
  console.log("=== Summary ===");
  console.log(`Processed: ${results.length}`);
  console.log(`Success: ${successful} (${((successful / results.length) * 100).toFixed(1)}%)`);
  console.log(`Not found: ${notFound} (${((notFound / results.length) * 100).toFixed(1)}%)`);
  console.log(`REJECTED (bad match): ${rejected} (${((rejected / results.length) * 100).toFixed(1)}%)`);
  console.log(`Other errors: ${errors - rejected}`);

  if (rejectedMatches.length > 0) {
    console.log("\n⚠️  Rejected matches (prevented bad data):");
    for (const r of rejectedMatches.slice(0, 10)) {
      console.log(`  • ${r.name}: ${r.reason}`);
    }
    if (rejectedMatches.length > 10) {
      console.log(`  ... and ${rejectedMatches.length - 10} more (see log file)`);
    }
  }

  console.log("\nData coverage:");
  console.log(`  place_id: ${coverage.placeId}`);
  console.log(`  coordinates: ${coverage.coordinates}`);
  console.log(`  rating: ${coverage.rating}`);
  console.log(`  operating_hours: ${coverage.operatingHours}`);
  console.log(`  meal_options: ${coverage.mealOptions}`);
  console.log(`  primary_photo_url: ${coverage.primaryPhotoUrl}`);
  console.log(`  neighborhood: ${coverage.neighborhood}`);

  // Write log file
  const logFile: EnrichmentLog = {
    timestamp: new Date().toISOString(),
    mode: dryRun ? "dry-run" : "live",
    totalProcessed: results.length,
    successful,
    notFound,
    rejected,
    errors: errors - rejected,
    results,
    rejectedMatches,
    coverage,
  };

  const logPath = path.join(
    process.cwd(),
    "scripts",
    `enrichment-missing-log-${new Date().toISOString().split("T")[0]}.json`
  );
  fs.writeFileSync(logPath, JSON.stringify(logFile, null, 2));
  console.log(`\nLog: ${logPath}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const testMode = args.includes("--test");

let limit: number | undefined;
if (testMode) {
  limit = 10;
} else {
  const limitIdx = args.indexOf("--limit");
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    limit = parseInt(args[limitIdx + 1], 10);
  }
}

// Run enrichment
enrichMissingPlaces({ dryRun, limit })
  .then(() => {
    console.log("\nEnrichment complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Enrichment failed:", error);
    process.exit(1);
  });
