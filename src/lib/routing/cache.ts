import type { RoutingRequest, RoutingResult } from "./types";

type CacheKey = string;

const cache = new Map<CacheKey, RoutingResult>();

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

export function getCachedRoute(request: RoutingRequest): RoutingResult | undefined {
  const key = buildCacheKey(request);
  const cached = cache.get(key);
  if (!cached) {
    return undefined;
  }
  if (cached.expiresAt && Date.now() > new Date(cached.expiresAt).getTime()) {
    cache.delete(key);
    return undefined;
  }
  return cached;
}

export function setCachedRoute(request: RoutingRequest, result: RoutingResult) {
  const key = buildCacheKey(request);
  cache.set(key, result);
}

export function clearRoutingCache() {
  cache.clear();
}


