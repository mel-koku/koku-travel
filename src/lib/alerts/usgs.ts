import type { CityId } from "@/types/trip";

export const USGS_FEED_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson";

export type LatLon = { lat: number; lon: number };

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance in kilometers between two points on Earth.
 * Standard haversine formula; accurate to ~0.5% which is ample for a
 * 150 km proximity filter.
 */
export function haversineKm(a: LatLon, b: LatLon): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Bucketed relative-time string for the banner body.
 *
 * Buckets:
 *   < 90 minutes  → "less than an hour ago"
 *   otherwise     → "about N hours ago" where N = floor((now - eventMs) / 1h)
 *
 * No "yesterday" / "just now" / absolute-date branches — keeps copy tight
 * and avoids i18n surface in Phase 1. Computed on the server at response
 * time so the client doesn't need to recompute.
 */
export function computeRelativeTime(eventMs: number, nowMs: number): string {
  const deltaMs = Math.max(0, nowMs - eventMs);
  const deltaMin = Math.floor(deltaMs / 60_000);
  if (deltaMin < 90) return "less than an hour ago";
  const hours = Math.max(1, Math.floor(deltaMin / 60));
  return `about ${hours} hours ago`;
}

export type USGSQuake = {
  id: string;
  properties: {
    mag: number;
    time: number;
    place: string;
  };
  geometry: {
    type: "Point";
    coordinates: [lon: number, lat: number, depth_km: number];
  };
};

export type TripCity = {
  id: CityId;
  name: string;
  lat: number;
  lon: number;
};

export type TripContext = {
  cities: TripCity[];
  startDate: Date;
  endDate: Date;
};

export type EarthquakeAlert = {
  id: string;
  magnitude: number;
  nearestCity: string;
  distanceKm: number;
  occurredAt: string;
  relativeTime: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_TRIP_START_DAYS_M6_PLUS = 14;
const MAX_TRIP_START_DAYS_M5 = 7;
const MAX_QUAKE_AGE_MS = 48 * 60 * 60 * 1000;
const MAX_DISTANCE_KM = 150;
const MIN_MAGNITUDE = 5.0;
const HIGH_MAGNITUDE_THRESHOLD = 6.0;

function tripPassesPreGate(trip: TripContext, now: Date): boolean {
  if (now > trip.endDate) return false;
  if (now >= trip.startDate && now <= trip.endDate) return true; // active
  const daysUntilStart = Math.ceil((trip.startDate.getTime() - now.getTime()) / MS_PER_DAY);
  return daysUntilStart <= MAX_TRIP_START_DAYS_M6_PLUS;
}

function quakeIsValid(q: unknown): q is USGSQuake {
  if (!q || typeof q !== "object") return false;
  const obj = q as Record<string, unknown>;
  if (typeof obj.id !== "string") return false;
  const props = obj.properties as Record<string, unknown> | undefined;
  if (!props || typeof props.mag !== "number" || typeof props.time !== "number") return false;
  const geom = obj.geometry as Record<string, unknown> | undefined;
  if (!geom || geom.type !== "Point") return false;
  const coords = geom.coordinates as unknown[] | undefined;
  if (!Array.isArray(coords) || coords.length < 2) return false;
  if (typeof coords[0] !== "number" || typeof coords[1] !== "number") return false;
  return true;
}

function quakePassesGates(q: USGSQuake, trip: TripContext, now: Date): { distanceKm: number; nearestCity: TripCity } | null {
  if (q.properties.mag < MIN_MAGNITUDE) return null;
  if (now.getTime() - q.properties.time > MAX_QUAKE_AGE_MS) return null;

  // Magnitude-dependent trip-start window
  const tripActive = now >= trip.startDate && now <= trip.endDate;
  if (!tripActive) {
    const daysUntilStart = Math.ceil((trip.startDate.getTime() - now.getTime()) / MS_PER_DAY);
    const maxDays = q.properties.mag >= HIGH_MAGNITUDE_THRESHOLD
      ? MAX_TRIP_START_DAYS_M6_PLUS
      : MAX_TRIP_START_DAYS_M5;
    if (daysUntilStart > maxDays) return null;
  }

  if (trip.cities.length === 0) return null;

  const [qLon, qLat] = q.geometry.coordinates;
  let nearestCity: TripCity | null = null;
  let nearestDistKm = Infinity;
  for (const c of trip.cities) {
    const d = haversineKm({ lat: qLat, lon: qLon }, { lat: c.lat, lon: c.lon });
    if (d < nearestDistKm) {
      nearestDistKm = d;
      nearestCity = c;
    }
  }
  if (!nearestCity) return null;
  if (nearestDistKm > MAX_DISTANCE_KM) return null;
  return { distanceKm: nearestDistKm, nearestCity };
}

/**
 * Filter a USGS quake feed to at most one alert relevant to a trip.
 *
 * Gates (short-circuit on first fail):
 *   1. Trip-date pre-gate: trip has not ended; if not active, starts within 14 days.
 *   2. Magnitude >= 5.0
 *   3. Magnitude-dependent trip-start window: M>=6 allows 14 days, M<6 allows 7 days.
 *   4. Age <= 48h
 *   5. Min distance to any trip city <= 150 km
 *
 * Winner selection: most recent by time; on ties, larger magnitude.
 */
export function filterRelevantQuake(
  quakes: unknown[],
  trip: TripContext,
  now: Date,
): EarthquakeAlert | null {
  if (!tripPassesPreGate(trip, now)) return null;

  let best: { quake: USGSQuake; distanceKm: number; nearestCity: TripCity } | null = null;
  for (const raw of quakes) {
    if (!quakeIsValid(raw)) continue;
    const passed = quakePassesGates(raw, trip, now);
    if (!passed) continue;
    if (
      !best ||
      raw.properties.time > best.quake.properties.time ||
      (raw.properties.time === best.quake.properties.time &&
        raw.properties.mag > best.quake.properties.mag)
    ) {
      best = { quake: raw, ...passed };
    }
  }
  if (!best) return null;

  return {
    id: best.quake.id,
    magnitude: Math.round(best.quake.properties.mag * 10) / 10,
    nearestCity: best.nearestCity.name,
    distanceKm: Math.round(best.distanceKm),
    occurredAt: new Date(best.quake.properties.time).toISOString(),
    relativeTime: computeRelativeTime(best.quake.properties.time, now.getTime()),
  };
}
