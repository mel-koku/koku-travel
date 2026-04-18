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
