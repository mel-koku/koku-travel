import { env } from "@/lib/env";
import { requestRoute } from "@/lib/routing";
import type { RoutingRequest, RoutingResult } from "@/lib/routing/types";

/**
 * Mapbox service wrapper
 * Provides a clean interface for Mapbox-related operations
 */
export class MapboxService {
  /**
   * Get Mapbox access token (read lazily to avoid module init order issues)
   */
  getAccessToken(): string | undefined {
    // Use public token for client-side, server token for server-side
    return env.mapboxAccessToken || env.routingMapboxAccessToken;
  }

  /**
   * Check if Mapbox is enabled
   */
  isEnabled(): boolean {
    return Boolean(this.getAccessToken());
  }

  /**
   * Get routing between two points
   * Uses the routing provider system which includes Mapbox support
   */
  async getRoute(request: RoutingRequest): Promise<RoutingResult> {
    if (!this.isEnabled()) {
      throw new Error("Mapbox is not enabled. Set ROUTING_MAPBOX_ACCESS_TOKEN environment variable.");
    }

    return requestRoute(request);
  }
}

/**
 * Singleton instance
 */
export const mapboxService = new MapboxService();

