import { env } from "@/lib/env";
import { requestRoute } from "@/lib/routing";
import type { RoutingRequest, RoutingResult } from "@/lib/routing/types";

/**
 * Mapbox service wrapper
 * Provides a clean interface for Mapbox-related operations
 */
export class MapboxService {
  private accessToken: string | undefined;

  constructor() {
    this.accessToken = env.routingMapboxAccessToken;
  }

  /**
   * Check if Mapbox is enabled
   */
  isEnabled(): boolean {
    return Boolean(this.accessToken);
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

  /**
   * Get Mapbox access token
   */
  getAccessToken(): string | undefined {
    return this.accessToken;
  }
}

/**
 * Singleton instance
 */
export const mapboxService = new MapboxService();

