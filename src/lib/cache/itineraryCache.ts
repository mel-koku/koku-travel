/**
 * Itinerary caching with Redis
 *
 * Caches generated itineraries to reduce AI/LLM costs and improve response times
 * for duplicate requests with the same parameters.
 */

import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import type { TripBuilderData } from "@/types/trip";
import type { Trip } from "@/types/tripDomain";
import type { Itinerary } from "@/types/itinerary";

/** Cache TTL: 24 hours in seconds */
const CACHE_TTL_SECONDS = 24 * 60 * 60;

/** Redis key prefix for itinerary cache */
const CACHE_KEY_PREFIX = "@koku-travel/itinerary";

/** Cached itinerary result */
type CachedItineraryResult = {
  trip: Trip;
  itinerary: Itinerary;
  cachedAt: string;
};

/** Redis client (initialized lazily) */
let redisClient: Redis | null = null;
let redisInitialized = false;
let redisAvailable = false;

/**
 * Initialize Redis client for caching
 */
function initializeRedis(): void {
  if (redisInitialized) {
    return;
  }
  redisInitialized = true;

  const redisUrl = env.upstashRedisRestUrl;
  const redisToken = env.upstashRedisRestToken;

  if (redisUrl && redisToken) {
    try {
      redisClient = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      redisAvailable = true;
      logger.info("Redis itinerary cache initialized");
    } catch (error) {
      logger.warn("Failed to initialize Redis for itinerary cache", {
        error: error instanceof Error ? error.message : String(error),
      });
      redisAvailable = false;
    }
  } else {
    logger.debug("Redis not configured for itinerary cache, caching disabled");
    redisAvailable = false;
  }
}

/**
 * Generates a deterministic cache key from builder data
 *
 * Creates a SHA256 hash of normalized builder data to ensure
 * identical inputs produce identical cache keys.
 *
 * @param builderData - Trip builder data to generate key from
 * @returns Cache key string
 */
export function generateCacheKey(builderData: TripBuilderData): string {
  // Normalize the builder data by sorting keys and removing undefined values
  const normalized = normalizeBuilderData(builderData);
  const jsonString = JSON.stringify(normalized);

  // Simple hash function for cache key
  let hash = 0;
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to hex and make positive
  const hashHex = Math.abs(hash).toString(16).padStart(8, "0");
  return `${CACHE_KEY_PREFIX}:${hashHex}`;
}

/**
 * Normalizes builder data for consistent cache key generation
 */
function normalizeBuilderData(data: TripBuilderData): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  // Only include fields that affect itinerary generation
  if (data.duration !== undefined) normalized.duration = data.duration;
  if (data.dates) {
    normalized.dates = {
      start: data.dates.start,
      end: data.dates.end,
    };
  }
  if (data.regions && data.regions.length > 0) {
    normalized.regions = [...data.regions].sort();
  }
  if (data.cities && data.cities.length > 0) {
    normalized.cities = [...data.cities].sort();
  }
  if (data.interests && data.interests.length > 0) {
    normalized.interests = [...data.interests].sort();
  }
  if (data.style) normalized.style = data.style;
  if (data.budget) normalized.budget = data.budget;

  // Include accessibility preferences if specified
  if (data.accessibility) {
    normalized.accessibility = data.accessibility;
  }

  // Include traveler profile if it affects generation
  if (data.travelerProfile) {
    normalized.travelerProfile = {
      interests: data.travelerProfile.interests ? [...data.travelerProfile.interests].sort() : undefined,
      budget: data.travelerProfile.budget,
      mobility: data.travelerProfile.mobility,
    };
  }

  return normalized;
}

/**
 * Retrieves a cached itinerary from Redis
 *
 * @param builderData - Trip builder data to look up
 * @returns Cached result or null if not found
 */
export async function getCachedItinerary(
  builderData: TripBuilderData,
): Promise<{ trip: Trip; itinerary: Itinerary } | null> {
  initializeRedis();

  if (!redisAvailable || !redisClient) {
    return null;
  }

  const cacheKey = generateCacheKey(builderData);

  try {
    const cached = await redisClient.get<CachedItineraryResult>(cacheKey);

    if (cached) {
      logger.debug("Itinerary cache hit", { cacheKey });
      return {
        trip: cached.trip,
        itinerary: cached.itinerary,
      };
    }

    logger.debug("Itinerary cache miss", { cacheKey });
    return null;
  } catch (error) {
    logger.warn("Failed to get cached itinerary", {
      error: error instanceof Error ? error.message : String(error),
      cacheKey,
    });
    return null;
  }
}

/**
 * Stores an itinerary in Redis cache
 *
 * @param builderData - Trip builder data used to generate the itinerary
 * @param trip - Generated trip object
 * @param itinerary - Generated itinerary object
 */
export async function cacheItinerary(
  builderData: TripBuilderData,
  trip: Trip,
  itinerary: Itinerary,
): Promise<void> {
  initializeRedis();

  if (!redisAvailable || !redisClient) {
    return;
  }

  const cacheKey = generateCacheKey(builderData);

  try {
    const cacheValue: CachedItineraryResult = {
      trip,
      itinerary,
      cachedAt: new Date().toISOString(),
    };

    await redisClient.set(cacheKey, cacheValue, {
      ex: CACHE_TTL_SECONDS,
    });

    logger.debug("Itinerary cached successfully", {
      cacheKey,
      ttlSeconds: CACHE_TTL_SECONDS,
    });
  } catch (error) {
    logger.warn("Failed to cache itinerary", {
      error: error instanceof Error ? error.message : String(error),
      cacheKey,
    });
  }
}

/**
 * Invalidates a cached itinerary
 *
 * @param builderData - Trip builder data to invalidate
 */
export async function invalidateCachedItinerary(
  builderData: TripBuilderData,
): Promise<void> {
  initializeRedis();

  if (!redisAvailable || !redisClient) {
    return;
  }

  const cacheKey = generateCacheKey(builderData);

  try {
    await redisClient.del(cacheKey);
    logger.debug("Itinerary cache invalidated", { cacheKey });
  } catch (error) {
    logger.warn("Failed to invalidate cached itinerary", {
      error: error instanceof Error ? error.message : String(error),
      cacheKey,
    });
  }
}

/**
 * Checks if Redis caching is available
 */
export function isItineraryCacheAvailable(): boolean {
  initializeRedis();
  return redisAvailable;
}
