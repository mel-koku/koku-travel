/**
 * Location matching and creation pipeline for video imports.
 *
 * 5-step process:
 * 1. Exact name search in DB
 * 2. Fuzzy name search with city filter
 * 3. Google Places search for real Place ID
 * 4. Place ID dedup check
 * 5. Create new location if no match found
 */

import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { normalizeKey } from "@/lib/utils/stringUtils";
import { fetchLocationByName } from "@/lib/locations/locationService";
import { searchPlaceId } from "@/lib/google/search";
import { fetchPlaceDetailsByPlaceId } from "@/lib/googlePlaces";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { featureFlags } from "@/lib/env/featureFlags";
import { createClient } from "@/lib/supabase/server";
import type { Location } from "@/types/location";
import type { LocationExtraction } from "./locationExtractor";

export type MatchResult = {
  location: Location;
  isNewLocation: boolean;
  matchMethod: "exact_name" | "fuzzy_name" | "place_id" | "created";
};

/**
 * Match an extracted location to an existing DB entry, or create a new one.
 *
 * @param extraction - AI-extracted location data from the video
 * @param sourceUrl - Original video URL (stored on new locations)
 * @returns Matched or created location, or null on failure
 */
export async function matchOrCreateLocation(
  extraction: LocationExtraction,
  sourceUrl: string,
): Promise<MatchResult | null> {
  const { locationName, city } = extraction;

  // Step 1: Exact name search
  try {
    const exactMatch = await fetchLocationByName(locationName);
    if (exactMatch) {
      return { location: exactMatch, isNewLocation: false, matchMethod: "exact_name" };
    }
  } catch (error) {
    logger.warn("[matchOrCreateLocation] Exact name search failed", {
      error: getErrorMessage(error),
      name: locationName,
    });
  }

  // Step 2: Fuzzy search with city filter
  try {
    const fuzzyMatch = await fuzzySearchByNameAndCity(locationName, city);
    if (fuzzyMatch) {
      return { location: fuzzyMatch, isNewLocation: false, matchMethod: "fuzzy_name" };
    }
  } catch (error) {
    logger.warn("[matchOrCreateLocation] Fuzzy search failed", {
      error: getErrorMessage(error),
      name: locationName,
      city,
    });
  }

  // Steps 3-5 require Google Places
  if (featureFlags.cheapMode || !featureFlags.enableGooglePlaces) {
    logger.info("[matchOrCreateLocation] Skipping Google Places (cheap mode or disabled)");
    return null;
  }

  // Step 3: Google Places search
  let placeId: string | null = null;
  try {
    const searchResult = await searchPlaceId({
      query: `${locationName} ${city} Japan`,
    });
    placeId = searchResult?.placeId ?? null;
  } catch (error) {
    logger.warn("[matchOrCreateLocation] Google Places search failed", {
      error: getErrorMessage(error),
      name: locationName,
    });
  }

  if (!placeId) {
    return null;
  }

  // Step 4: Place ID dedup — check if this place_id already exists
  try {
    const existingByPlaceId = await findByPlaceId(placeId);
    if (existingByPlaceId) {
      return { location: existingByPlaceId, isNewLocation: false, matchMethod: "place_id" };
    }
  } catch (error) {
    logger.warn("[matchOrCreateLocation] Place ID dedup check failed", {
      error: getErrorMessage(error),
      placeId,
    });
  }

  // Step 5: Create new location from Google Places data
  try {
    const newLocation = await createLocationFromPlaces(placeId, extraction, sourceUrl);
    if (newLocation) {
      return { location: newLocation, isNewLocation: true, matchMethod: "created" };
    }
  } catch (error) {
    logger.error(
      "[matchOrCreateLocation] Failed to create new location",
      new Error(getErrorMessage(error)),
      { placeId, name: locationName },
    );
  }

  return null;
}

/**
 * Fuzzy search: ILIKE %name% filtered by city.
 */
async function fuzzySearchByNameAndCity(name: string, city: string): Promise<Location | null> {
  const supabase = await createClient();
  const normalizedCity = normalizeKey(city);

  const { data, error } = await supabase
    .from("locations")
    .select("id, name, region, city, category, image, coordinates, place_id, rating, review_count, short_description, primary_photo_url")
    .ilike("name", `%${name}%`)
    .ilike("city", normalizedCity)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    region: data.region,
    city: data.city,
    category: data.category,
    image: data.image,
    coordinates: data.coordinates ?? undefined,
    placeId: data.place_id ?? undefined,
    rating: data.rating ?? undefined,
    reviewCount: data.review_count ?? undefined,
    shortDescription: data.short_description ?? undefined,
    primaryPhotoUrl: data.primary_photo_url ?? undefined,
  };
}

/**
 * Check if a location with this Google Place ID already exists.
 */
async function findByPlaceId(placeId: string): Promise<Location | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .select("id, name, region, city, category, image, coordinates, place_id, rating, review_count, short_description, primary_photo_url")
    .eq("place_id", placeId)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    region: data.region,
    city: data.city,
    category: data.category,
    image: data.image,
    coordinates: data.coordinates ?? undefined,
    placeId: data.place_id ?? undefined,
    rating: data.rating ?? undefined,
    reviewCount: data.review_count ?? undefined,
    shortDescription: data.short_description ?? undefined,
    primaryPhotoUrl: data.primary_photo_url ?? undefined,
  };
}

/**
 * Create a new location using Google Places data, flagged as community source.
 */
async function createLocationFromPlaces(
  placeId: string,
  extraction: LocationExtraction,
  sourceUrl: string,
): Promise<Location | null> {
  // Fetch full place details from Google
  const placeDetails = await fetchPlaceDetailsByPlaceId(placeId, extraction.locationName);
  if (!placeDetails) {
    return null;
  }

  const { location } = placeDetails;
  const serviceClient = getServiceRoleClient();

  // Build the insert row — community locations get source tracking but
  // no is_hidden_gem, is_featured, or tags
  const insertRow = {
    name: location.name || extraction.locationName,
    name_japanese: extraction.locationNameJapanese || null,
    region: location.region || "Japan",
    city: location.city || extraction.city,
    category: extraction.category || location.category,
    image: location.image || "",
    description: extraction.description || null,
    short_description: extraction.description || null,
    coordinates: location.coordinates || null,
    place_id: placeId,
    rating: location.rating || null,
    review_count: location.reviewCount || null,
    primary_photo_url: location.primaryPhotoUrl || null,
    google_primary_type: location.googlePrimaryType || null,
    google_types: location.googleTypes || null,
    business_status: location.businessStatus || null,
    price_level: location.priceLevel ?? null,
    accessibility_options: location.accessibilityOptions || null,
    editorial_summary: location.editorialSummary || null,
    source: "community",
    source_url: sourceUrl,
  };

  const { data, error } = await serviceClient
    .from("locations")
    .insert(insertRow)
    .select("id, name, region, city, category, image, coordinates, place_id, rating, review_count, short_description, primary_photo_url, source, source_url")
    .single();

  if (error) {
    logger.error("[createLocationFromPlaces] Supabase insert failed", new Error(error.message), {
      placeId,
      name: extraction.locationName,
    });
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    region: data.region,
    city: data.city,
    category: data.category,
    image: data.image,
    coordinates: data.coordinates ?? undefined,
    placeId: data.place_id ?? undefined,
    rating: data.rating ?? undefined,
    reviewCount: data.review_count ?? undefined,
    shortDescription: data.short_description ?? undefined,
    primaryPhotoUrl: data.primary_photo_url ?? undefined,
    source: data.source as "community" | null,
    sourceUrl: data.source_url ?? undefined,
  };
}
