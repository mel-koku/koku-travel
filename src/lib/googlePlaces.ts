import type { SupabaseClient } from "@supabase/supabase-js";
import { Location, LocationDetails, LocationPhoto, LocationReview } from "@/types/location";
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { CACHE_TTL_30_DAYS, CACHE_TTL_6_HOURS, TIMEOUT_10_SECONDS } from "@/lib/constants";

const PLACES_API_BASE_URL = "https://places.googleapis.com/v1";
const SEARCH_FIELD_MASK = ["places.id", "places.displayName", "places.formattedAddress"].join(",");
const DETAILS_FIELD_MASK = [
  // Basic info
  "id",
  "displayName",
  "formattedAddress",
  "shortFormattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "editorialSummary",
  "websiteUri",
  "internationalPhoneNumber",
  "googleMapsUri",
  // Opening hours
  "regularOpeningHours.weekdayDescriptions",
  "currentOpeningHours.weekdayDescriptions",
  // Reviews
  "reviews.authorAttribution",
  "reviews.rating",
  "reviews.relativePublishTimeDescription",
  "reviews.publishTime",
  "reviews.text",
  // Photos
  "photos.name",
  "photos.widthPx",
  "photos.heightPx",
  "photos.authorAttributions",
  // NEW: Categorization (for enrichment)
  "primaryType",
  "types",
  // NEW: Status & Price
  "businessStatus",
  "priceLevel",
  // NEW: Accessibility options
  "accessibilityOptions",
  // NEW: Restaurant/food service options
  "servesVegetarianFood",
  "servesBeer",
  "servesWine",
  "dineIn",
  "takeout",
  "delivery",
  "servesBreakfast",
  "servesBrunch",
  "servesLunch",
  "servesDinner",
].join(",");

/**
 * Field mask for enrichment script (subset of fields we want to store)
 * Used by scripts/enrich-google-places-full.ts
 */
export const ENRICHMENT_FIELD_MASK = [
  "id",
  "primaryType",
  "types",
  "businessStatus",
  "priceLevel",
  "accessibilityOptions",
  "servesVegetarianFood",
  "servesBeer",
  "servesWine",
  "dineIn",
  "takeout",
  "delivery",
  "servesBreakfast",
  "servesBrunch",
  "servesLunch",
  "servesDinner",
].join(",");

const MAX_REVIEWS = 5;
const MAX_PHOTOS = 8;
const PLACE_ID_CACHE_TTL = CACHE_TTL_30_DAYS;
const PLACE_DETAILS_CACHE_TTL = CACHE_TTL_6_HOURS;
const PLACE_DETAILS_TABLE = "place_details";
const SUPABASE_DETAILS_COLUMN_SET = "place_id, payload, fetched_at";

let supabaseServiceWarningLogged = false;

// Use SupabaseClient type from @supabase/supabase-js which works for both server and service clients
// This avoids importing the server module which uses next/headers

type SupabaseClientState = {
  client: SupabaseClient<Record<string, unknown>> | null;
  canPersist: boolean;
};

type PlaceIdCacheEntry = {
  placeId: string;
  matchedName?: string;
  formattedAddress?: string;
  expiresAt: number;
};

type PlaceDetailsCacheEntry = {
  details: LocationDetails;
  expiresAt: number;
};

type PlaceDetailsRow = {
  location_id: string;
  place_id: string;
  payload: LocationDetails;
  fetched_at: string;
};

async function getSupabaseClientSafe(): Promise<SupabaseClientState> {
  // Skip Supabase entirely on client-side (service role key is server-only)
  // This prevents Next.js from trying to analyze server-only modules during client builds
  if (typeof window !== "undefined") {
    return { client: null, canPersist: false };
  }

  // Use dynamic import to avoid analyzing server-only modules during client builds
  // Only use service role client (doesn't require next/headers)
  try {
    const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
    return { client: getServiceRoleClient(), canPersist: true };
  } catch (serviceError) {
    if (!supabaseServiceWarningLogged && process.env.NODE_ENV !== "production") {
      supabaseServiceWarningLogged = true;
      logger.warn(
        "Service-role client unavailable for Google Places cache. Falling back to in-memory cache only.",
        { error: serviceError },
      );
    }
    return { client: null, canPersist: false };
  }
}

function normalizeDetailsRow(row: PlaceDetailsRow): LocationDetails {
  const payload = row.payload ?? ({} as LocationDetails);
  return {
    ...payload,
    placeId: payload.placeId ?? row.place_id,
    fetchedAt: payload.fetchedAt ?? row.fetched_at,
    photos: payload.photos ?? [],
    reviews: payload.reviews ?? [],
  };
}

// Module-level cache instances (initialized once per module load)
// In Next.js, these persist across requests in the same process but reset on hot reload
const placeIdCache = new Map<string, PlaceIdCacheEntry>();
const placeDetailsCache = new Map<string, PlaceDetailsCacheEntry>();

function getPlaceIdCache(): Map<string, PlaceIdCacheEntry> {
  return placeIdCache;
}

function getPlaceDetailsCache(): Map<string, PlaceDetailsCacheEntry> {
  return placeDetailsCache;
}

function getApiKey(): string {
  const key = env.googlePlacesApiKey;
  if (!key) {
    throw new Error(
      "Missing Google Places API key. Set GOOGLE_PLACES_API_KEY in your environment.",
    );
  }
  return key;
}

type SearchPlaceOptions = {
  query: string;
  languageCode?: string;
  regionCode?: string;
};

async function searchPlaceId(options: SearchPlaceOptions): Promise<PlaceIdCacheEntry | null> {
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
 * Safely checks if a location can resolve its Google Place ID without throwing an error.
 * Returns true if the location has a placeId or can successfully resolve one.
 */
export async function canResolvePlaceId(location: Location): Promise<boolean> {
  try {
    // If location already has a place_id, consider it valid
    if (location.placeId) {
      return true;
    }

    const cache = getPlaceIdCache();
    const cached = cache.get(location.id);
    if (cached && cached.expiresAt > Date.now()) {
      return true;
    }

    // Try to resolve Place ID
    const query = [location.name, location.city, location.region, "Japan"]
      .filter(Boolean)
      .join(", ");

    const found = await searchPlaceId({ query });
    if (found) {
      cache.set(location.id, found);
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

async function resolvePlaceId(location: Location): Promise<PlaceIdCacheEntry> {
  const cache = getPlaceIdCache();
  const cached = cache.get(location.id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  if (location.placeId) {
    const entry: PlaceIdCacheEntry = {
      placeId: location.placeId,
      expiresAt: Date.now() + PLACE_ID_CACHE_TTL,
    };
    cache.set(location.id, entry);
    return entry;
  }

  const query = [location.name, location.city, location.region, "Japan"]
    .filter(Boolean)
    .join(", ");

  const found = await searchPlaceId({ query });
  if (!found) {
    throw new Error(`Could not resolve Google Place ID for location "${location.name}".`);
  }

  cache.set(location.id, found);
  return found;
}

type PlaceDetailsPayload = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  editorialSummary?: { text?: string };
  websiteUri?: string;
  internationalPhoneNumber?: string;
  googleMapsUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  currentOpeningHours?: { weekdayDescriptions?: string[] };
  reviews?: Array<{
    authorAttribution?: {
      displayName?: string;
      uri?: string;
      photoUri?: string;
    };
    rating?: number;
    text?: { text?: string };
    relativePublishTimeDescription?: string;
    publishTime?: string;
  }>;
  photos?: Array<{
    name?: string;
    widthPx?: number;
    heightPx?: number;
    authorAttributions?: Array<{
      displayName?: string;
      uri?: string;
      photoUri?: string;
    }>;
  }>;
};

function transformReviews(reviews?: PlaceDetailsPayload["reviews"]): LocationReview[] {
  if (!reviews) return [];
  return reviews
    .filter((review) => Boolean(review))
    .slice(0, MAX_REVIEWS)
    .map((review) => ({
      authorName: review?.authorAttribution?.displayName ?? "Google user",
      authorUri: review?.authorAttribution?.uri,
      profilePhotoUri: review?.authorAttribution?.photoUri,
      rating: review?.rating,
      text: review?.text?.text,
      relativePublishTimeDescription: review?.relativePublishTimeDescription,
      publishTime: review?.publishTime,
    }));
}

function transformPhotos(photos: PlaceDetailsPayload["photos"]): LocationPhoto[] {
  if (!photos) return [];

  return photos
    .filter((photo): photo is NonNullable<typeof photo> => Boolean(photo?.name))
    .slice(0, MAX_PHOTOS)
    .map((photo) => ({
      name: photo.name!,
      widthPx: photo.widthPx,
      heightPx: photo.heightPx,
      proxyUrl: `/api/places/photo?photoName=${encodeURIComponent(photo.name!)}&maxWidthPx=1600`,
      attributions: (photo.authorAttributions ?? []).map((attribution) => ({
        displayName: attribution?.displayName,
        uri: attribution?.uri,
        photoUri: attribution?.photoUri,
      })),
    }));
}

function transformPlaceDetails(payload: PlaceDetailsPayload, fallbackPlaceId: string): LocationDetails {
  return {
    placeId: payload.id ?? fallbackPlaceId,
    displayName: payload.displayName?.text,
    formattedAddress: payload.formattedAddress,
    shortAddress: payload.shortFormattedAddress,
    rating: payload.rating,
    userRatingCount: payload.userRatingCount,
    editorialSummary: payload.editorialSummary?.text,
    websiteUri: payload.websiteUri,
    internationalPhoneNumber: payload.internationalPhoneNumber,
    googleMapsUri: payload.googleMapsUri,
    regularOpeningHours: payload.regularOpeningHours?.weekdayDescriptions ?? [],
    currentOpeningHours: payload.currentOpeningHours?.weekdayDescriptions ?? [],
    reviews: transformReviews(payload.reviews),
    photos: transformPhotos(payload.photos),
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchLocationDetails(location: Location): Promise<LocationDetails> {
  const detailsCache = getPlaceDetailsCache();

  const cached = detailsCache.get(location.id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.details;
  }

  const { client: supabase, canPersist } = await getSupabaseClientSafe();
  let supabaseRow: PlaceDetailsRow | null = null;

  if (supabase) {
    const { data, error } = await supabase
      .from(PLACE_DETAILS_TABLE)
      .select(SUPABASE_DETAILS_COLUMN_SET)
      .eq("location_id", location.id)
      .maybeSingle<PlaceDetailsRow>();

    if (error && process.env.NODE_ENV !== "production") {
      logger.warn("Failed to read cached Google Place details", {
        locationId: location.id,
        error,
      });
    }

    if (data) {
      supabaseRow = data;
    }
  }

  if (supabaseRow) {
    const fetchedAt = Date.parse(supabaseRow.fetched_at);
    if (!Number.isNaN(fetchedAt) && fetchedAt + PLACE_DETAILS_CACHE_TTL > Date.now()) {
      const normalized = normalizeDetailsRow(supabaseRow);
      detailsCache.set(location.id, {
        details: normalized,
        expiresAt: Date.now() + PLACE_DETAILS_CACHE_TTL,
      });
      const placeIdCache = getPlaceIdCache();
      placeIdCache.set(location.id, {
        placeId: normalized.placeId,
        expiresAt: Date.now() + PLACE_ID_CACHE_TTL,
        matchedName: undefined,
        formattedAddress: undefined,
      });
      return normalized;
    }
  }

  let resolvedPlaceId = supabaseRow?.place_id;
  if (!resolvedPlaceId) {
    const { placeId } = await resolvePlaceId(location);
    resolvedPlaceId = placeId;
  } else {
    const placeIdCache = getPlaceIdCache();
    placeIdCache.set(location.id, {
      placeId: resolvedPlaceId,
      expiresAt: Date.now() + PLACE_ID_CACHE_TTL,
      matchedName: undefined,
      formattedAddress: undefined,
    });
  }

  const apiKey = getApiKey();

  const response = await fetchWithTimeout(
    `${PLACES_API_BASE_URL}/places/${resolvedPlaceId}?languageCode=en`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": DETAILS_FIELD_MASK,
      },
      cache: "no-store",
    },
    TIMEOUT_10_SECONDS,
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to fetch details for "${location.name}". Status ${response.status}. Body: ${errorBody}`,
    );
  }

  const payload = (await response.json()) as PlaceDetailsPayload;
  const details = transformPlaceDetails(payload, resolvedPlaceId);
  detailsCache.set(location.id, {
    details,
    expiresAt: Date.now() + PLACE_DETAILS_CACHE_TTL,
  });

  if (supabase && canPersist) {
    const { error } = await supabase.from(PLACE_DETAILS_TABLE).upsert({
      location_id: location.id,
      place_id: details.placeId,
      payload: details as unknown as Record<string, unknown>,
      fetched_at: details.fetchedAt,
    } as never);

    if (error && process.env.NODE_ENV !== "production") {
      logger.warn("Failed to persist Google Place details", {
        locationId: location.id,
        error,
      });
    }
  }

  return details;
}

export async function fetchPhotoStream(
  photoName: string,
  options?: { maxWidthPx?: number; maxHeightPx?: number },
): Promise<Response> {
  const apiKey = getApiKey();
  const params = new URLSearchParams();
  if (options?.maxWidthPx) {
    params.set("maxWidthPx", options.maxWidthPx.toString());
  }
  if (options?.maxHeightPx) {
    params.set("maxHeightPx", options.maxHeightPx.toString());
  }

  const query = params.toString();
  const url = query
    ? `${PLACES_API_BASE_URL}/${photoName}/media?${query}`
    : `${PLACES_API_BASE_URL}/${photoName}/media`;

  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
      },
    },
    TIMEOUT_10_SECONDS,
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to fetch photo "${photoName}". Status ${response.status}. Body: ${errorBody}`,
    );
  }

  return response;
}

export type AutocompletePlace = {
  placeId: string;
  displayName: string;
  formattedAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
};

export type PlaceWithCoordinates = {
  placeId: string;
  displayName: string;
  formattedAddress?: string;
  location: {
    latitude: number;
    longitude: number;
  };
};

type AutocompleteOptions = {
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
      low: { latitude: number; longitude: number };  // Southwest corner
      high: { latitude: number; longitude: number }; // Northeast corner
    };
  };
};

/**
 * Autocomplete places using Google Places API searchText endpoint.
 * Returns suggestions with place IDs, names, addresses, and coordinates.
 * Uses searchText instead of autocomplete endpoint for better compatibility and immediate coordinate access.
 */
export async function autocompletePlaces(
  options: AutocompleteOptions,
): Promise<AutocompletePlace[]> {
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

  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
  ].join(",");

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
    logger.error(`Google Places SearchText API error`, {
      status: response.status,
      input,
      errorBody,
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
 */
export async function fetchPlaceCoordinates(
  placeId: string,
): Promise<PlaceWithCoordinates | null> {
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

