/**
 * Itinerary caching with Redis
 *
 * Caches generated itineraries to reduce AI/LLM costs and improve response times
 * for duplicate requests with the same parameters.
 */

import crypto from "crypto";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { env } from "@/lib/env";
import type { TripBuilderData } from "@/types/trip";
import type { Trip } from "@/types/tripDomain";
import type { Itinerary } from "@/types/itinerary";
import type { GeneratedGuide, GeneratedBriefings } from "@/types/llmConstraints";
import type { CulturalBriefing } from "@/types/culturalBriefing";

/** Cache TTL: 6 hours in seconds (reduced from 24h for data freshness after tip/location updates) */
const CACHE_TTL_SECONDS = 6 * 60 * 60;

/** Redis key prefix for itinerary cache */
const CACHE_KEY_PREFIX = "@koku-travel/itinerary";

/** Cached itinerary result */
type CachedItineraryResult = {
  trip: Trip;
  itinerary: Itinerary;
  dayIntros?: Record<string, string>;
  guideProse?: GeneratedGuide;
  dailyBriefings?: GeneratedBriefings;
  culturalBriefing?: CulturalBriefing;
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
        error: getErrorMessage(error),
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
 * identical inputs produce identical cache keys with negligible
 * collision probability.
 *
 * @param builderData - Trip builder data to generate key from
 * @returns Cache key string
 */
export function generateCacheKey(builderData: TripBuilderData): string {
  // Normalize the builder data by sorting keys and removing undefined values
  const normalized = normalizeBuilderData(builderData);
  const jsonString = JSON.stringify(normalized);

  // Use crypto SHA-256 for collision-resistant hashing
  const hash = crypto.createHash("sha256").update(jsonString).digest("hex").slice(0, 16);
  return `${CACHE_KEY_PREFIX}:${hash}`;
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
    // When the user manually ordered cities, preserve that order in the cache key.
    // Otherwise sort for canonical key generation.
    normalized.cities = data.customCityOrder ? [...data.cities] : [...data.cities].sort();
    if (data.customCityOrder) normalized.customCityOrder = true;
  }
  if (data.vibes && data.vibes.length > 0) {
    normalized.vibes = [...data.vibes].sort();
  }
  if (data.style) normalized.style = data.style;
  if (data.budget) normalized.budget = data.budget;

  // Entry point affects city sequencing and day 1 start location
  if (data.entryPoint) {
    normalized.entryPoint = {
      name: data.entryPoint.name,
      coordinates: data.entryPoint.coordinates,
    };
  }

  // Exit point affects city sequencing (last day end location)
  if (data.exitPoint) {
    normalized.exitPoint = {
      name: data.exitPoint.name,
      coordinates: data.exitPoint.coordinates,
    };
  }
  if (data.sameAsEntry !== undefined) {
    normalized.sameAsEntry = data.sameAsEntry;
  }

  // Flight times affect Day 1 / last day bounds
  if (data.arrivalTime) normalized.arrivalTime = data.arrivalTime;
  if (data.departureTime) normalized.departureTime = data.departureTime;

  // Group affects scoring (family-friendly, group size, children ages)
  if (data.group) {
    normalized.group = {
      type: data.group.type,
      size: data.group.size,
      childrenAges: data.group.childrenAges ? [...data.group.childrenAges].sort() : undefined,
    };
  }

  // Accommodation style affects day end times and ryokan bonuses
  if (data.accommodationStyle) normalized.accommodationStyle = data.accommodationStyle;

  // Include accessibility preferences if specified (including notes for LLM intent)
  if (data.accessibility) {
    normalized.accessibility = {
      mobility: data.accessibility.mobility,
      dietary: data.accessibility.dietary,
      dietaryOther: data.accessibility.dietaryOther,
      notes: data.accessibility.notes?.trim() || undefined,
    };
  }

  // Per-city day allocation overrides (parallel array — order matches cities which is already in the key)
  if (data.cityDays) {
    normalized.cityDays = [...data.cityDays];
  }

  // Pre-generation accommodations affect routing (start/end points)
  if (data.accommodations) {
    const sorted = Object.keys(data.accommodations).sort();
    const accomNormalized: Record<string, { name: string; coordinates: { lat: number; lng: number } }> = {};
    for (const key of sorted) {
      const a = data.accommodations[key];
      if (a) {
        accomNormalized[key] = { name: a.name, coordinates: a.coordinates };
      }
    }
    if (Object.keys(accomNormalized).length > 0) {
      normalized.accommodations = accomNormalized;
    }
  }

  // Include traveler profile if it affects generation
  if (data.travelerProfile) {
    normalized.travelerProfile = {
      interests: data.travelerProfile.interests ? [...data.travelerProfile.interests].sort() : undefined,
      budget: data.travelerProfile.budget,
      mobility: data.travelerProfile.mobility,
    };
  }

  // First time visitor affects pro tips and guidance
  if (data.isFirstTimeVisitor !== undefined) normalized.isFirstTimeVisitor = data.isFirstTimeVisitor;

  // Weather preferences affect indoor/outdoor scoring
  if (data.weatherPreferences) {
    normalized.weatherPreferences = {
      preferIndoorOnRain: data.weatherPreferences.preferIndoorOnRain,
      minTemperature: data.weatherPreferences.minTemperature,
      maxTemperature: data.weatherPreferences.maxTemperature,
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
): Promise<{ trip: Trip; itinerary: Itinerary; dayIntros?: Record<string, string>; guideProse?: GeneratedGuide; dailyBriefings?: GeneratedBriefings; culturalBriefing?: CulturalBriefing } | null> {
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
        dayIntros: cached.dayIntros,
        guideProse: cached.guideProse,
        dailyBriefings: cached.dailyBriefings,
        culturalBriefing: cached.culturalBriefing,
      };
    }

    logger.debug("Itinerary cache miss", { cacheKey });
    return null;
  } catch (error) {
    logger.warn("Failed to get cached itinerary", {
      error: getErrorMessage(error),
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
  dayIntros?: Record<string, string>,
  guideProse?: GeneratedGuide,
  dailyBriefings?: GeneratedBriefings,
  culturalBriefing?: CulturalBriefing,
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
      dayIntros,
      guideProse,
      dailyBriefings,
      culturalBriefing,
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
      error: getErrorMessage(error),
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
      error: getErrorMessage(error),
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

/**
 * Returns the shared Redis client (or null if unavailable).
 * Used by other modules that need Redis caching (e.g., LLM result caching).
 */
export function getRedisClient(): Redis | null {
  initializeRedis();
  return redisAvailable ? redisClient : null;
}
