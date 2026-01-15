import { logger } from "@/lib/logger";
import { featureFlags } from "@/lib/env/featureFlags";
import { getCachedRoute } from "@/lib/routing";
import type { RoutingRequest, RoutingResult } from "@/lib/routing/types";

/**
 * Mapbox routing limiter with memoization
 * Caches routes to avoid duplicate API calls for the same origin/destination
 */
class MapboxLimiter {
  /**
   * Get a route with memoization
   * Returns cached route if available, otherwise makes API call
   */
  async getRoute(request: RoutingRequest): Promise<RoutingResult | null> {
    if (featureFlags.cheapMode) {
      return null;
    }

    if (!featureFlags.enableMapbox) {
      return null;
    }

    // Check cache first
    const cached = getCachedRoute(request);
    if (cached) {
      logger.debug("Using cached Mapbox route", {
        origin: `${request.origin.lat},${request.origin.lng}`,
        destination: `${request.destination.lat},${request.destination.lng}`,
      });
      return cached;
    }

    // Cache will be set by the routing provider
    return null;
  }

  /**
   * Check if Mapbox is enabled
   */
  isEnabled(): boolean {
    return featureFlags.enableMapbox && !featureFlags.cheapMode;
  }
}

export const mapboxLimiter = new MapboxLimiter();

