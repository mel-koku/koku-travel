import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Location, LocationOperatingHours } from "@/types/location";
import { logger } from "@/lib/logger";
import { internalError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";

const NEARBY_COLUMNS = `
  id,
  name,
  region,
  city,
  prefecture,
  category,
  image,
  rating,
  review_count,
  estimated_duration,
  primary_photo_url,
  coordinates,
  google_primary_type,
  price_level,
  is_hidden_gem,
  name_japanese,
  nearest_station,
  cash_only,
  reservation_info,
  operating_hours,
  short_description
`.replace(/\s+/g, "");

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/**
 * GET /api/locations/nearby?lat=X&lng=Y&radius=1.5&category=restaurant&openNow=true&limit=20
 *
 * Returns locations near a point, optionally filtered to only those open now.
 * Sorted by: hidden gems first, then rating descending.
 */
export async function GET(request: NextRequest) {
  const context = createRequestContext(request);

  const rateLimitResponse = await checkRateLimit(request, {
    maxRequests: 100,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radiusKm = parseFloat(searchParams.get("radius") ?? "1.5");
  const category = searchParams.get("category");
  const openNow = searchParams.get("openNow") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return addRequestContextHeaders(
      NextResponse.json(
        { error: "lat and lng query parameters are required" },
        { status: 400 },
      ),
      context,
    );
  }

  try {
    const supabase = await createClient();

    // Bounding box for initial filter (cheaper than haversine for all rows)
    const latDelta = radiusKm / 111.0;
    const lngDelta = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180));

    let query = supabase
      .from("locations")
      .select(NEARBY_COLUMNS)
      .or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED")
      .gte("coordinates->lat", lat - latDelta)
      .lte("coordinates->lat", lat + latDelta)
      .gte("coordinates->lng", lng - lngDelta)
      .lte("coordinates->lng", lng + lngDelta);

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query.limit(200); // Fetch extra, then filter + sort client-side

    if (error) {
      logger.error("Nearby query failed", { error, requestId: context.requestId });
      return addRequestContextHeaders(
        internalError("Failed to fetch nearby locations", { error: error.message }, {
          requestId: context.requestId,
        }),
        context,
      );
    }

    const now = new Date();
    const currentDay = WEEKDAYS[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    type NearbyRow = {
      id: string;
      name: string;
      region: string;
      city: string;
      prefecture: string | null;
      category: string;
      image: string;
      rating: number | null;
      review_count: number | null;
      estimated_duration: string | null;
      primary_photo_url: string | null;
      coordinates: { lat: number; lng: number } | null;
      google_primary_type: string | null;
      price_level: number | null;
      is_hidden_gem: boolean | null;
      name_japanese: string | null;
      nearest_station: string | null;
      cash_only: boolean | null;
      reservation_info: "required" | "recommended" | null;
      operating_hours: LocationOperatingHours | null;
      short_description: string | null;
    };

    const rows = (data || []) as unknown as NearbyRow[];

    // Calculate distances + filter by actual haversine radius
    const withDistance = rows
      .map((row) => {
        if (!row.coordinates) return null;
        const dist = haversineKm(
          lat,
          lng,
          row.coordinates.lat,
          row.coordinates.lng,
        );
        if (dist > radiusKm) return null;
        return { row, distance: dist };
      })
      .filter(Boolean) as { row: NearbyRow; distance: number }[];

    // Filter by open now if requested
    const filtered = openNow
      ? withDistance.filter(({ row }) =>
          isCurrentlyOpen(row.operating_hours, currentDay as string, currentMinutes),
        )
      : withDistance;

    // Sort: hidden gems first, then rating desc, then distance asc
    filtered.sort((a, b) => {
      const gemA = a.row.is_hidden_gem ? 1 : 0;
      const gemB = b.row.is_hidden_gem ? 1 : 0;
      if (gemA !== gemB) return gemB - gemA;

      const ratingA = a.row.rating ?? 0;
      const ratingB = b.row.rating ?? 0;
      if (ratingA !== ratingB) return ratingB - ratingA;

      return a.distance - b.distance;
    });

    const locations: (Location & { distance: number })[] = filtered
      .slice(0, limit)
      .map(({ row, distance }) => ({
        id: row.id,
        name: row.name,
        region: row.region,
        city: row.city,
        prefecture: row.prefecture ?? undefined,
        category: row.category,
        image: row.primary_photo_url ? "" : row.image,
        estimatedDuration: row.estimated_duration ?? undefined,
        rating: row.rating ?? undefined,
        reviewCount: row.review_count ?? undefined,
        primaryPhotoUrl: row.primary_photo_url ?? undefined,
        googlePrimaryType: row.google_primary_type ?? undefined,
        priceLevel: row.price_level as Location["priceLevel"] ?? undefined,
        coordinates: row.coordinates ?? undefined,
        isHiddenGem: row.is_hidden_gem ?? undefined,
        nameJapanese: row.name_japanese ?? undefined,
        nearestStation: row.nearest_station ?? undefined,
        cashOnly: row.cash_only ?? undefined,
        reservationInfo: row.reservation_info ?? undefined,
        operatingHours: row.operating_hours ?? undefined,
        shortDescription: row.short_description ?? undefined,
        distance: Math.round(distance * 1000), // meters
      }));

    return addRequestContextHeaders(
      NextResponse.json(
        { data: locations, total: locations.length },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      ),
      context,
    );
  } catch (error) {
    logger.error(
      "Unexpected error in nearby endpoint",
      error instanceof Error ? error : new Error(String(error)),
      { requestId: context.requestId },
    );
    const message =
      error instanceof Error ? error.message : "Failed to load nearby locations.";
    return addRequestContextHeaders(
      internalError(message, undefined, { requestId: context.requestId }),
      context,
    );
  }
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isCurrentlyOpen(
  hours: LocationOperatingHours | null,
  currentDay: string,
  currentMinutes: number,
): boolean {
  // If no hours data, include it (benefit of the doubt)
  if (!hours || !hours.periods || hours.periods.length === 0) return true;

  const todayPeriod = hours.periods.find((p) => p.day === currentDay);
  if (!todayPeriod) return false;

  const open = parseTime(todayPeriod.open);
  const close = parseTime(todayPeriod.close);
  if (open === null || close === null) return true;

  const effectiveClose = todayPeriod.isOvernight ? close + 24 * 60 : close;
  return currentMinutes >= open && currentMinutes < effectiveClose;
}

function parseTime(timeStr: string): number | null {
  const parts = timeStr.split(":");
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}
