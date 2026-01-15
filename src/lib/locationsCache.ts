import { Location } from "@/types/location";
import { getLocal, setLocal } from "./storageHelpers";
import { logger } from "./logger";

const CACHE_KEY = "koku_locations_cache";
const CACHE_VERSION = "1"; // Increment when cache structure changes

// Cache expires after 1 hour (3600000ms)
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;

// Consider cache stale after 5 minutes (300000ms) - refresh in background
const CACHE_STALE_AGE_MS = 5 * 60 * 1000;

type CachedLocations = {
  version: string;
  locations: Location[];
  timestamp: number;
};

/**
 * Gets cached locations from localStorage if available and not expired.
 * Returns null if cache doesn't exist or is expired.
 */
export function getCachedLocations(): Location[] | null {
  try {
    const cached = getLocal<CachedLocations>(CACHE_KEY);
    
    if (!cached) {
      return null;
    }

    // Check cache version - invalidate if version mismatch
    if (cached.version !== CACHE_VERSION) {
      logger.info("Locations cache version mismatch, invalidating cache");
      return null;
    }

    const age = Date.now() - cached.timestamp;

    // If cache is too old, return null (expired)
    if (age > CACHE_MAX_AGE_MS) {
      logger.info("Locations cache expired, will refetch");
      return null;
    }

    return cached.locations;
  } catch (error) {
    logger.warn("Failed to read locations cache", { error });
    return null;
  }
}

/**
 * Gets cached locations even if stale (for stale-while-revalidate pattern).
 * Returns null only if cache doesn't exist or version mismatch.
 */
export function getCachedLocationsIncludingStale(): Location[] | null {
  try {
    const cached = getLocal<CachedLocations>(CACHE_KEY);
    
    if (!cached) {
      return null;
    }

    // Check cache version - invalidate if version mismatch
    if (cached.version !== CACHE_VERSION) {
      return null;
    }

    return cached.locations;
  } catch (error) {
    logger.warn("Failed to read locations cache (including stale)", { error });
    return null;
  }
}

/**
 * Checks if cached locations are stale (older than STALE_AGE but not expired).
 */
export function isCacheStale(): boolean {
  try {
    const cached = getLocal<CachedLocations>(CACHE_KEY);
    
    if (!cached || cached.version !== CACHE_VERSION) {
      return false;
    }

    const age = Date.now() - cached.timestamp;
    return age > CACHE_STALE_AGE_MS && age <= CACHE_MAX_AGE_MS;
  } catch {
    return false;
  }
}

/**
 * Saves locations to localStorage cache with current timestamp.
 */
export function setCachedLocations(locations: Location[]): void {
  try {
    const cache: CachedLocations = {
      version: CACHE_VERSION,
      locations,
      timestamp: Date.now(),
    };
    setLocal(CACHE_KEY, cache);
    logger.info("Locations cached successfully", { count: locations.length });
  } catch (error) {
    logger.warn("Failed to cache locations", { error });
  }
}

/**
 * Clears the locations cache.
 */
export function clearLocationsCache(): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CACHE_KEY);
      logger.info("Locations cache cleared");
    }
  } catch (error) {
    logger.warn("Failed to clear locations cache", { error });
  }
}
