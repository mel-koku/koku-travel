import type { ItineraryTravelMode } from "@/types/itinerary";

export type RoutingProviderName = "mapbox" | "openrouteservice" | "google" | "mock";

/**
 * Standard routing modes expected by external routing APIs.
 * Internal ItineraryTravelMode values are mapped to these.
 */
export type RoutingMode = "driving" | "walking" | "transit" | "cycling";

/**
 * Maps internal ItineraryTravelMode to routing API-compatible mode.
 */
export function toRoutingMode(mode: ItineraryTravelMode): RoutingMode {
  switch (mode) {
    case "walk":
      return "walking";
    case "car":
    case "taxi":
    case "rideshare":
      return "driving";
    case "bicycle":
      return "cycling";
    case "train":
    case "subway":
    case "bus":
    case "tram":
    case "ferry":
    case "transit":
      return "transit";
    default:
      // Fallback for any unknown modes
      return "walking";
  }
}

/**
 * Maps routing API mode back to internal ItineraryTravelMode.
 * Used when displaying route results in the UI.
 */
export function toItineraryMode(mode: TravelMode): ItineraryTravelMode {
  switch (mode) {
    case "walking":
      return "walk";
    case "driving":
      return "car";
    case "cycling":
      return "bicycle";
    case "transit":
      return "transit";
    default:
      // Already an ItineraryTravelMode, return as-is
      return mode as ItineraryTravelMode;
  }
}

/**
 * Set of valid routing modes for API validation.
 */
export const VALID_ROUTING_MODES = new Set<RoutingMode>(["driving", "walking", "transit", "cycling"]);

/**
 * All travel modes accepted by the routing system.
 * Includes both internal modes and standard routing modes.
 */
export type TravelMode = ItineraryTravelMode | RoutingMode;

export type Coordinate = {
  lat: number;
  lng: number;
};

export type RoutingLegStep = {
  instruction?: string;
  distanceMeters?: number;
  durationSeconds?: number;
  geometry?: Coordinate[];
};

export type RoutingLeg = {
  mode: TravelMode;
  distanceMeters: number;
  durationSeconds: number;
  summary?: string;
  steps?: RoutingLegStep[];
  geometry?: Coordinate[];
};

export type RoutingResult = {
  provider: RoutingProviderName;
  mode: TravelMode;
  durationSeconds: number;
  distanceMeters: number;
  legs: RoutingLeg[];
  warnings?: string[];
  fetchedAt: string;
  expiresAt?: string;
  geometry?: Coordinate[];
};

export type RoutingRequest = {
  origin: Coordinate;
  destination: Coordinate;
  mode: TravelMode;
  /**
   * Optional desired departure time (ISO string or HH:MM local).
   */
  departureTime?: string;
  /**
   * Optional desired arrival time (ISO string or HH:MM local).
   */
  arrivalTime?: string;
  /**
   * Optional timezone used to interpret HH:MM times.
   */
  timezone?: string;
};

export type RoutingFetchFn = (request: RoutingRequest) => Promise<RoutingResult>;


