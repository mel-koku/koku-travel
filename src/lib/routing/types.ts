import type { ItineraryTravelMode } from "@/types/itinerary";

export type RoutingProviderName = "mapbox" | "openrouteservice" | "google" | "mock";

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
  mode: ItineraryTravelMode;
  distanceMeters: number;
  durationSeconds: number;
  summary?: string;
  steps?: RoutingLegStep[];
  geometry?: Coordinate[];
};

export type RoutingResult = {
  provider: RoutingProviderName;
  mode: ItineraryTravelMode;
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
  mode: ItineraryTravelMode;
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


