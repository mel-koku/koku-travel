/**
 * In-memory location cache with request deduplication
 *
 * Prevents burst requests during fast navigation by:
 * 1. Caching fetched locations in memory
 * 2. Deduplicating concurrent requests for the same location
 */

import type { Location } from "@/types/location";
import { LOCATION_STALE_TIME } from "@/lib/constants/time";

/** Maximum cache entries before LRU eviction kicks in */
const MAX_CACHE_SIZE = 1000;

type CacheEntry = {
  location: Location;
  cachedAt: number;
};

/**
 * In-memory cache for location data.
 * Uses Map insertion order for LRU eviction: accessing an entry
 * deletes and re-inserts it, keeping recently-used entries at the end.
 */
const cache = new Map<string, CacheEntry>();

/**
 * Pending requests map for deduplication
 * If a request is in-flight, subsequent requests for the same ID
 * will wait for the original request instead of making new ones
 */
const pendingRequests = new Map<string, Promise<Location | null>>();

/**
 * Gets a location from the in-memory cache if available and not stale
 *
 * @param id - Location ID
 * @returns Cached location or null if not found/stale
 */
export function getCachedLocation(id: string): Location | null {
  const entry = cache.get(id);
  if (!entry) return null;

  const age = Date.now() - entry.cachedAt;
  if (age > LOCATION_STALE_TIME) {
    cache.delete(id);
    return null;
  }

  // Move to end of Map (most recently used) for LRU ordering
  cache.delete(id);
  cache.set(id, entry);

  return entry.location;
}

/**
 * Stores a location in the in-memory cache
 *
 * @param location - Location to cache
 */
export function setCachedLocation(location: Location): void {
  // If key already exists, delete first to update insertion order
  cache.delete(location.id);
  cache.set(location.id, {
    location,
    cachedAt: Date.now(),
  });
  evictIfNeeded();
}

/**
 * Stores multiple locations in the in-memory cache
 *
 * @param locations - Locations to cache
 */
export function setCachedLocations(locations: Location[]): void {
  const now = Date.now();
  for (const location of locations) {
    cache.delete(location.id);
    cache.set(location.id, {
      location,
      cachedAt: now,
    });
  }
  evictIfNeeded();
}

/**
 * Gets multiple locations from cache, returning found ones and missing IDs
 *
 * @param ids - Location IDs to look up
 * @returns Object with found locations and IDs not in cache
 */
export function getCachedLocations(ids: string[]): {
  found: Location[];
  missingIds: string[];
} {
  const found: Location[] = [];
  const missingIds: string[] = [];
  const now = Date.now();

  for (const id of ids) {
    const entry = cache.get(id);
    if (entry && now - entry.cachedAt <= LOCATION_STALE_TIME) {
      found.push(entry.location);
    } else {
      if (entry) cache.delete(id);
      missingIds.push(id);
    }
  }

  return { found, missingIds };
}

/**
 * Executes a fetch with request deduplication
 * If a request for the same ID is already in-flight, returns that promise
 *
 * @param id - Location ID
 * @param fetchFn - Function to fetch the location
 * @returns Promise resolving to the location or null
 */
export async function fetchWithDeduplication(
  id: string,
  fetchFn: () => Promise<Location | null>,
): Promise<Location | null> {
  // Check cache first
  const cached = getCachedLocation(id);
  if (cached) return cached;

  // Check if request is already in-flight
  const pending = pendingRequests.get(id);
  if (pending) return pending;

  // Create new request
  const request = fetchFn()
    .then((location) => {
      if (location) {
        setCachedLocation(location);
      }
      return location;
    })
    .finally(() => {
      pendingRequests.delete(id);
    });

  pendingRequests.set(id, request);
  return request;
}

/**
 * Executes a batch fetch with request deduplication
 * Only fetches IDs not already in cache or in-flight
 *
 * @param ids - Location IDs to fetch
 * @param batchFetchFn - Function to batch fetch locations
 * @returns Promise resolving to array of locations
 */
export async function batchFetchWithDeduplication(
  ids: string[],
  batchFetchFn: (ids: string[]) => Promise<Location[]>,
): Promise<Location[]> {
  // Get what's already in cache
  const { found, missingIds } = getCachedLocations(ids);

  if (missingIds.length === 0) {
    return found;
  }

  // Wait for any in-flight requests for missing IDs
  const pendingResults: Promise<Location | null>[] = [];
  const idsToFetch: string[] = [];

  for (const id of missingIds) {
    const pending = pendingRequests.get(id);
    if (pending) {
      pendingResults.push(pending);
    } else {
      idsToFetch.push(id);
    }
  }

  // Fetch remaining IDs
  let fetchedLocations: Location[] = [];
  if (idsToFetch.length > 0) {
    // Create a single pending promise for all IDs being fetched
    const batchPromise = batchFetchFn(idsToFetch);

    // Register pending for each ID
    const wrappedPromise = batchPromise.then((locations) => {
      setCachedLocations(locations);
      return locations;
    });

    for (const id of idsToFetch) {
      const idPromise = wrappedPromise.then(
        (locations) => locations.find((l) => l.id === id) ?? null,
      );
      pendingRequests.set(id, idPromise);
    }

    try {
      fetchedLocations = await wrappedPromise;
    } finally {
      for (const id of idsToFetch) {
        pendingRequests.delete(id);
      }
    }
  }

  // Collect pending results
  const pendingLocations = await Promise.all(pendingResults);
  const validPendingLocations = pendingLocations.filter(
    (l): l is Location => l !== null,
  );

  return [...found, ...fetchedLocations, ...validPendingLocations];
}

/**
 * Evicts least-recently-used entries when cache exceeds MAX_CACHE_SIZE.
 * Map iteration order = insertion order, so the first entries are oldest.
 */
function evictIfNeeded(): void {
  if (cache.size <= MAX_CACHE_SIZE) return;
  const excess = cache.size - MAX_CACHE_SIZE;
  let removed = 0;
  for (const key of cache.keys()) {
    if (removed >= excess) break;
    cache.delete(key);
    removed++;
  }
}

/**
 * Clears the in-memory cache
 */
export function clearLocationCache(): void {
  cache.clear();
}

/**
 * Gets the current cache size
 */
export function getLocationCacheSize(): number {
  return cache.size;
}
