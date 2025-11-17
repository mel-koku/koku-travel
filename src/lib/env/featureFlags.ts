import { env } from "@/lib/env";

/**
 * Feature flags for cost control
 * These flags allow disabling expensive features in development or when cost control is needed
 */
export const featureFlags = {
  /**
   * Enable Google Places API calls
   * Set to false to disable all Google Places API usage (uses cached/mock data only)
   */
  get enableGooglePlaces(): boolean {
    return process.env.ENABLE_GOOGLE_PLACES !== "false";
  },

  /**
   * Enable Mapbox routing
   * Set to false to disable Mapbox routing (falls back to heuristics)
   */
  get enableMapbox(): boolean {
    return process.env.ENABLE_MAPBOX !== "false" && Boolean(env.routingMapboxAccessToken);
  },

  /**
   * Cheap mode - uses only cached data and heuristics
   * No external API calls when enabled
   */
  get cheapMode(): boolean {
    return process.env.CHEAP_MODE === "true";
  },
} as const;

