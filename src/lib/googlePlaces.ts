import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { Location, LocationDetails, LocationPhoto, LocationReview } from "@/types/location";
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

const PLACES_API_BASE_URL = "https://places.googleapis.com/v1";
const SEARCH_FIELD_MASK = ["places.id", "places.displayName", "places.formattedAddress"].join(",");
const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "shortFormattedAddress",
  "rating",
  "userRatingCount",
  "editorialSummary",
  "websiteUri",
  "internationalPhoneNumber",
  "googleMapsUri",
  "regularOpeningHours.weekdayDescriptions",
  "currentOpeningHours.weekdayDescriptions",
  "reviews.authorAttribution",
  "reviews.rating",
  "reviews.relativePublishTimeDescription",
  "reviews.publishTime",
  "reviews.text",
  "photos.name",
  "photos.widthPx",
  "photos.heightPx",
  "photos.authorAttributions",
].join(",");

const MAX_REVIEWS = 5;
const MAX_PHOTOS = 8;
const PLACE_ID_CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days
const PLACE_DETAILS_CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours
const PLACE_DETAILS_TABLE = "place_details";
const SUPABASE_DETAILS_COLUMN_SET = "place_id, payload, fetched_at";

let supabaseWarningLogged = false;
let supabaseServiceWarningLogged = false;

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type SupabaseServiceClient = ReturnType<typeof getServiceRoleClient>;
type SupabaseClient = SupabaseServerClient | SupabaseServiceClient;

type SupabaseClientState = {
  client: SupabaseClient | null;
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
  try {
    return { client: getServiceRoleClient(), canPersist: true };
  } catch (serviceError) {
    if (!supabaseServiceWarningLogged && process.env.NODE_ENV !== "production") {
      supabaseServiceWarningLogged = true;
      logger.warn(
        "Service-role client unavailable for Google Places cache. Falling back to anon client.",
        { error: serviceError },
      );
    }
  }

  try {
    const client = await createSupabaseServerClient();
    return { client, canPersist: false };
  } catch (error) {
    if (!supabaseWarningLogged && process.env.NODE_ENV !== "production") {
      supabaseWarningLogged = true;
      logger.warn(
        "Unable to initialize server client for Google Places cache. Falling back to in-memory cache only.",
        { error },
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

<<<<<<< HEAD
// LRU cache size limits for place caches
const PLACE_ID_CACHE_MAX_SIZE = 1000;
const PLACE_DETAILS_CACHE_MAX_SIZE = 1000;

declare global {
  var __kokuPlaceIdCache: LRUCache<string, PlaceIdCacheEntry> | undefined;
  var __kokuPlaceDetailsCache: LRUCache<string, PlaceDetailsCacheEntry> | undefined;
}

function getPlaceIdCache(): LRUCache<string, PlaceIdCacheEntry> {
  if (!globalThis.__kokuPlaceIdCache) {
    globalThis.__kokuPlaceIdCache = new LRUCache<string, PlaceIdCacheEntry>({
      maxSize: PLACE_ID_CACHE_MAX_SIZE,
    });
  }
  return globalThis.__kokuPlaceIdCache;
}

function getPlaceDetailsCache(): LRUCache<string, PlaceDetailsCacheEntry> {
  if (!globalThis.__kokuPlaceDetailsCache) {
    globalThis.__kokuPlaceDetailsCache = new LRUCache<string, PlaceDetailsCacheEntry>({
      maxSize: PLACE_DETAILS_CACHE_MAX_SIZE,
    });
  }
  return globalThis.__kokuPlaceDetailsCache;
=======
// Module-level cache instances (initialized once per module load)
// In Next.js, these persist across requests in the same process but reset on hot reload
const placeIdCache = new Map<string, PlaceIdCacheEntry>();
const placeDetailsCache = new Map<string, PlaceDetailsCacheEntry>();

function getPlaceIdCache(): Map<string, PlaceIdCacheEntry> {
  return placeIdCache;
}

function getPlaceDetailsCache(): Map<string, PlaceDetailsCacheEntry> {
  return placeDetailsCache;
>>>>>>> task/3.2-replace-global-variables
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
    10000, // 10 second timeout
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
    10000, // 10 second timeout
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
      payload: details,
      fetched_at: details.fetchedAt,
    });

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
    10000, // 10 second timeout
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to fetch photo "${photoName}". Status ${response.status}. Body: ${errorBody}`,
    );
  }

  return response;
}

