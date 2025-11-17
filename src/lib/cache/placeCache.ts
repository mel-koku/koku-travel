import { createClient } from "next-sanity";
import type { LocationDetails } from "@/types/location";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

/**
 * Create Sanity client with write access for caching
 */
function getWriteClient() {
  return createClient({
    projectId: env.sanityProjectId,
    dataset: env.sanityDataset,
    apiVersion: env.sanityApiVersion,
    token: env.sanityApiWriteToken, // Use write token for caching
    useCdn: false, // Don't use CDN for writes
  });
}

/**
 * Cached place data from Sanity
 */
type CachedPlace = {
  _id: string;
  placeId: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  formattedAddress?: string;
  openingHours?: string[];
  rating?: number;
  reviewCount?: number;
  reviews?: Array<{
    authorName?: string;
    rating?: number;
    text?: string;
    relativePublishTimeDescription?: string;
  }>;
  lastSynced: string;
  metadata?: {
    websiteUri?: string;
    phoneNumber?: string;
    googleMapsUri?: string;
    editorialSummary?: string;
  };
};

/**
 * Number of days before cached data is considered stale
 */
const CACHE_STALE_DAYS = 7;

/**
 * Check if cached data is stale
 */
function isStale(lastSynced: string): boolean {
  const lastSyncedDate = new Date(lastSynced);
  const now = new Date();
  const daysSinceSync = (now.getTime() - lastSyncedDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceSync > CACHE_STALE_DAYS;
}

/**
 * Convert Sanity place document to LocationDetails format
 */
function convertToLocationDetails(cached: CachedPlace): LocationDetails {
  return {
    placeId: cached.placeId,
    formattedAddress: cached.formattedAddress,
    shortAddress: cached.formattedAddress?.split(",")[0],
    rating: cached.rating,
    userRatingCount: cached.reviewCount,
    editorialSummary: cached.metadata?.editorialSummary,
    websiteUri: cached.metadata?.websiteUri,
    internationalPhoneNumber: cached.metadata?.phoneNumber,
    googleMapsUri: cached.metadata?.googleMapsUri,
    regularOpeningHours: cached.openingHours,
    currentOpeningHours: cached.openingHours,
    reviews: (cached.reviews ?? []).map((review) => ({
      authorName: review.authorName ?? "",
      rating: review.rating,
      text: review.text,
      relativePublishTimeDescription: review.relativePublishTimeDescription,
    })),
    photos: [], // Photos are not cached in Sanity (too large)
    fetchedAt: cached.lastSynced,
  };
}

/**
 * Get coordinates from cached place
 */
export function getCachedPlaceCoordinates(cached: CachedPlace): { lat: number; lng: number } | null {
  if (cached.coordinates?.lat && cached.coordinates?.lng) {
    return {
      lat: cached.coordinates.lat,
      lng: cached.coordinates.lng,
    };
  }
  return null;
}

/**
 * Get place from Sanity cache
 * Returns null if not found or stale
 */
export async function getPlaceFromCache(placeId: string): Promise<{
  details: LocationDetails;
  coordinates: { lat: number; lng: number } | null;
} | null> {
  try {
    // Use read-only client for fetching
    const { client } = await import("@/sanity/lib/client");
    const query = `*[_type == "place" && placeId == $placeId][0]`;
    const cached = await client.fetch<CachedPlace | null>(query, { placeId });

    if (!cached) {
      return null;
    }

    // Check if stale
    if (isStale(cached.lastSynced)) {
      logger.debug(`Cached place ${placeId} is stale (last synced: ${cached.lastSynced})`);
      return null;
    }

    logger.debug(`Found cached place ${placeId} in Sanity`);
    return {
      details: convertToLocationDetails(cached),
      coordinates: getCachedPlaceCoordinates(cached),
    };
  } catch (error) {
    logger.error("Error fetching place from Sanity cache", error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Store place in Sanity cache
 */
export async function storePlaceInCache(placeId: string, details: LocationDetails): Promise<void> {
  try {
    // Check if write token is available
    if (!env.sanityApiWriteToken) {
      logger.debug("Sanity write token not available, skipping cache store");
      return;
    }

    const writeClient = getWriteClient();
    
    // Check if place already exists
    const existingQuery = `*[_type == "place" && placeId == $placeId][0]._id`;
    const existingId = await writeClient.fetch<string | null>(existingQuery, { placeId });

    // Get coordinates from a Location object if available
    // For now, coordinates will be 0,0 and need to be populated separately
    // This is a limitation - we'd need to pass coordinates separately
    const placeDoc = {
      _type: "place",
      placeId,
      name: details.formattedAddress?.split(",")[0] ?? placeId,
      coordinates: {
        lat: 0, // Coordinates need to be fetched separately or passed in
        lng: 0,
      },
      formattedAddress: details.formattedAddress,
      openingHours: details.regularOpeningHours ?? details.currentOpeningHours,
      rating: details.rating,
      reviewCount: details.userRatingCount,
      reviews: details.reviews?.slice(0, 5).map((review) => ({
        authorName: review.authorName,
        rating: review.rating,
        text: review.text,
        relativePublishTimeDescription: review.relativePublishTimeDescription,
      })),
      lastSynced: new Date().toISOString(),
      metadata: {
        websiteUri: details.websiteUri,
        phoneNumber: details.internationalPhoneNumber,
        googleMapsUri: details.googleMapsUri,
        editorialSummary: details.editorialSummary ?? undefined,
      },
    };

    if (existingId) {
      // Update existing document
      await writeClient
        .patch(existingId)
        .set(placeDoc)
        .commit();
      logger.debug(`Updated cached place ${placeId} in Sanity`);
    } else {
      // Create new document
      await writeClient.create(placeDoc);
      logger.debug(`Created cached place ${placeId} in Sanity`);
    }
  } catch (error) {
    logger.error("Error storing place in Sanity cache", error instanceof Error ? error : new Error(String(error)));
    // Don't throw - caching failures shouldn't break the flow
  }
}

