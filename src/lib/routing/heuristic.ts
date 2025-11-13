import type { RoutingRequest, RoutingResult } from "./types";

const AVERAGE_SPEED_KMH: Record<string, number> = {
  walk: 4.5,
  bicycle: 15,
  bus: 20,
  tram: 20,
  subway: 32,
  train: 45,
  transit: 28,
  car: 35,
  taxi: 35,
  rideshare: 35,
  ferry: 25,
};

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function haversineDistance(origin: RoutingRequest["origin"], destination: RoutingRequest["destination"]) {
  const earthRadiusMeters = 6371e3;
  const dLat = toRadians(destination.lat - origin.lat);
  const dLng = toRadians(destination.lng - origin.lng);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

export function estimateHeuristicRoute(request: RoutingRequest): RoutingResult {
  const distanceMeters = haversineDistance(request.origin, request.destination);
  const speed = AVERAGE_SPEED_KMH[request.mode] ?? 25;
  const durationSeconds = Math.round((distanceMeters / 1000 / speed) * 3600);

  return {
    provider: "mock",
    mode: request.mode,
    distanceMeters,
    durationSeconds,
    legs: [
      {
        mode: request.mode,
        distanceMeters,
        durationSeconds,
        summary: "Estimated direct route",
        geometry: [
          { lat: request.origin.lat, lng: request.origin.lng },
          { lat: request.destination.lat, lng: request.destination.lng },
        ],
      },
    ],
    warnings: [
      "Using heuristic travel time estimate. Configure ROUTING_PROVIDER and API key for precise routing.",
    ],
    fetchedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    geometry: [
      { lat: request.origin.lat, lng: request.origin.lng },
      { lat: request.destination.lat, lng: request.destination.lng },
    ],
  };
}


