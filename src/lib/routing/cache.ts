import type { RoutingRequest, RoutingResult } from "./types";
import { LRUCache } from "@/lib/utils/lruCache";

type CacheKey = string;

/**
 * Cache entry with expiration timestamp
 */
type CacheEntry = RoutingResult & {
  cachedAt: number;
};

/**
 * Maximum number of cached routes (prevents unbounded memory growth)
 */
const MAX_CACHE_SIZE = 1000;

/**
 * Default TTL for cached routes: 1 hour
 * Routes can become stale due to traffic conditions, so we don't cache too long
 */
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * LRU Cache for routing results
 * Automatically evicts least recently used entries when size limit is reached
 * Also checks TTL expiration on access
 */
const cache = new LRUCache<CacheKey, CacheEntry>({
  maxSize: MAX_CACHE_SIZE,
  onEvict: (key, value) => {
    // Optional: log evictions in development for debugging
    if (process.env.NODE_ENV === "development") {
      console.debug(`[Routing Cache] Evicted entry: ${key}`);
    }
  },
});

const serializeNumber = (value: number) => value.toFixed(6);

function buildCacheKey(request: RoutingRequest): CacheKey {
  const parts = [
    request.mode,
    serializeNumber(request.origin.lat),
    serializeNumber(request.origin.lng),
    serializeNumber(request.destination.lat),
    serializeNumber(request.destination.lng),
  ];

  if (request.departureTime) {
    parts.push(`dep:${request.departureTime}`);
  }
  if (request.arrivalTime) {
    parts.push(`arr:${request.arrivalTime}`);
  }
  if (request.timezone) {
    parts.push(`tz:${request.timezone}`);
  }

  return parts.join("|");
}

/**
 * Checks if a cache entry has expired based on TTL or explicit expiration
 */
function isExpired(entry: CacheEntry, ttlMs: number = DEFAULT_TTL_MS): boolean {
  const now = Date.now();
  
  // Check explicit expiration if present
  if (entry.expiresAt) {
    const expiresAtTime = typeof entry.expiresAt === "string" 
      ? new Date(entry.expiresAt).getTime()
      : entry.expiresAt;
    if (now > expiresAtTime) {
      return true;
    }
  }
  
  // Check TTL expiration
  const age = now - entry.cachedAt;
  if (age > ttlMs) {
    return true;
  }
  
  return false;
}

/**
 * Gets a cached route if available and not expired
 * 
 * @param request - Routing request
 * @param ttlMs - Optional TTL override (default: 1 hour)
 * @returns Cached route result or undefined if not found/expired
 */
export function getCachedRoute(
  request: RoutingRequest,
  ttlMs: number = DEFAULT_TTL_MS,
): RoutingResult | undefined {
  const key = buildCacheKey(request);
  const cached = cache.get(key);
  
  if (!cached) {
    return undefined;
  }
  
  // Check if expired
  if (isExpired(cached, ttlMs)) {
    cache.delete(key);
    return undefined;
  }
  
  // Return cached result (without cachedAt timestamp)
  const { cachedAt, ...result } = cached;
  return result;
}

/**
 * Caches a routing result
 * 
 * @param request - Routing request
 * @param result - Routing result to cache
 */
export function setCachedRoute(request: RoutingRequest, result: RoutingResult): void {
  const key = buildCacheKey(request);
  const entry: CacheEntry = {
    ...result,
    cachedAt: Date.now(),
  };
  cache.set(key, entry);
}

/**
 * Clears all cached routes
 */
export function clearRoutingCache(): void {
  cache.clear();
}

/**
 * Gets the current cache size
 */
export function getCacheSize(): number {
  return cache.size;
}
