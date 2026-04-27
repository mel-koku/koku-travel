/**
 * Google Places search and autocomplete functions.
 *
 * This module provides functions for searching places and autocomplete
 * using the Google Places API.
 */

import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { TIMEOUT_10_SECONDS } from "@/lib/constants";
import { CACHE_TTL_30_DAYS } from "@/lib/constants";
import type { PlaceIdCacheEntry } from "./cache";

const PLACES_API_BASE_URL = "https://places.googleapis.com/v1";
const SEARCH_FIELD_MASK = ["places.id", "places.displayName", "places.formattedAddress"].join(",");
const PLACE_ID_CACHE_TTL = CACHE_TTL_30_DAYS;

function getApiKey(): string {
  const key = env.googlePlacesApiKey;
  if (!key) {
    throw new Error(
      "Missing Google Places API key. Set GOOGLE_PLACES_API_KEY in your environment.",
    );
  }
  return key;
}

export type SearchPlaceOptions = {
  query: string;
  languageCode?: string;
  regionCode?: string;
};

/**
 * Search for a place ID using the Google Places searchText API.
 *
 * @param options - Search options including query and locale settings
 * @returns PlaceIdCacheEntry with place ID and metadata, or null if not found
 */
export async function searchPlaceId(options: SearchPlaceOptions): Promise<PlaceIdCacheEntry | null> {
  const apiKey = getApiKey();
  const { query, languageCode = "en", regionCode = "JP" } = options;

  const response = await fetchWithTimeout(
    `${PLACES_API_BASE_URL}/places:searchText`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": SEARCH_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode,
        regionCode,
        pageSize: 1,
      }),
    },
    TIMEOUT_10_SECONDS,
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to search place for "${query}". Status ${response.status}. Body: ${errorBody}`,
    );
  }

  const payload = (await response.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
    }>;
  };

  const [place] = payload.places ?? [];
  if (!place?.id) {
    return null;
  }

  return {
    placeId: place.id,
    matchedName: place.displayName?.text,
    formattedAddress: place.formattedAddress,
    expiresAt: Date.now() + PLACE_ID_CACHE_TTL,
  };
}

/**
 * Autocomplete place type returned from search.
 */
export type AutocompletePlace = {
  placeId: string;
  displayName: string;
  formattedAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
};

/**
 * Place with coordinates returned from coordinate lookup.
 */
export type PlaceWithCoordinates = {
  placeId: string;
  displayName: string;
  formattedAddress?: string;
  location: {
    latitude: number;
    longitude: number;
  };
};

export type AutocompleteOptions = {
  input: string;
  languageCode?: string;
  regionCode?: string;
  includedPrimaryTypes?: string[];
  locationBias?: {
    circle?: {
      center: { latitude: number; longitude: number };
      radius: number; // in meters
    };
  };
  locationRestriction?: {
    rectangle?: {
      low: { latitude: number; longitude: number }; // Southwest corner
      high: { latitude: number; longitude: number }; // Northeast corner
    };
  };
};

/**
 * Autocomplete places using Google Places API searchText endpoint.
 * Returns suggestions with place IDs, names, addresses, and coordinates.
 * Uses searchText instead of autocomplete endpoint for better compatibility and immediate coordinate access.
 *
 * @param options - Autocomplete options including input query and filters
 * @returns Array of autocomplete suggestions
 */
export async function autocompletePlaces(options: AutocompleteOptions): Promise<AutocompletePlace[]> {
  const apiKey = getApiKey();
  const {
    input,
    languageCode = "en",
    regionCode = "JP",
    includedPrimaryTypes,
    locationBias,
    locationRestriction,
  } = options;

  // Build text query with type filters if provided
  let textQuery = input;
  if (includedPrimaryTypes && includedPrimaryTypes.length > 0) {
    // Add type filters to the query for better results
    const typeFilters = includedPrimaryTypes.join(" ");
    textQuery = `${input} ${typeFilters}`;
  }

  const requestBody: Record<string, unknown> = {
    textQuery,
    languageCode,
    regionCode,
    pageSize: 10,
  };

  // locationRestriction strictly limits results to the area (use for Japan-only results)
  // locationBias only biases results toward the area
  if (locationRestriction?.rectangle) {
    requestBody.locationRestriction = {
      rectangle: locationRestriction.rectangle,
    };
  } else if (locationBias?.circle) {
    requestBody.locationBias = {
      circle: locationBias.circle,
    };
  }

  const fieldMask = ["places.id", "places.displayName", "places.formattedAddress", "places.location"].join(
    ",",
  );

  const response = await fetchWithTimeout(
    `${PLACES_API_BASE_URL}/places:searchText`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(requestBody),
    },
    TIMEOUT_10_SECONDS,
  );

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error(`Google Places SearchText API error`, new Error(errorBody), {
      status: response.status,
      input,
    });
    throw new Error(
      `Failed to search places for "${input}". Status ${response.status}. Body: ${errorBody}`,
    );
  }

  const payload = (await response.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: {
        latitude?: number;
        longitude?: number;
      };
    }>;
  };

  const places: AutocompletePlace[] = [];

  for (const place of payload.places ?? []) {
    if (!place.id || !place.displayName?.text) continue;

    places.push({
      placeId: place.id,
      displayName: place.displayName.text,
      formattedAddress: place.formattedAddress,
      location: place.location
        ? {
            latitude: place.location.latitude ?? 0,
            longitude: place.location.longitude ?? 0,
          }
        : undefined,
    });
  }

  return places;
}

/**
 * Fetch place coordinates by place ID.
 * Call this when a user selects a place from autocomplete suggestions.
 *
 * @param placeId - Google Place ID
 * @returns Place with coordinates, or null if not found
 */
export async function fetchPlaceCoordinates(placeId: string): Promise<PlaceWithCoordinates | null> {
  const apiKey = getApiKey();
  const fieldMask = ["id", "displayName", "formattedAddress", "location"].join(",");

  const response = await fetchWithTimeout(
    `${PLACES_API_BASE_URL}/places/${placeId}?languageCode=en`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      cache: "no-store",
    },
    TIMEOUT_10_SECONDS,
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: {
      latitude?: number;
      longitude?: number;
    };
  };

  if (!payload.id || !payload.displayName?.text || !payload.location) {
    return null;
  }

  const lat = payload.location.latitude;
  const lng = payload.location.longitude;

  if (lat === undefined || lng === undefined) {
    return null;
  }

  return {
    placeId: payload.id,
    displayName: payload.displayName.text,
    formattedAddress: payload.formattedAddress,
    location: {
      latitude: lat,
      longitude: lng,
    },
  };
}

/**
 * Resolved result of a single rich text-search lookup. Mirrors the shape we
 * need for meal-suggestion cards: identity, address, coordinates, rating,
 * and a photo resource name we proxy via /api/places/photo.
 */
export type ResolvedPlace = {
  placeId: string;
  displayName: string;
  formattedAddress?: string;
  coordinates: { lat: number; lng: number };
  rating?: number;
  ratingCount?: number;
  primaryType?: string;
  /** First photo resource name (passed straight to /api/places/photo). */
  photoName?: string;
};

const RICH_SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.primaryType",
  "places.photos",
].join(",");

/**
 * Resolve a single venue name to a real Google place near a point. Used by
 * the meal-suggestion route to validate LLM-generated names: if Google can't
 * find the place near the lat/lng, we drop it (suspected hallucination).
 */
export async function resolvePlaceByText(args: {
  query: string;
  lat: number;
  lng: number;
  /** Search bias radius in meters (default 2000). Tighter bias = stricter match. */
  radiusMeters?: number;
  languageCode?: string;
}): Promise<ResolvedPlace | null> {
  const apiKey = getApiKey();
  const { query, lat, lng, radiusMeters = 2000, languageCode = "en" } = args;

  const requestBody = {
    textQuery: query,
    languageCode,
    regionCode: "JP",
    pageSize: 1,
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    },
  };

  const response = await fetchWithTimeout(
    `${PLACES_API_BASE_URL}/places:searchText`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": RICH_SEARCH_FIELD_MASK,
      },
      body: JSON.stringify(requestBody),
    },
    TIMEOUT_10_SECONDS,
  );

  if (!response.ok) {
    logger.warn("resolvePlaceByText: searchText non-OK", {
      status: response.status,
      query,
    });
    return null;
  }

  const payload = (await response.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      rating?: number;
      userRatingCount?: number;
      primaryType?: string;
      photos?: Array<{ name?: string }>;
    }>;
  };

  const place = payload.places?.[0];
  if (
    !place?.id ||
    !place.displayName?.text ||
    place.location?.latitude === undefined ||
    place.location.longitude === undefined
  ) {
    return null;
  }

  return {
    placeId: place.id,
    displayName: place.displayName.text,
    formattedAddress: place.formattedAddress,
    coordinates: {
      lat: place.location.latitude,
      lng: place.location.longitude,
    },
    rating: place.rating,
    ratingCount: place.userRatingCount,
    primaryType: place.primaryType,
    photoName: place.photos?.[0]?.name,
  };
}
