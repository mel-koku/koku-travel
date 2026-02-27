import type { RoutingRequest, RoutingResult, TravelMode } from "./types";
import { LRUCache } from "@/lib/utils/lruCache";
import { ROUTING_DRIVING_TTL, ROUTING_WALKING_TRANSIT_TTL } from "@/lib/constants/time";
import { logger } from "@/lib/logger";

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
 * Determines the appropriate TTL based on travel mode
 * Driving routes are traffic-dependent (1 hour TTL)
 * Walking/transit/cycling routes are static (6 hour TTL)
 */
function getTtlForMode(mode: TravelMode): number {
  // Driving modes are affected by real-time traffic
  if (mode === "driving" || mode === "car" || mode === "taxi" || mode === "rideshare") {
    return ROUTING_DRIVING_TTL;
  }
  // All other modes (walking, transit, cycling) have static routes
  return ROUTING_WALKING_TRANSIT_TTL;
}

/**
 * LRU Cache for routing results
 * Automatically evicts least recently used entries when size limit is reached
 * Also checks TTL expiration on access
 */
const cache = new LRUCache<CacheKey, CacheEntry>({
  maxSize: MAX_CACHE_SIZE,
  onEvict: (key, _value) => {
    if (process.env.NODE_ENV === "development") {
      logger.debug(`[Routing Cache] Evicted entry: ${key}`);
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
function isExpired(entry: CacheEntry, ttlMs: number): boolean {
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
 * TTL is automatically determined based on travel mode:
 * - Driving: 1 hour (traffic-dependent)
 * - Walking/Transit/Cycling: 6 hours (static routes)
 *
 * @param request - Routing request
 * @returns Cached route result or undefined if not found/expired
 */
export function getCachedRoute(request: RoutingRequest): RoutingResult | undefined {
  const key = buildCacheKey(request);
  const cached = cache.get(key);

  if (!cached) {
    return undefined;
  }

  // Use mode-specific TTL
  const ttlMs = getTtlForMode(request.mode);

  // Check if expired
  if (isExpired(cached, ttlMs)) {
    cache.delete(key);
    return undefined;
  }

  // Return cached result (without cachedAt timestamp)
  const { cachedAt: _cachedAt, ...result } = cached;
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
